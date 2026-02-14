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
                customer:customers(id, name, mobile, email),
                property:properties(id, address, locality, city, pincode, latitude, longitude),
                product:products(id, name, category),
                brand:brands(id, name),
                issue:issues(id, title, category),
                assigned_technician:technicians(id, name, mobile)
            `)
            .eq('assigned_to', technicianId)
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
        const transformedJobs = jobs.map(job => ({
            id: job.id,
            customerId: job.customer?.id,
            customerName: job.customer?.name,
            mobile: job.customer?.mobile,
            email: job.customer?.email,
            address: job.property?.address,
            locality: job.property?.locality,
            city: job.property?.city,
            location: {
                lat: job.property?.latitude,
                lng: job.property?.longitude
            },
            product: {
                type: job.product?.category,
                name: job.product?.name,
                brand: job.brand?.name,
                warranty: job.warranty_status
            },
            defect: job.issue?.title,
            issueCategory: job.issue?.category,
            priority: job.priority,
            status: job.status,
            stage: job.stage,
            assignedTo: job.assigned_to,
            assignedAt: job.assigned_at,
            dueDate: job.due_date,
            confirmedVisitTime: job.confirmed_visit_time,
            startedAt: job.started_at,
            completedAt: job.completed_at,
            createdAt: job.created_at,
            notes: job.notes
        }))

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
