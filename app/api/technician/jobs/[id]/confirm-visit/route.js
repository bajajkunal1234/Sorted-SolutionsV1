import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request, { params }) {
    try {
        const { id } = params
        const { confirmedVisitTime } = await request.json()

        if (!confirmedVisitTime) {
            return NextResponse.json(
                { error: 'Confirmed visit time is required' },
                { status: 400 }
            )
        }

        // Update job status to confirmed
        const { data: job, error } = await supabase
            .from('jobs')
            .update({
                status: 'confirmed',
                confirmed_visit_time: confirmedVisitTime,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error confirming visit:', error)
            return NextResponse.json(
                { error: 'Failed to confirm visit' },
                { status: 500 }
            )
        }

        // Log interaction
        await supabase
            .from('interactions')
            .insert({
                job_id: id,
                customer_id: job.customer_id,
                type: 'visit_confirmed',
                description: `Visit confirmed for ${new Date(confirmedVisitTime).toLocaleString()}`,
                created_by: job.assigned_to,
                created_at: new Date().toISOString()
            })

        return NextResponse.json({
            success: true,
            job,
            message: 'Visit confirmed successfully'
        })

    } catch (error) {
        console.error('Error in confirm visit API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
