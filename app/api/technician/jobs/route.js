import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

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

        // Build query
        let query = supabase
            .from('jobs')
            .select(`
                *,
                customer:accounts(*),
                assigned_technician:technicians(id, name, phone)
            `)
            .eq('technician_id', technicianId)
            .order('created_at', { ascending: false })

        // Filter by status if provided
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

        const transformedJobs = jobs.map(job => {
            const propData = resolveProperty(job.property);
            const customerObj = job.customer || {};
            
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
                assignedAt: job.created_at,
                dueDate: job.scheduled_date || job.due_date,
                confirmedVisitTime: job.scheduled_time || job.confirmed_visit_time,
                startedAt: job.started_at,
                completedAt: job.completed_at,
                createdAt: job.created_at,
                notes: job.notes
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
