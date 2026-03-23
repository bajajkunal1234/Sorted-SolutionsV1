import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { logInteractionServer } from '@/lib/log-interaction-server'

export async function GET(request, { params }) {
    try {
        const { id } = params
        const { data: job, error } = await supabase
            .from('jobs')
            .select(`
                *,
                customer:accounts(*),
                assigned_technician:technicians(id, name, phone),
                rental:active_rentals(*),
                amc:active_amcs(*)
            `)
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error fetching job:', error)
            return NextResponse.json(
                { error: 'Job not found' },
                { status: 404 }
            )
        }

        // job.property is a JSONB blob stored on the job row
        const resolveProperty = (prop) => {
            if (!prop) return {};
            if (prop.address && typeof prop.address === 'object') {
                // PropertyForm format: { address: { line1, locality, city, pincode } }
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
            // NewAccountForm format: flat top-level fields flat_number, building_name, address (street)
            if (prop.flat_number || prop.building_name) {
                const parts = [
                    prop.flat_number || '',
                    prop.building_name || '',
                    prop.address || '',
                ].filter(Boolean);
                return {
                    address: parts.join(', '),
                    locality: prop.locality || '',
                    city: prop.city || '',
                    pincode: prop.pincode || '',
                    latitude: prop.latitude || null,
                    longitude: prop.longitude || null,
                };
            }
            // Flat string address
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

        // Try to enrich property data from customer.properties (full account data) by ID match
        // This recovers flat_number/building_name that may have been dropped when job.property was saved
        const enrichPropertyFromAccount = (storedProp, accountProps) => {
            if (!storedProp || !Array.isArray(accountProps)) return storedProp;
            const match = accountProps.find(p => p.id && storedProp.id && String(p.id) === String(storedProp.id));
            if (!match) return storedProp;
            // Merge: account data has full flat_number, building_name, locality, pincode
            return { ...storedProp, ...match };
        };

        const enrichedProp = enrichPropertyFromAccount(job.property, customerObj.properties);
        const propData = resolveProperty(enrichedProp);

        // Also resolve notes if it originated as a booking request
        let bookingData = {};
        if (typeof job.notes === 'string' && job.notes.startsWith('{')) {
            try { bookingData = JSON.parse(job.notes); } catch (e) { }
        }
        
        const displayPhone = customerObj.phone || customerObj.mobile || bookingData.customer?.phone || job.customer_phone || 'N/A';
        const rawAddr = bookingData.customer?.address || {};
        const bookingAddr = rawAddr.locality ? `${rawAddr.apartment || ''}, ${rawAddr.street || ''}, ${rawAddr.locality}, ${rawAddr.city}`.replace(/^, /, '') : null;
        
        const jobAddress = propData.address ? 
            [propData.address, propData.locality, propData.city].filter(Boolean).join(', ') : 
            (bookingAddr || 'No address');

        // Transform data
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
            location: {
                lat: propData.latitude,
                lng: propData.longitude
            },
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
            status: job.status || 'open',
            assignedTo: job.technician_id,
            assignedAt: job.created_at, // mapped
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
            rental: job.rental || null,
            amc_id: job.amc_id || null,
            amc: job.amc || null,
            _raw_property: job.property
        }

        return NextResponse.json({
            success: true,
            job: transformedJob
        })

    } catch (error) {
        console.error('Error in job detail API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function PUT(request, { params }) {
    try {
        const { id } = params;
        const body = await request.json();
        
        // Extract _changeLog metadata for logging, and exclude it from DB updates
        const { _changeLog, updated_by_name, ...updates } = body;

        // Ensure we capture pre-update state for logging status lifecycle
        const { data: existing } = await supabase
            .from('jobs')
            .select('status, customer_id, customer_name, job_number, technician_id, technician_name')
            .eq('id', id)
            .single();

        const { data: job, error } = await supabase
            .from('jobs')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating job:', error)
            return NextResponse.json(
                { error: 'Failed to update job' },
                { status: 500 }
            )
        }

        // --- INTERACTION LOGGING ---
        const customerId = existing?.customer_id ? String(existing.customer_id) : null;
        const customerName = existing?.customer_name || null;
        const jobRef = existing?.job_number || id;
        const techName = updated_by_name || existing?.technician_name || 'Technician';

        // 1. Log explicit UI changes
        if (Array.isArray(_changeLog) && _changeLog.length > 0) {
            const changesWithoutStatus = _changeLog.filter(c => !c.toLowerCase().includes('status changed'));
            
            if (changesWithoutStatus.length > 0) {
                logInteractionServer({
                    type: 'job-edited',
                    category: 'job',
                    jobId: String(id),
                    customerId,
                    customerName,
                    performedByName: techName,
                    description: `Job updated: ${changesWithoutStatus.join('; ')}`,
                    source: 'Technician App'
                });
            }
        }

        // 2. Log major status milestones (like Admin routing)
        if (updates.status && existing && updates.status !== existing.status) {
            const statusMap = {
                'in-progress': { type: 'job-started', desc: `Job marked in-progress` },
                'completed': { type: 'job-completed', desc: `Job marked completed` },
                'cancelled': { type: 'job-cancelled', desc: `Job cancelled` }
            };

            const logMsg = statusMap[updates.status];
            if (logMsg) {
                logInteractionServer({
                    type: logMsg.type,
                    category: 'job',
                    jobId: String(id),
                    customerId,
                    customerName,
                    performedByName: techName,
                    description: logMsg.desc,
                    source: 'Technician App'
                });
            }
        }

        return NextResponse.json({
            success: true,
            job,
            message: 'Job updated successfully'
        });

    } catch (error) {
        console.error('Error in job update API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
