import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { logInteractionServer } from '@/lib/log-interaction-server'
import { fireNotification } from '@/lib/fire-notification'
import { generateJobNumber } from '@/lib/generateJobNumber'
import { STATUS_TO_EVENT } from '@/lib/jobStatuses'

// GET - Fetch all jobs or filter by query params
export async function GET(request) {
    const supabase = createServerSupabase()
    try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const customerId = searchParams.get('customer_id')
        const technicianId = searchParams.get('technician_id')

        const isUUID = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

        if (customerId && !isUUID(customerId)) {
            return NextResponse.json({ success: true, data: [] });
        }
        if (technicianId && !isUUID(technicianId)) {
            return NextResponse.json({ success: true, data: [] });
        }

        let query = supabase
            .from('jobs')
            .select(`
                *,
                customer:accounts(*),
                technician:technicians(*),
                rental:active_rentals(*),
                amc:active_amcs(*)
            `)
            .order('created_at', { ascending: false })

        if (status && status !== 'all') {
            query = query.eq('status', status)
        }
        if (customerId) {
            let lookupIds = [customerId];
            const { data: authCustomers } = await supabase.from('customers').select('id').eq('ledger_id', customerId);
            if (authCustomers && authCustomers.length > 0) {
                lookupIds = [...lookupIds, ...authCustomers.map(c => c.id)];
            }
            query = query.in('customer_id', lookupIds);
        }
        if (technicianId) {
            query = query.eq('technician_id', technicianId)
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export const dynamic = 'force-dynamic'

// POST - Create new job
export async function POST(request) {
    const supabase = createServerSupabase()
    try {
        const body = await request.json();

        // Auto-generate job number if not provided
        if (!body.job_number) {
            body.job_number = await generateJobNumber();
        }

        // New jobs always start as new_job_request
        if (!body.status) body.status = 'new_job_request';

        // Sanitize: only pass known DB columns to Supabase
        const ALLOWED_POST = [
            'job_number', 'status', 'priority', 'technician_id', 'technician_name',
            'description', 'notes', 'scheduled_date', 'scheduled_time',
            'category', 'subcategory', 'appliance', 'brand', 'issue', 'model',
            'amount', 'property', 'property_id', 'rental_id', 'amc_id', 'source',
            'on_way_at', 'arrived_at', 'quotation_approved_at', 'repair_note_added_at',
            'completed_at', 'started_at', 'customer_id', 'customer_name',
            'warranty', 'warranty_proof'
        ];
        const insertData = Object.fromEntries(
            Object.entries(body).filter(([k]) => ALLOWED_POST.includes(k))
        );

        const { data, error } = await supabase
            .from('jobs')
            .insert([insertData])
            .select()
            .single()

        if (error) throw error

        // ── Return immediately — run logging & notifications in the background ——
        const responseData = NextResponse.json({ success: true, data });

        // Fire-and-forget: do not await, these must not slow down the response
        supabase.from('job_interactions').insert([{
            job_id: data.id,
            type: 'status-changed',
            message: `Job created — status: ${data.status}`,
            user_name: body.created_by || 'Admin'
        }]).then(null, e => console.error('[jobs POST] interaction log:', e.message));

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

        fireNotification('job_created_admin', {
            job_id: String(data.id),
            job_number: data.job_number,
            customer_id: body.customer_id ? String(body.customer_id) : undefined,
            customer_name: data.customer_name || undefined,
        }).catch(e => console.error('[jobs POST] fireNotification:', e.message));

        return responseData;
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PUT - Update job
export async function PUT(request) {
    const supabase = createServerSupabase()
    try {
        const body = await request.json()
        const { id, _changeLog, ...rawUpdates } = body

        // ── Sanitize: only pass known DB columns to Supabase ────────────────
        // Prevents client UI fields (join objects, computed props) from causing errors
        const ALLOWED = ['status','priority','technician_id','technician_name',
            'description','notes','scheduled_date','scheduled_time',
            'category','subcategory','appliance','brand','issue','model',
            'amount','property','property_id','rental_id','amc_id','source',
            'on_way_at','arrived_at','quotation_approved_at','repair_note_added_at',
            'completed_at','started_at','customer_id','customer_name',
            'warranty','warranty_proof'];
        const updates = Object.fromEntries(
            Object.entries(rawUpdates).filter(([k]) => ALLOWED.includes(k))
        );

        // Fetch current state for diffing
        const { data: existing } = await supabase
            .from('jobs')
            .select('technician_id, technician_name, status, customer_id, customer_name, job_number, priority, scheduled_date, scheduled_time, description, notes, category, subcategory, issue, rental_id, amc_id, source, warranty, warranty_proof')
            .eq('id', id)
            .single()

        // ── Auto-assign side effect ──────────────────────────────────────────
        // When admin assigns a technician to a new_job_request, auto-advance to scheduled
        const isAssigningTech = updates.technician_id && updates.technician_id !== existing?.technician_id;
        const currentlyNewRequest = existing?.status === 'new_job_request';
        const statusBeingSetManually = !!updates.status;

        if (isAssigningTech && currentlyNewRequest && !statusBeingSetManually) {
            updates.status = 'scheduled';
        }

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

        // ── 1. Log status change interaction (ALL statuses) ─────────────────
        if (updates.status && existing && updates.status !== existing.status) {
            const statusMsg = `Status changed: ${existing.status} → ${updates.status} by ${performedByName}`;

            supabase.from('job_interactions').insert([{
                job_id: id, type: 'status-changed', message: statusMsg, user_name: performedByName,
            }]).then(null, () => {});

            logInteractionServer({
                type: `job-status-${updates.status}`,
                category: 'job',
                jobId: String(id),
                customerId,
                customerName,
                performedByName,
                description: `Job #${jobRef} — ${statusMsg}`,
                source: 'Admin',
            });

            // Fire notification for this status change
            const notifEvent = STATUS_TO_EVENT[updates.status];
            if (notifEvent) {
                fireNotification(notifEvent, {
                    job_id: String(id),
                    job_number: data.job_number,
                    customer_id: customerId || undefined,
                    technician_id: data.technician_id ? String(data.technician_id) : undefined,
                    customer_name: customerName || undefined,
                    technician_name: data.technician_name || undefined,
                }).catch(err => console.error('[admin/jobs PUT] notification error:', err.message));
            }
        }

        // ── 2. Log technician reassignment ───────────────────────────────────
        if (isAssigningTech && existing) {
            const newName = updates.technician_name || updates.technician_id || 'Unknown';
            const oldName = existing.technician_name || (existing.technician_id ? existing.technician_id : 'Unassigned');

            supabase.from('job_interactions').insert([{
                job_id: id, type: 'assigned',
                message: `Technician assigned: ${oldName} → ${newName} by ${performedByName}`,
                user_name: performedByName,
            }]).then(null, () => {});

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

            // Fire job_assigned notification
            fireNotification('job_assigned', {
                job_id: String(id),
                job_number: data.job_number,
                customer_id: customerId || undefined,
                technician_id: String(updates.technician_id),
                customer_name: customerName || undefined,
                technician_name: updates.technician_name || undefined,
            }).catch(() => {});
        }

        // ── 3. Log field-level changes ───────────────────────────────────────
        const fieldLabels = {
            priority: 'Priority',
            scheduled_date: 'Scheduled date',
            scheduled_time: 'Scheduled time',
            description: 'Job description',
            notes: 'Notes',
            category: 'Category',
            subcategory: 'Subcategory',
            issue: 'Issue',
            rental_id: 'Linked Rental',
            amc_id: 'Linked AMC',
            warranty: 'Under warranty',
            warranty_proof: 'Warranty proof',
        };
        const serverChanges = [];
        for (const [field, label] of Object.entries(fieldLabels)) {
            if (updates[field] !== undefined && existing && String(updates[field] || '') !== String(existing[field] || '')) {
                serverChanges.push(`${label} changed: "${existing[field] || '—'}" → "${updates[field] || '—'}"`);
            }
        }
        const uiExtraChanges = Array.isArray(_changeLog)
            ? _changeLog.filter(c => !c.startsWith('Status changed') && !c.startsWith('Technician reassigned'))
            : [];
        const allExtraChanges = [
            ...serverChanges,
            ...uiExtraChanges.filter(u => !serverChanges.some(s => s.startsWith(u.split(':')[0])))
        ];
        if (allExtraChanges.length > 0) {
            supabase.from('job_interactions').insert([{
                job_id: id, type: 'edited',
                message: `Updated by ${performedByName}: ${allExtraChanges.join('; ')}`,
                user_name: performedByName,
            }]).then(null, () => {});

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

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// DELETE - Delete job
export async function DELETE(request) {
    const supabase = createServerSupabase()
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ success: false, error: 'Job ID is required' }, { status: 400 });
        }

        // Fetch job details for logging
        const { data: job } = await supabase
            .from('jobs')
            .select('id, job_number, customer_id, customer_name, category, subcategory, status, technician_name')
            .eq('id', id)
            .single()

        // ── Step 1: Null out job_id on all linked financial documents ────────
        // Financial records must be preserved — we just detach them from this job.
        // These are all the tables with a job_id FK referencing jobs.id:
        const unlinkResults = await Promise.all([
            supabase.from('sales_invoices').update({ job_id: null }).eq('job_id', id),
            supabase.from('purchase_invoices').update({ job_id: null }).eq('job_id', id),
            supabase.from('quotations').update({ job_id: null }).eq('job_id', id),
            supabase.from('receipt_vouchers').update({ job_id: null }).eq('job_id', id),
            supabase.from('payment_vouchers').update({ job_id: null }).eq('job_id', id),
        ]);

        // Check for any unlink errors
        const unlinkErrors = unlinkResults.map(r => r.error).filter(Boolean);
        if (unlinkErrors.length > 0) {
            return NextResponse.json({
                success: false,
                error: `Failed to unlink financial documents: ${unlinkErrors.map(e => e.message).join(', ')}`
            }, { status: 500 });
        }

        // ── Step 2: Delete job-specific audit trail ──────────────────────────
        await supabase.from('job_interactions').delete().eq('job_id', id);

        // ── Step 3: Delete the job itself ────────────────────────────────────
        const { error } = await supabase
            .from('jobs')
            .delete()
            .eq('id', id)

        if (error) throw error

        if (job) {
            logInteractionServer({
                type: 'job-deleted',
                category: 'job',
                jobId: String(id),
                customerId: job.customer_id ? String(job.customer_id) : null,
                customerName: job.customer_name || null,
                performedByName: searchParams.get('deleted_by') || 'Admin',
                description: `Job #${job.job_number || id} deleted — ${job.category || ''} ${job.subcategory || ''} (was ${job.status}). Financial documents detached but preserved.`.trim(),
                metadata: { job_number: job.job_number, category: job.category, status: job.status, technician: job.technician_name },
                source: 'Admin',
            });
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
