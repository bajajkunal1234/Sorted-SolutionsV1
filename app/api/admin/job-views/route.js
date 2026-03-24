import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

/**
 * GET  /api/admin/job-views?key=admin_jobs_view
 * POST /api/admin/job-views  { key, view }
 *
 * Stores & retrieves saved job-tab view preferences.
 * Uses the website_settings table (key/value JSONB store) so
 * no schema migration is needed.
 *
 * Key naming conventions:
 *   admin_jobs_view          → shared admin view
 *   tech_jobs_view_<techId>  → per-technician view
 */

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const key = searchParams.get('key')

        if (!key) {
            return NextResponse.json({ success: false, error: 'key is required' }, { status: 400 })
        }

        const supabase = createServerSupabase()
        const { data, error } = await supabase
            .from('website_settings')
            .select('value')
            .eq('key', key)
            .single()

        if (error && error.code === 'PGRST116') {
            // Not found — return null, not an error
            return NextResponse.json({ success: true, data: null })
        }
        if (error) throw error

        return NextResponse.json({ success: true, data: data?.value ?? null })
    } catch (error) {
        console.error('[job-views GET]', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function POST(request) {
    try {
        const body = await request.json()
        const { key, view } = body

        if (!key || !view) {
            return NextResponse.json({ success: false, error: 'key and view are required' }, { status: 400 })
        }

        const supabase = createServerSupabase()
        const { data, error } = await supabase
            .from('website_settings')
            .upsert(
                {
                    key,
                    value: view,
                    description: `Saved Jobs Tab view for key: ${key}`,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'key' }
            )
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('[job-views POST]', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
