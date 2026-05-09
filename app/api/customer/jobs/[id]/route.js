import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { fireNotification } from '@/lib/fire-notification'
import { logInteractionServer } from '@/lib/log-interaction-server'

export async function GET(request, { params }) {
    try {
        const { id } = params

        const { data: job, error } = await supabase
            .from('jobs')
            .select(`
                *,
                customer:customers(id, name, mobile, email),
                product:products(id, name, category),
                brand:brands(id, name),
                issue:issues(id, title, category, description),
                assigned_technician:technicians(id, name, mobile)
            `)
            .eq('id', id)
            .single()

        if (error) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 })
        }

        const prop = job.property || {};
        const propAddr = prop.address && typeof prop.address === 'object'
            ? { address: prop.address.line1 || '', locality: prop.address.locality || '', city: prop.address.city || '' }
            : { address: typeof prop.address === 'string' ? prop.address : '', locality: prop.locality || '', city: prop.city || '' };

        const transformedJob = {
            id: job.id,
            customerId: job.customer_id,
            propertyId: job.property_id,
            address: propAddr.address,
            locality: propAddr.locality,
            city: propAddr.city,
            product: {
                type: job.product?.category,
                name: job.product?.name,
                brand: job.brand?.name
            },
            issue: job.issue?.title,
            issueDescription: job.issue?.description,
            issueCategory: job.issue?.category,
            priority: job.priority,
            status: job.status,
            source: job.source || null,
            assignedTechnician: job.assigned_technician?.name,
            technicianMobile: job.assigned_technician?.mobile,
            dueDate: job.due_date,
            confirmedVisitTime: job.confirmed_visit_time,
            startedAt: job.started_at,
            completedAt: job.completed_at,
            createdAt: job.created_at,
            notes: job.notes,
            warrantyStatus: job.warranty_status,
            // Lifecycle timestamps
            on_way_at: job.on_way_at || null,
            arrived_at: job.arrived_at || null,
            quotation_approved_at: job.quotation_approved_at || null,
            repair_note_added_at: job.repair_note_added_at || null,
        }

        return NextResponse.json({ success: true, job: transformedJob })

    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(request, { params }) {
    try {
        const { id } = params
        const body = await request.json()
        const { action, customerId, scheduled_date, scheduled_time, rating, rating_note: ratingNote } = body

        // ── Fetch job for validation ─────────────────────────────────────────
        const { data: job, error: fetchError } = await supabase
            .from('jobs')
            .select('customer_id, status, scheduled_date, scheduled_time, on_way_at, arrived_at, customer_rating, job_number, technician_id, customer_name')
            .eq('id', id)
            .single()

        if (fetchError || !job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 })
        }

        // ── Customer ownership check ─────────────────────────────────────────
        if (action !== 'rate' && customerId && job.customer_id !== customerId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // ── Cx lock: technician already started journey ──────────────────────
        // cx cannot cancel or reschedule once tech has clicked "Start Job & Share Location"
        const isTechOnWay = !!job.on_way_at;

        // ── action: cancel ───────────────────────────────────────────────────
        if (action === 'cancel') {
            if (job.status === 'closed') {
                return NextResponse.json({ error: 'Cannot cancel a closed job' }, { status: 400 })
            }
            if (isTechOnWay) {
                return NextResponse.json({
                    error: 'The technician is already on the way. Please call us to reschedule or cancel.'
                }, { status: 400 })
            }

            const { data: updatedJob, error: updateError } = await supabase
                .from('jobs')
                .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single()

            if (updateError) return NextResponse.json({ error: 'Failed to cancel job' }, { status: 500 })

            await supabase.from('job_interactions').insert({
                job_id: id, type: 'status-changed',
                message: 'Customer cancelled the service request — status: cancelled',
                user_name: 'Customer'
            }).catch(() => {});

            logInteractionServer({
                type: 'job-cancelled', category: 'job', jobId: String(id),
                customerId: job.customer_id ? String(job.customer_id) : null,
                customerName: job.customer_name || null,
                performedByName: 'Customer',
                description: `Job #${job.job_number} cancelled by customer`,
                source: 'Customer App'
            });

            await fireNotification('job_cancelled', {
                job_id: String(id), job_number: job.job_number,
                customer_id: job.customer_id ? String(job.customer_id) : undefined,
                technician_id: job.technician_id ? String(job.technician_id) : undefined,
                customer_name: job.customer_name || undefined,
            }).catch(() => {});

            return NextResponse.json({ success: true, job: updatedJob, message: 'Job cancelled successfully' })
        }

        // ── action: reschedule ───────────────────────────────────────────────
        if (action === 'reschedule') {
            if (!scheduled_date || !scheduled_time) {
                return NextResponse.json({ error: 'Missing scheduled_date or scheduled_time' }, { status: 400 })
            }
            if (job.status === 'closed' || job.status === 'cancelled') {
                return NextResponse.json({ error: 'Cannot reschedule a closed or cancelled job' }, { status: 400 })
            }
            if (isTechOnWay) {
                return NextResponse.json({
                    error: 'The technician is already on the way. Please call us to reschedule.'
                }, { status: 400 })
            }

            const { data: updatedJob, error: updateError } = await supabase
                .from('jobs')
                .update({
                    scheduled_date,
                    scheduled_time,
                    status: 'cx_reschedule',   // auto-change status
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single()

            if (updateError) return NextResponse.json({ error: 'Failed to reschedule job' }, { status: 500 })

            const oldSlot = `${job.scheduled_date || '?'} ${job.scheduled_time || ''}`.trim();
            const newSlot = `${scheduled_date} ${scheduled_time}`;

            await supabase.from('job_interactions').insert({
                job_id: id, type: 'status-changed',
                message: `Customer rescheduled: ${oldSlot} → ${newSlot} — status: cx_reschedule`,
                user_name: 'Customer'
            }).catch(() => {});

            logInteractionServer({
                type: 'job-rescheduled-cx', category: 'job', jobId: String(id),
                customerId: job.customer_id ? String(job.customer_id) : null,
                customerName: job.customer_name || null,
                performedByName: 'Customer',
                description: `Job #${job.job_number} rescheduled by customer: ${oldSlot} → ${newSlot}`,
                source: 'Customer App'
            });

            await fireNotification('job_rescheduled_cx', {
                job_id: String(id), job_number: job.job_number,
                customer_id: job.customer_id ? String(job.customer_id) : undefined,
                technician_id: job.technician_id ? String(job.technician_id) : undefined,
                customer_name: job.customer_name || undefined,
            }).catch(() => {});

            return NextResponse.json({ success: true, job: updatedJob, message: 'Job rescheduled successfully' })
        }

        // ── action: approve_quotation ────────────────────────────────────────
        if (action === 'approve_quotation') {
            const now = new Date().toISOString();
            const { data: updatedJob, error: updateError } = await supabase
                .from('jobs')
                .update({ quotation_approved_at: now, status: 'work_in_progress', updated_at: now })
                .eq('id', id)
                .select()
                .single()

            if (updateError) return NextResponse.json({ error: 'Failed to approve quotation' }, { status: 500 })

            await supabase.from('job_interactions').insert({
                job_id: id, type: 'quotation-approved',
                message: 'Customer approved the quotation — status: work_in_progress',
                user_name: 'Customer'
            }).catch(() => {});

            logInteractionServer({
                type: 'quotation-approved', category: 'job', jobId: String(id),
                customerId: job.customer_id ? String(job.customer_id) : null,
                customerName: job.customer_name || null,
                performedByName: 'Customer',
                description: `Job #${job.job_number} quotation approved by customer`,
                source: 'Customer App'
            });

            await fireNotification('quotation_approved', {
                job_id: String(id), job_number: job.job_number,
                customer_id: job.customer_id ? String(job.customer_id) : undefined,
                technician_id: job.technician_id ? String(job.technician_id) : undefined,
                customer_name: job.customer_name || undefined,
            }).catch(() => {});

            return NextResponse.json({ success: true, job: updatedJob, message: 'Quotation approved — work will begin shortly.' })
        }

        // ── action: rate ─────────────────────────────────────────────────────
        if (action === 'rate') {
            const ratingNum = parseInt(rating);
            if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
                return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
            }
            // Allow rating for closed jobs (was completed, now closed)
            if (job.status !== 'closed' && job.status !== 'completed') {
                return NextResponse.json({ error: 'Can only rate closed jobs' }, { status: 400 })
            }

            const { data: updatedJob, error: updateError } = await supabase
                .from('jobs')
                .update({ customer_rating: ratingNum, rating_note: ratingNote || null, rated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single()

            if (updateError) return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 })

            await supabase.from('job_interactions').insert({
                job_id: id, type: 'customer-rated',
                message: `Customer gave ${ratingNum} star${ratingNum !== 1 ? 's' : ''}${ratingNote ? `: "${ratingNote}"` : ''}`,
                user_name: 'Customer',
            }).catch(() => {});

            return NextResponse.json({ success: true, job: updatedJob })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
