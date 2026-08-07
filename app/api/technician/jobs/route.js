import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const technicianId = searchParams.get('technicianId')
        const status = searchParams.get('status')

        if (!technicianId) {
            return NextResponse.json(
                { error: 'Technician ID is required' },
                { status: 400 }
            )
        }

        // Validate active session
        const sessionToken = request.headers.get('x-session-token')
        const { data: tech } = await supabase
            .from('technicians')
            .select('current_session_token')
            .eq('id', technicianId)
            .single()

        if (!tech || !tech.current_session_token || tech.current_session_token !== sessionToken) {
            return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 })
        }

        // Build query — always exclude closed and cancelled; technician only sees active work
        let query = supabase
            .from('jobs')
            .select(`
                *,
                customer:accounts(*),
                assigned_technician:technicians(id, name, phone),
                quotations(id, quote_number, total_amount, status),
                sales_invoices(id, invoice_number, total_amount, status)
            `)
            .eq('technician_id', technicianId)
            .not('status', 'in', '("closed","cancelled","new_job_request","booking_request","enquiry")')  // hard filter — technicians never see unvetted or closed jobs
            .order('created_at', { ascending: false })

        // Optional additional status filter (e.g. ?status=scheduled for a specific view)
        if (status && status !== 'all') {
            query = query.eq('status', status)
        }

        const { data: jobs, error } = await query

        if (error) {
            console.error('Error fetching technician jobs:', error)
            return NextResponse.json(
                { error: 'Failed to fetch jobs' },
                { status: 500 }
            )
        }

        // Merge latest property coordinates/verification details from properties table
        if (jobs && jobs.length > 0) {
            const propertyIds = jobs.map(j => j.property_id).filter(Boolean);
            if (propertyIds.length > 0) {
                const { data: propertiesList } = await supabase
                    .from('properties')
                    .select('*')
                    .in('id', propertyIds);

                if (propertiesList && propertiesList.length > 0) {
                    const propMap = {};
                    propertiesList.forEach(p => {
                        propMap[p.id] = p;
                    });
                    jobs.forEach(j => {
                        if (j.property_id && propMap[j.property_id]) {
                            const dbProp = propMap[j.property_id];
                            j.property = {
                                ...(j.property || {}),
                                latitude: dbProp.latitude || j.property?.latitude || null,
                                longitude: dbProp.longitude || j.property?.longitude || null,
                                location_verified_by: dbProp.location_verified_by || j.property?.location_verified_by || null,
                                location_verified_at: dbProp.location_verified_at || j.property?.location_verified_at || null,
                            };
                        }
                    });
                }
            }
        }

        // Transform data to match expected format
        // job.property is a JSONB blob stored on the job row (from CreateJobForm)
        const resolveProperty = (prop) => {
            if (!prop) return {};
            // PropertyForm format: { address: { line1, locality, city, pincode } }
            if (prop.address && typeof prop.address === 'object') {
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

        const enrichPropertyFromAccount = (storedProp, accountProps) => {
            if (!storedProp || !Array.isArray(accountProps)) return storedProp;
            const match = accountProps.find(p => p.id && storedProp.id && String(p.id) === String(storedProp.id));
            return match ? { ...storedProp, ...match } : storedProp;
        };

        const transformedJobs = jobs.map(job => {
            const customerObj = job.customer || {};
            const enrichedProp = enrichPropertyFromAccount(job.property, customerObj.properties);
            const propData = resolveProperty(enrichedProp);

            // Apply exact coordinates fallbacks as done on admin jobs map
            let resolvedLat = propData.latitude;
            let resolvedLng = propData.longitude;

            if (!resolvedLat && !resolvedLng) {
                const accountProps = customerObj.properties;
                if (Array.isArray(accountProps) && accountProps.length > 0) {
                    // Fallback 1: Try matching by building name or address line similarity
                    const storedProp = job.property || {};
                    const matchByDetails = accountProps.find(p => 
                        (p.lat || p.latitude) && (
                            (p.building_name && storedProp.building_name && String(p.building_name).trim().toLowerCase() === String(storedProp.building_name).trim().toLowerCase()) ||
                            (p.address && storedProp.address && String(p.address).trim().toLowerCase() === String(storedProp.address).trim().toLowerCase())
                        )
                    );
                    if (matchByDetails) {
                        resolvedLat = matchByDetails.lat || matchByDetails.latitude;
                        resolvedLng = matchByDetails.lng || matchByDetails.longitude;
                    }

                    // Fallback 2: If only 1 property in customer account, use it
                    if (!resolvedLat && !resolvedLng && accountProps.length === 1) {
                        const first = accountProps[0];
                        if (first.lat || first.latitude) {
                            resolvedLat = first.lat || first.latitude;
                            resolvedLng = first.lng || first.longitude;
                        }
                    }

                    // Fallback 3: Use the first property that has coordinates
                    if (!resolvedLat && !resolvedLng) {
                        const firstWithCoords = accountProps.find(p => p.lat || p.latitude);
                        if (firstWithCoords) {
                            resolvedLat = firstWithCoords.lat || firstWithCoords.latitude;
                            resolvedLng = firstWithCoords.lng || firstWithCoords.longitude;
                        }
                    }
                }
            }
            
            return {
                id: job.id,
                job_number: job.job_number,
                customerId: job.customer_id,
                customerName: job.customer_name || customerObj.name,
                mobile: customerObj.phone || customerObj.mobile || job.customer_phone || '',
                email: customerObj.email,
                address: propData.address || '',
                locality: propData.locality || propData.city || '',
                city: propData.city || '',
                pincode: propData.pincode || '',
                description: job.description || '',
                thumbnail: job.thumbnail || null,
                location: {
                    lat: resolvedLat ? Number(resolvedLat) : null,
                    lng: resolvedLng ? Number(resolvedLng) : null
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
                priority_note: job.priority_note || '',
                status: job.status || 'new_job_request',
                assignedTo: job.technician_id,
                assignedAt: job.created_at,
                dueDate: job.scheduled_date || job.due_date,
                confirmedVisitTime: job.scheduled_time || job.confirmed_visit_time,
                startedAt: job.started_at,
                completedAt: job.completed_at,
                createdAt: job.created_at,
                notes: job.notes,
                arrived_at: job.arrived_at,
                quotations: job.quotations || [],
                sales_invoices: job.sales_invoices || []
            };
        })

        return NextResponse.json({
            success: true,
            jobs: transformedJobs,
            count: transformedJobs.length
        })

    } catch (error) {
        console.error('Error in technician jobs API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
