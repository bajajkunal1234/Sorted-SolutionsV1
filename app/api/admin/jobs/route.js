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

// POST - Create new job
export async function POST(request) {
    try {
        const body = await request.json()

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

        // Fetch current state to detect changes (e.g. technician_id)
        const { data: existing } = await supabase
            .from('jobs')
            .select('technician_id, technician_name, status, customer_id, customer_name, job_number')
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

        // 3 — Log any other field changes that the UI detected (_changeLog)
        if (Array.isArray(_changeLog) && _changeLog.length > 0) {
            // Only log the non-status, non-reassignment changes (already logged above)
            const extraChanges = _changeLog.filter(
                c => !c.startsWith('Status changed') && !c.startsWith('Technician reassigned')
            )
            if (extraChanges.length > 0) {
                logInteractionServer({
                    type: 'job-edited',
                    category: 'job',
                    jobId: String(id),
                    customerId,
                    customerName,
                    performedByName,
                    description: `Job #${jobRef} updated by ${performedByName}: ${extraChanges.join('; ')}`,
                    metadata: { changes: extraChanges },
                    source: 'Admin',
                });
            }
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

        const { error } = await supabase
            .from('jobs')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
