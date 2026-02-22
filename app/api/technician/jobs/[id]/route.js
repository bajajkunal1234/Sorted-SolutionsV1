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

        // job.property is a JSONB blob stored on the job row
        const prop = job.property || {};
        const propAddress = prop.address && typeof prop.address === 'object'
            ? { address: prop.address.line1 || '', locality: prop.address.locality || '', city: prop.address.city || '' }
            : { address: typeof prop.address === 'string' ? prop.address : '', locality: prop.locality || '', city: prop.city || '' };

        // Transform data
        const transformedJob = {
            id: job.id,
            customerId: job.customer?.id,
            customerName: job.customer?.name,
            mobile: job.customer?.mobile,
            email: job.customer?.email,
            address: propAddress.address,
            locality: propAddress.locality,
            city: propAddress.city,
            location: {
                lat: prop.latitude || null,
                lng: prop.longitude || null
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
