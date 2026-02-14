import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const customerId = searchParams.get('customerId')
        const status = searchParams.get('status')

        if (!customerId) {
            return NextResponse.json(
                { error: 'Customer ID is required' },
                { status: 400 }
            )
        }

        // Build query
        let query = supabase
            .from('jobs')
            .select(`
                *,
                customer:customers(id, name, mobile, email),
                property:properties(id, address, locality, city, pincode),
                product:products(id, name, category),
                brand:brands(id, name),
                issue:issues(id, title, category),
                assigned_technician:technicians(id, name, mobile)
            `)
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false })

        // Filter by status if provided
        if (status && status !== 'all') {
            query = query.eq('status', status)
        }

        const { data: jobs, error } = await query

        if (error) {
            console.error('Error fetching customer jobs:', error)
            return NextResponse.json(
                { error: 'Failed to fetch jobs' },
                { status: 500 }
            )
        }

        // Transform data
        const transformedJobs = jobs.map(job => ({
            id: job.id,
            propertyId: job.property_id,
            address: job.property?.address,
            locality: job.property?.locality,
            city: job.property?.city,
            product: {
                type: job.product?.category,
                name: job.product?.name,
                brand: job.brand?.name
            },
            issue: job.issue?.title,
            issueCategory: job.issue?.category,
            priority: job.priority,
            status: job.status,
            stage: job.stage,
            assignedTechnician: job.assigned_technician?.name,
            technicianMobile: job.assigned_technician?.mobile,
            dueDate: job.due_date,
            confirmedVisitTime: job.confirmed_visit_time,
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
        console.error('Error in customer jobs API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function POST(request) {
    try {
        const jobData = await request.json()

        // Validate required fields
        if (!jobData.customer_id || !jobData.property_id || !jobData.product_id || !jobData.issue_id) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Create job
        const { data: job, error } = await supabase
            .from('jobs')
            .insert({
                customer_id: jobData.customer_id,
                property_id: jobData.property_id,
                product_id: jobData.product_id,
                brand_id: jobData.brand_id,
                issue_id: jobData.issue_id,
                priority: jobData.priority || 'normal',
                status: 'open',
                stage: 'new',
                warranty_status: jobData.warranty_status || 'unknown',
                preferred_date: jobData.preferred_date,
                preferred_time_slot: jobData.preferred_time_slot,
                notes: jobData.notes,
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating job:', error)
            return NextResponse.json(
                { error: 'Failed to create job' },
                { status: 500 }
            )
        }

        // Log interaction
        await supabase
            .from('interactions')
            .insert({
                job_id: job.id,
                customer_id: jobData.customer_id,
                type: 'job_created',
                description: 'Customer created a new service request',
                created_by: jobData.customer_id,
                created_at: new Date().toISOString()
            })

        return NextResponse.json({
            success: true,
            job,
            message: 'Service request created successfully'
        })

    } catch (error) {
        console.error('Error in job creation API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
