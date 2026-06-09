import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

/**
 * GET  /api/admin/interaction-views
 * POST /api/admin/interaction-views  { views }   ← full array of named views
 */

const KEY = 'admin_interactions_views'

export async function GET() {
    try {
        const supabase = createServerSupabase()
        const { data, error } = await supabase
            .from('website_settings')
            .select('value')
            .eq('key', KEY)
            .single()

        if (error && error.code === 'PGRST116') {
            return NextResponse.json({ success: true, data: [] })
        }
        if (error) throw error

        return NextResponse.json({ success: true, data: data?.value ?? [] })
    } catch (error) {
        console.error('[admin interaction-views GET]', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function POST(request) {
    try {
        const body = await request.json()
        const { views } = body

        if (!Array.isArray(views)) {
            return NextResponse.json({ success: false, error: 'views must be an array' }, { status: 400 })
        }

        const supabase = createServerSupabase()
        const { data, error } = await supabase
            .from('website_settings')
            .upsert(
                {
                    key: KEY,
                    value: views,
                    description: 'Admin saved interactions-tab views',
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'key' }
            )
            .select()
            .single()

        if (error) throw error
        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('[admin interaction-views POST]', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
