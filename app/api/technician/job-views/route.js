import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

/**
 * GET  /api/technician/job-views?technicianId=xxx
 * POST /api/technician/job-views  { technicianId, views }
 *
 * Stores an array of named view configs per technician.
 */

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const technicianId = searchParams.get('technicianId')

        if (!technicianId) {
            return NextResponse.json({ success: false, error: 'technicianId is required' }, { status: 400 })
        }

        const key = `tech_jobs_views_${technicianId}`
        const supabase = createServerSupabase()
        const { data, error } = await supabase
            .from('website_settings')
            .select('value')
            .eq('key', key)
            .single()

        if (error && error.code === 'PGRST116') {
            return NextResponse.json({ success: true, data: [] })
        }
        if (error) throw error

        return NextResponse.json({ success: true, data: data?.value ?? [] })
    } catch (error) {
        console.error('[tech job-views GET]', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function POST(request) {
    try {
        const body = await request.json()
        const { technicianId, views } = body

        if (!technicianId || !Array.isArray(views)) {
            return NextResponse.json({ success: false, error: 'technicianId and views array are required' }, { status: 400 })
        }

        const key = `tech_jobs_views_${technicianId}`
        const supabase = createServerSupabase()
        const { data, error } = await supabase
            .from('website_settings')
            .upsert(
                {
                    key,
                    value: views,
                    description: `Saved Jobs Tab views for technician: ${technicianId}`,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'key' }
            )
            .select()
            .single()

        if (error) throw error
        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('[tech job-views POST]', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
