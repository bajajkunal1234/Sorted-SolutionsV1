import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

/**
 * GET  /api/technician/job-views?technicianId=xxx
 * POST /api/technician/job-views  { technicianId, view }
 */

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const technicianId = searchParams.get('technicianId')

        if (!technicianId) {
            return NextResponse.json({ success: false, error: 'technicianId is required' }, { status: 400 })
        }

        const key = `tech_jobs_view_${technicianId}`
        const supabase = createServerSupabase()
        const { data, error } = await supabase
            .from('website_settings')
            .select('value')
            .eq('key', key)
            .single()

        if (error && error.code === 'PGRST116') {
            return NextResponse.json({ success: true, data: null })
        }
        if (error) throw error

        return NextResponse.json({ success: true, data: data?.value ?? null })
    } catch (error) {
        console.error('[tech job-views GET]', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function POST(request) {
    try {
        const body = await request.json()
        const { technicianId, view } = body

        if (!technicianId || !view) {
            return NextResponse.json({ success: false, error: 'technicianId and view are required' }, { status: 400 })
        }

        const key = `tech_jobs_view_${technicianId}`
        const supabase = createServerSupabase()
        const { data, error } = await supabase
            .from('website_settings')
            .upsert(
                {
                    key,
                    value: view,
                    description: `Saved Jobs Tab view for technician: ${technicianId}`,
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
