import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { logInteractionServer } from '@/lib/log-interaction-server'
import { fireNotification } from '@/lib/fire-notification'
import { STATUS_TO_EVENT, TECH_SETTABLE_STATUSES } from '@/lib/jobStatuses'

export async function GET(request, { params }) {
    try {
        const { id } = params
        // Do NOT join active_rentals / active_amcs inline — they are views that may not exist
        // in all environments; a failed join returns error=truthy and causes a blanket 404.
        const { data: job, error } = await supabase
            .from('jobs')
            .select(`
                *,
                customer:accounts(*),
                assigned_technician:technicians(id, name, phone)
            `)
            .eq('id', id)
            .single()

        if (error || !job) {
            return NextResponse.json({ error: 'Job not found', details: error?.message, hint: error?.hint, code: error?.code }, { status: 404 })
        }

        // Fetch rental / AMC data separately — graceful: null if view doesn't exist or no match
        let rentalData = null
        let amcData = null
        if (job.rental_id) {
            const res = await supabase.from('active_rentals').select('*').eq('id', job.rental_id).maybeSingle()
            rentalData = res.data || null
        }
        if (job.amc_id) {
            const res = await supabase.from('active_amcs').select('*').eq('id', job.amc_id).maybeSingle()
            amcData = res.data || null
        }

        // Resolve property JSONB blob into normalised address fields
        const resolveProperty = (prop) => {
            if (!prop) return {};
            if (prop.address && typeof prop.address === 'object' && prop.address.line1) {
                const parts = [
                    prop.address.apartment || prop.address.flat || '',
                    prop.address.building || prop.address.line2 || '',
                    prop.address.line1 || prop.address.street || '',
                ].filter(Boolean);
                return {
                    address: parts.join(', '),
                    locality: prop.address.locality || '',
                    city: prop.address.city || '',
                    pincode: prop.address.pincode || '',
                    latitude: prop.latitude || prop.address.latitude || null,
                    longitude: prop.longitude || prop.address.longitude || null,
                };
            }
            if (prop.flat_number || prop.building_name) {
                const parts = [prop.flat_number || '', prop.building_name || '', prop.address || ''].filter(Boolean);
                return {
                    address: parts.join(', '),
                    locality: prop.locality || '',
                    city: prop.city || '',
                    pincode: prop.pincode || '',
                    latitude: prop.latitude || null,
                    longitude: prop.longitude || null,
                };
            }
            return {
                address: typeof prop.address === 'string' ? prop.address : '',
                locality: prop.locality || '',
                city: prop.city || '',
                pincode: prop.pincode || '',
                latitude: prop.latitude || null,
                longitude: prop.longitude || null,
            };
        };

        const customerObj = job.customer || {};

        // Enrich property from full account data if available
        const enrichPropertyFromAccount = (storedProp, accountProps) => {
            if (!storedProp || !Array.isArray(accountProps)) return storedProp;
            const match = accountProps.find(p => p.id && storedProp.id && String(p.id) === String(storedProp.id));
            if (!match) return storedProp;
            return { ...storedProp, ...match };
        };

        const enrichedProp = enrichPropertyFromAccount(job.property, customerObj.properties);
        const propData = resolveProperty(enrichedProp);

        let bookingData = {};
        if (typeof job.notes === 'string' && job.notes.startsWith('{')) {
            try { bookingData = JSON.parse(job.notes); } catch (e) { }
        }

        const displayPhone = customerObj.phone || customerObj.mobile || bookingData.customer?.phone || job.customer_phone || 'N/A';
        const rawAddr = bookingData.customer?.address || {};
        const bookingAddr = rawAddr.locality
            ? `${rawAddr.apartment || ''}, ${rawAddr.street || ''}, ${rawAddr.locality}, ${rawAddr.city}`.replace(/^, /, '')
            : null;

        const jobAddress = propData.address
            ? [propData.address, propData.locality, propData.city].filter(Boolean).join(', ')
            : (bookingAddr || 'No address');

        const transformedJob = {
            id: job.id,
            job_number: job.job_number,
            customerId: job.customer_id,
            customerName: job.customer_name || customerObj.name,
            mobile: displayPhone,
            email: customerObj.email,
            address: jobAddress,
            locality: propData.locality || '',
            city: propData.city || '',
            location: { lat: propData.latitude, lng: propData.longitude },
            product: {
                type: job.category || '',
                name: job.appliance || job.subcategory || '',
                brand: job.brand || '',
                model: job.model || '',
                warranty: job.warranty_status || 'Out of Warranty'
            },
            defect: job.issue || '',
            issueCategory: job.category || '',
            priority: job.priority || 'normal',
            status: job.status || 'new_job_request',
            source: job.source || null,
            assignedTo: job.technician_id,
            assignedAt: job.created_at,
            dueDate: job.scheduled_date || job.due_date,
            confirmedVisitTime: job.scheduled_time || job.confirmed_visit_time,
            startedAt: job.started_at,
            completedAt: job.completed_at,
            createdAt: job.created_at,
            notes: typeof job.notes === 'string' && !job.notes.startsWith('{') ? job.notes : job.description_notes,
            internalNotes: job.internal_notes,
            description: job.description || '',
            thumbnail: job.thumbnail || null,
            rental_id: job.rental_id || null,
            rental: rentalData,
            amc_id: job.amc_id || null,
            amc: amcData,
            // Lifecycle timestamps
            on_way_at: job.on_way_at || null,
            arrived_at: job.arrived_at || null,
            quotation_approved_at: job.quotation_approved_at || null,
            repair_note_added_at: job.repair_note_added_at || null,
            _raw_property: job.property
        }

        return NextResponse.json({ success: true, job: transformedJob })

    } catch (error) {
        console.error('Error in job detail API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PUT(request, { params }) {
    try {
        const { id } = params;
        const body = await request.json();
        const { _changeLog, updated_by_name, action, ...updates } = body;

        // Fetch current job state
        const { data: existing } = await supabase
            .from('jobs')
            .select('status, customer_id, customer_name, job_number, technician_id, technician_name, repair_note_added_at, on_way_at, arrived_at')
            .eq('id', id)
            .single();

        const customerId = existing?.customer_id ? String(existing.customer_id) : null;
        const customerName = existing?.customer_name || null;
        const jobRef = existing?.job_number || id;
        const techName = updated_by_name || existing?.technician_name || 'Technician';

        // ── Special action: mark_on_way ────────────────────────────────────
        // Tech clicked "Start Job & Share Location" — locks cx from cancel/reschedule
        if (action === 'mark_on_way') {
            const { error } = await supabase
                .from('jobs')
                .update({ on_way_at: new Date().toISOString() })
                .eq('id', id);
            if (error) return NextResponse.json({ error: 'Failed to record on_way_at' }, { status: 500 });

            supabase.from('job_interactions').insert([{
                job_id: id, type: 'on-way', message: `Technician is on the way`, user_name: techName
            }]).then(null, () => {});

            return NextResponse.json({ success: true, message: 'on_way_at recorded' });
        }

        // ── Special action: mark_arrived ───────────────────────────────────
        // Tech clicked "Mark as Arrived" — auto-advances to diagnosing_quoting
        if (action === 'mark_arrived') {
            const now = new Date().toISOString();
            const { data: job, error } = await supabase
                .from('jobs')
                .update({ arrived_at: now, status: 'diagnosing_quoting' })
                .eq('id', id)
                .select()
                .single();
            if (error) return NextResponse.json({ error: 'Failed to record arrival' }, { status: 500 });

            const statusMsg = `Status changed: ${existing?.status} → diagnosing_quoting by ${techName} (arrived)`;
            supabase.from('job_interactions').insert([{
                job_id: id, type: 'status-changed', message: statusMsg, user_name: techName
            }]).then(null, () => {});
            logInteractionServer({
                type: 'job-status-diagnosing_quoting', category: 'job', jobId: String(id),
                customerId, customerName, performedByName: techName,
                description: `Job #${jobRef} — ${statusMsg}`, source: 'Technician App'
            });
            fireNotification('job_diagnosing', {
                job_id: String(id), job_number: existing?.job_number,
                customer_id: customerId || undefined,
                technician_id: existing?.technician_id ? String(existing.technician_id) : undefined,
                customer_name: customerName || undefined, technician_name: techName,
            }).catch(() => {});

            return NextResponse.json({ success: true, job, message: 'Arrived — status set to Diagnosing & Quoting' });
        }

        // ── Special action: add_repair_note ────────────────────────────────
        // Sets repair_note_added_at timestamp — gates Collect Payment button
        if (action === 'add_repair_note') {
            const now = new Date().toISOString();
            const { error } = await supabase
                .from('jobs')
                .update({ repair_note_added_at: now })
                .eq('id', id);
            if (error) return NextResponse.json({ error: 'Failed to record repair note' }, { status: 500 });

            supabase.from('job_interactions').insert([{
                job_id: id, type: 'repair-note-added',
                message: updates.note_text ? `Repair note added: ${updates.note_text}` : 'Repair note added',
                user_name: techName
            }]).then(null, () => {});

            return NextResponse.json({ success: true, message: 'Repair note recorded' });
        }

        // ── Special action: approve_quotation (tech manual confirmation) ────
        if (action === 'approve_quotation') {
            const now = new Date().toISOString();
            const { data: job, error } = await supabase
                .from('jobs')
                .update({ quotation_approved_at: now, status: 'work_in_progress' })
                .eq('id', id)
                .select()
                .single();
            if (error) return NextResponse.json({ error: 'Failed to approve quotation' }, { status: 500 });

            const statusMsg = `Quotation approved by customer (confirmed by ${techName}) — status: work_in_progress`;
            supabase.from('job_interactions').insert([{
                job_id: id, type: 'quotation-approved', message: statusMsg, user_name: techName
            }]).then(null, () => {});
            logInteractionServer({
                type: 'quotation-approved', category: 'job', jobId: String(id),
                customerId, customerName, performedByName: techName,
                description: `Job #${jobRef} — ${statusMsg}`, source: 'Technician App'
            });
            fireNotification('quotation_approved', {
                job_id: String(id), job_number: existing?.job_number,
                customer_id: customerId || undefined,
                technician_id: existing?.technician_id ? String(existing.technician_id) : undefined,
                customer_name: customerName || undefined, technician_name: techName,
            }).catch(() => {});

            return NextResponse.json({ success: true, job, message: 'Quotation approved — status set to Work In Progress' });
        }

        // ── Special action: full_payment_collected ─────────────────────────
        // Full payment received → auto-close job
        if (action === 'full_payment_collected') {
            const { data: job, error } = await supabase
                .from('jobs')
                .update({ status: 'closed', completed_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error) return NextResponse.json({ error: 'Failed to close job' }, { status: 500 });

            const statusMsg = `Full payment collected by ${techName} — status: closed`;
            supabase.from('job_interactions').insert([{
                job_id: id, type: 'status-changed', message: statusMsg, user_name: techName
            }]).then(null, () => {});
            logInteractionServer({
                type: 'job-status-closed', category: 'job', jobId: String(id),
                customerId, customerName, performedByName: techName,
                description: `Job #${jobRef} — ${statusMsg}`, source: 'Technician App'
            });
            fireNotification('job_closed', {
                job_id: String(id), job_number: existing?.job_number,
                customer_id: customerId || undefined,
                technician_id: existing?.technician_id ? String(existing.technician_id) : undefined,
                customer_name: customerName || undefined, technician_name: techName,
            }).catch(() => {});

            return NextResponse.json({ success: true, job, message: 'Job closed successfully' });
        }

        // ── Special action: close_job ──────────────────────────────────────
        // Technicians closing job with notes post-payment
        if (action === 'close_job') {
            const { data: job, error } = await supabase
                .from('jobs')
                .update({ 
                    status: 'closed', 
                    completed_at: new Date().toISOString(),
                    notes: updates.notes
                })
                .eq('id', id)
                .select()
                .single();
            if (error) {
                console.error('[technician/jobs PUT close_job] DB Error:', error.message);
                return NextResponse.json({ error: 'Failed to close job: ' + error.message }, { status: 500 });
            }

            const statusMsg = `Job closed by ${techName} with call closure notes`;
            supabase.from('job_interactions').insert([{
                job_id: id, type: 'status-changed', message: statusMsg, user_name: techName
            }]).then(null, () => {});
            logInteractionServer({
                type: 'job-status-closed', category: 'job', jobId: String(id),
                customerId, customerName, performedByName: techName,
                description: `Job #${jobRef} — ${statusMsg}`, source: 'Technician App'
            });
            fireNotification('job_closed', {
                job_id: String(id), job_number: existing?.job_number,
                customer_id: customerId || undefined,
                technician_id: existing?.technician_id ? String(existing.technician_id) : undefined,
                customer_name: customerName || undefined, technician_name: techName,
            }).catch(() => {});

            return NextResponse.json({ success: true, job, message: 'Job closed successfully' });
        }

        // ── Standard field update ──────────────────────────────────────────

        // Gate: parts_ordered requires repair_note_added_at to be set
        if (updates.status === 'parts_ordered' && !existing?.repair_note_added_at && !updates.repair_note_added_at) {
            return NextResponse.json(
                { error: 'Please add a repair note describing the parts needed before setting Parts Ordered.' },
                { status: 400 }
            );
        }

        // Gate: only allow TECH_SETTABLE_STATUSES from technician endpoint
        if (updates.status && !TECH_SETTABLE_STATUSES.includes(updates.status)) {
            return NextResponse.json(
                { error: `Technicians cannot set status to "${updates.status}"` },
                { status: 403 }
            );
        }

        // Sanitize: only pass known DB columns to Supabase
        const ALLOWED = [
            'status', 'priority', 'technician_id', 'technician_name',
            'description', 'notes', 'scheduled_date', 'scheduled_time',
            'category', 'subcategory', 'appliance', 'brand', 'issue', 'model',
            'amount', 'property', 'property_id', 'rental_id', 'amc_id', 'source',
            'on_way_at', 'arrived_at', 'quotation_approved_at', 'repair_note_added_at',
            'completed_at', 'started_at', 'customer_id', 'customer_name',
            'warranty', 'warranty_proof', 'customer_rating', 'rating_note', 'rated_at'
        ];
        const sanitizedUpdates = Object.fromEntries(
            Object.entries(updates).filter(([k]) => ALLOWED.includes(k))
        );

        const { data: job, error } = await supabase
            .from('jobs')
            .update(sanitizedUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[technician/jobs PUT] DB error:', error.message);
            return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
        }

        // Log UI field changes
        if (Array.isArray(_changeLog) && _changeLog.length > 0) {
            const changesWithoutStatus = _changeLog.filter(c => !c.toLowerCase().includes('status changed'));
            if (changesWithoutStatus.length > 0) {
                logInteractionServer({
                    type: 'job-edited', category: 'job', jobId: String(id),
                    customerId, customerName, performedByName: techName,
                    description: `Job updated: ${changesWithoutStatus.join('; ')}`,
                    source: 'Technician App'
                });
            }
        }

        // Log status change
        if (updates.status && existing && updates.status !== existing.status) {
            const statusMsg = `Status changed: ${existing.status} → ${updates.status} by ${techName}`;
            supabase.from('job_interactions').insert([{
                job_id: id, type: 'status-changed', message: statusMsg, user_name: techName
            }]).then(null, () => {});
            logInteractionServer({
                type: `job-status-${updates.status}`, category: 'job', jobId: String(id),
                customerId, customerName, performedByName: techName,
                description: `Job #${jobRef} — ${statusMsg}`, source: 'Technician App'
            });

            const notifEvent = STATUS_TO_EVENT[updates.status];
            if (notifEvent) {
                fireNotification(notifEvent, {
                    job_id: String(id), job_number: existing?.job_number,
                    customer_id: customerId || undefined,
                    technician_id: existing?.technician_id ? String(existing.technician_id) : undefined,
                    customer_name: customerName || undefined, technician_name: techName,
                }).catch(err => console.error('[technician/jobs PUT] notification error:', err.message));
            }
        }

        return NextResponse.json({ success: true, job, message: 'Job updated successfully' });

    } catch (error) {
        console.error('Error in job update API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
