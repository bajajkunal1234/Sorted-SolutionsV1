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
                property:properties(id, address, locality, city, pincode),
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
            customerId: job.customer_id,
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
            issueDescription: job.issue?.description,
            issueCategory: job.issue?.category,
            priority: job.priority,
            status: job.status,
            stage: job.stage,
            assignedTechnician: job.assigned_technician?.name,
            technicianMobile: job.assigned_technician?.mobile,
            dueDate: job.due_date,
            confirmedVisitTime: job.confirmed_visit_time,
            startedAt: job.started_at,
            completedAt: job.completed_at,
            createdAt: job.created_at,
            notes: job.notes,
            warrantyStatus: job.warranty_status
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
        const { action, customerId } = await request.json()

        // Only allow cancellation for now
        if (action === 'cancel') {
            // Verify the job belongs to this customer
            const { data: job, error: fetchError } = await supabase
                .from('jobs')
                .select('customer_id, status')
                .eq('id', id)
                .single()

            if (fetchError || !job) {
                return NextResponse.json(
                    { error: 'Job not found' },
                    { status: 404 }
                )
            }

            if (job.customer_id !== customerId) {
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 403 }
                )
            }

            // Only allow cancellation if job is not completed
            if (job.status === 'completed') {
                return NextResponse.json(
                    { error: 'Cannot cancel completed job' },
                    { status: 400 }
                )
            }

            // Update job status
            const { data: updatedJob, error: updateError } = await supabase
                .from('jobs')
                .update({
                    status: 'cancelled',
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single()

            if (updateError) {
                console.error('Error cancelling job:', updateError)
                return NextResponse.json(
                    { error: 'Failed to cancel job' },
                    { status: 500 }
                )
            }

            // Log interaction
            await supabase
                .from('interactions')
                .insert({
                    job_id: id,
                    customer_id: customerId,
                    type: 'job_cancelled',
                    description: 'Customer cancelled the service request',
                    created_by: customerId,
                    created_at: new Date().toISOString()
                })

            return NextResponse.json({
                success: true,
                job: updatedJob,
                message: 'Job cancelled successfully'
            })
        }

        return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
        )

    } catch (error) {
        console.error('Error in job update API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
