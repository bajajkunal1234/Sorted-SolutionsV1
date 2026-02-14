import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request, { params }) {
    try {
        const { id } = params
        const { notes, resolution, amount } = await request.json()
        // Update job status to completed
        const { data: job, error } = await supabase
            .from('jobs')
            .update({
                status: 'completed',
                stage: 'completed',
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                notes: notes || null,
                resolution: resolution || null,
                amount: amount || 0
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error completing job:', error)
            return NextResponse.json(
                { error: 'Failed to complete job' },
                { status: 500 }
            )
        }

        // Log interaction
        await supabase
            .from('interactions')
            .insert({
                job_id: id,
                customer_id: job.customer_id,
                type: 'job_completed',
                description: `Job completed. ${resolution || ''}`,
                created_by: job.assigned_to,
                created_at: new Date().toISOString()
            })

        return NextResponse.json({
            success: true,
            job,
            message: 'Job completed successfully'
        })

    } catch (error) {
        console.error('Error in complete job API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
