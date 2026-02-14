import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request, { params }) {
    try {
        const { id } = params
        // Update job status to in-progress
        const { data: job, error } = await supabase
            .from('jobs')
            .update({
                status: 'in-progress',
                stage: 'started',
                started_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error starting job:', error)
            return NextResponse.json(
                { error: 'Failed to start job' },
                { status: 500 }
            )
        }

        // Log interaction
        await supabase
            .from('interactions')
            .insert({
                job_id: id,
                customer_id: job.customer_id,
                type: 'job_started',
                description: 'Technician started working on the job',
                created_by: job.assigned_to,
                created_at: new Date().toISOString()
            })

        return NextResponse.json({
            success: true,
            job,
            message: 'Job started successfully'
        })

    } catch (error) {
        console.error('Error in start job API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
