import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
    try {
        const { id } = params
        const { data: job, error } = await supabase
            .from('jobs')
            .select(`
                *,
                customer:customers(id, name, mobile, email),
                property:properties(id, address, locality, city, pincode, latitude, longitude),
                product:products(id, name, category),
                brand:brands(id, name),
                issue:issues(id, title, category, description),
                assigned_technician:technicians(id, name, mobile)
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

        // Transform data
        const transformedJob = {
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
            issueDescription: job.issue?.description,
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
            notes: job.notes,
            internalNotes: job.internal_notes
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

export async function PATCH(request, { params }) {
    try {
        const { id } = params
        const updates = await request.json()
        // Update job
        const { data: job, error } = await supabase
            .from('jobs')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating job:', error)
            return NextResponse.json(
                { error: 'Failed to update job' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            job,
            message: 'Job updated successfully'
        })

    } catch (error) {
        console.error('Error in job update API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
