import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { logInteractionServer } from '@/lib/log-interaction-server'

export const dynamic = 'force-dynamic'

/**
 * Fire-and-forget notification trigger.
 * Calls the notification send endpoint for a given event without blocking the response.
 */
function fireNotification(event_type, context = {}) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    fetch(`${baseUrl}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type, ...context }),
    }).catch(err => console.error('[fireNotification] Error:', err.message));
}

// GET - Fetch all jobs or filter by query params
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const customerId = searchParams.get('customer_id')
        const technicianId = searchParams.get('technician_id')

        let query = supabase
            .from('jobs')
            .select(`
                *,
                customer:accounts(*),
                technician:technicians(*)
            `)
            .order('created_at', { ascending: false })

        if (status && status !== 'all') {
            query = query.eq('status', status)
        }
        if (customerId) {
            query = query.eq('customer_id', customerId)
        }
        if (technicianId) {
            query = query.eq('assigned_to', technicianId)
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// Generate Job Number like JOB-1001, JOB-1002
async function generateJobNumber() {
    // Find the highest existing JOB- number
    const { data: latestJobs } = await supabase
        .from('jobs')
        .select('job_number')
        .not('job_number', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
        
    let nextNum = 1001; // Start from 1001 if none exist
    if (latestJobs && latestJobs.length > 0) {
        const nums = latestJobs
            .map(j => {
                const match = j.job_number?.match(/^JOB-(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            })
            .filter(n => n > 0);
        
        if (nums.length > 0) {
            nextNum = Math.max(...nums) + 1;
        }
    }
    return `JOB-${nextNum}`;
}

// POST - Create new job
export async function POST(request) {
    try {
        const body = await request.json();

        // Auto-generate job number if not provided
        if (!body.job_number) {
            body.job_number = await generateJobNumber();
        }

        const { data, error } = await supabase
            .from('jobs')
            .insert([body])
            .select()
            .single()

        if (error) throw error

        // Create initial interaction
        await supabase.from('job_interactions').insert([{
            job_id: data.id,
            type: 'created',
            message: `Job created by ${body.created_by || 'Admin'}`,
            user_name: body.created_by || 'Admin'
        }])

        // Log to global interactions
        logInteractionServer({
            type: 'job-created-admin',
            category: 'job',
            jobId: String(data.id),
            customerId: body.customer_id ? String(body.customer_id) : null,
            customerName: data.customer_name || null,
            performedByName: body.created_by || 'Admin',
            description: `Job ${data.job_number || data.id} created by admin — ${data.category || ''} ${data.subcategory || ''}`.trim(),
            source: 'Admin',
        });

        // Fire notification trigger (fire-and-forget)
        fireNotification('job_created_admin', {
            job_id: String(data.id),
            customer_id: body.customer_id ? String(body.customer_id) : undefined,
            customer_name: data.customer_name || undefined,
        });

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PUT - Update job
export async function PUT(request) {
    try {
        const body = await request.json()
        const { id, _changeLog, ...updates } = body  // _changeLog is meta from the UI, not stored in DB

        // Fetch current state for diffing ALL changed fields server-side
        const { data: existing } = await supabase
            .from('jobs')
            .select('technician_id, technician_name, status, customer_id, customer_name, job_number, priority, scheduled_date, scheduled_time, description, notes, category, subcategory, issue')
            .eq('id', id)
            .single()

        const { data, error } = await supabase
            .from('jobs')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        const jobRef = data.job_number || id
        const customerId = data.customer_id ? String(data.customer_id) : null
        const customerName = data.customer_name || null
        const performedByName = body.updated_by || 'Admin'

        // 1 — Log status lifecycle changes
        const statusInteractionMap = {
            assigned: { type: 'job-assigned', description: `Job #${jobRef} assigned to technician` },
            in_progress: { type: 'job-started', description: `Job #${jobRef} marked in-progress` },
            completed: { type: 'job-completed', description: `Job #${jobRef} marked completed` },
            cancelled: { type: 'job-cancelled', description: `Job #${jobRef} cancelled` },
        };
        const statusLog = updates.status ? statusInteractionMap[updates.status] : null;
        if (statusLog) {
            logInteractionServer({
                type: statusLog.type,
                category: 'job',
                jobId: String(id),
                customerId,
                customerName,
                performedByName,
                description: statusLog.description,
                source: 'Admin',
            });
        }

        // 2 — Log technician reassignment
        if (updates.technician_id !== undefined && existing && updates.technician_id !== existing.technician_id) {
            const newName = updates.technician_name || updates.technician_id || 'Unknown'
            const oldName = existing.technician_name || (existing.technician_id ? existing.technician_id : 'Unassigned')
            logInteractionServer({
                type: 'job-reassigned',
                category: 'job',
                jobId: String(id),
                customerId,
                customerName,
                performedByName,
                description: `Job #${jobRef} reassigned: ${oldName} → ${newName}`,
                metadata: { from_technician: oldName, to_technician: newName },
                source: 'Admin',
            });
        }

        // 3 — Server-side diff ALL changed fields (does not rely on UI sending _changeLog)
        const fieldLabels = {
            priority: 'Priority',
            scheduled_date: 'Scheduled date',
            scheduled_time: 'Scheduled time',
            description: 'Job description',
            notes: 'Notes',
            category: 'Category',
            subcategory: 'Subcategory',
            issue: 'Issue',
        };
        const serverChanges = [];
        for (const [field, label] of Object.entries(fieldLabels)) {
            if (updates[field] !== undefined && existing && String(updates[field] || '') !== String(existing[field] || '')) {
                serverChanges.push(`${label} changed: "${existing[field] || '—'}" → "${updates[field] || '—'}"`);
            }
        }
        // Also include any UI-provided changes that aren't status/technician (they may have extra context)
        const uiExtraChanges = Array.isArray(_changeLog)
            ? _changeLog.filter(c => !c.startsWith('Status changed') && !c.startsWith('Technician reassigned'))
            : [];
        // Merge, deduplicate by prefix
        const allExtraChanges = [
            ...serverChanges,
            ...uiExtraChanges.filter(u => !serverChanges.some(s => s.startsWith(u.split(':')[0])))
        ];
        if (allExtraChanges.length > 0) {
            logInteractionServer({
                type: 'job-edited',
                category: 'job',
                jobId: String(id),
                customerId,
                customerName,
                performedByName,
                description: `Job #${jobRef} updated by ${performedByName}: ${allExtraChanges.join('; ')}`,
                metadata: { changes: allExtraChanges },
                source: body.source || 'Admin',
            });
        }

        // Also insert into job_interactions for timeline visibility
        if (allExtraChanges.length > 0) {
            supabase.from('job_interactions').insert([{
                job_id: id,
                type: 'edited',
                message: `Updated by ${performedByName}: ${allExtraChanges.join('; ')}`,
                user_name: performedByName,
            }]).then(() => {}).catch(() => {});
        }

        // Fire notification trigger for relevant status changes (fire-and-forget)
        const statusEventMap = {
            assigned: 'job_assigned',
            in_progress: 'job_started',
            completed: 'job_completed',
            cancelled: 'job_cancelled',
        };
        const notifEvent = statusEventMap[updates.status];
        if (notifEvent) {
            fireNotification(notifEvent, {
                job_id: String(id),
                customer_id: data.customer_id ? String(data.customer_id) : undefined,
                technician_id: data.assigned_to ? String(data.assigned_to) : undefined,
                customer_name: data.customer_name || undefined,
                technician_name: data.technician_name || undefined,
            });
        }

        // Side effect: If job is marked as completed, generate a draft invoice
        if (updates.status === 'completed') {
            try {
                // customer_id IS the account id directly (no more customers table lookup)
                const accountId = data.customer_id;
                const accountName = data.customer_name;

                if (accountId) {
                    // Check for existing invoice for this job
                    const { data: existing } = await supabase
                        .from('sales_invoices')
                        .select('id')
                        .eq('job_id', id)
                        .single()

                    if (!existing) {
                        const year = new Date().getFullYear();
                        const invoiceNumber = `INV-${year}-${Math.floor(Math.random() * 9000) + 1000}`;
                        const baseAmount = data.amount || 800;
                        const gstRate = 18;
                        const taxAmount = (baseAmount * gstRate) / 100;

                        await supabase.from('sales_invoices').insert({
                            invoice_number: invoiceNumber,
                            reference: invoiceNumber,
                            account_id: accountId,
                            account_name: accountName,
                            job_id: id,
                            date: new Date().toISOString().split('T')[0],
                            status: 'draft',
                            subtotal: baseAmount,
                            total_tax: taxAmount,
                            total_amount: baseAmount + taxAmount,
                            items: [{
                                description: `${data.category || 'Repair'} Service - ${data.job_number}`,
                                qty: 1,
                                rate: baseAmount,
                                taxRate: gstRate,
                                total: baseAmount + taxAmount
                            }]
                        })

                        await supabase.from('job_interactions').insert([{
                            job_id: id,
                            type: 'sales-invoice-created-draft',
                            message: `Automated draft invoice ${invoiceNumber} generated on job completion.`,
                            user_name: 'System'
                        }])
                    }
                }
            } catch (automatedError) {
                console.error('Failed to generate automated invoice:', automatedError)
            }
        }

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// DELETE - Delete job
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        // Fetch job info before deleting for logging
        const { data: job } = await supabase
            .from('jobs')
            .select('id, job_number, customer_id, customer_name, category, subcategory, status, technician_name')
            .eq('id', id)
            .single()

        const { error } = await supabase
            .from('jobs')
            .delete()
            .eq('id', id)

        if (error) throw error

        // Log the deletion
        if (job) {
            logInteractionServer({
                type: 'job-deleted',
                category: 'job',
                jobId: String(id),
                customerId: job.customer_id ? String(job.customer_id) : null,
                customerName: job.customer_name || null,
                performedByName: searchParams.get('deleted_by') || 'Admin',
                description: `Job #${job.job_number || id} deleted — ${job.category || ''} ${job.subcategory || ''} (was ${job.status})`.trim(),
                metadata: { job_number: job.job_number, category: job.category, status: job.status, technician: job.technician_name },
                source: 'Admin',
            });
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
