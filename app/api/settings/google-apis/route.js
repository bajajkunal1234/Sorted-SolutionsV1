import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

const CONFIG_KEY = 'google_apis'

export async function GET() {
    try {
        const supabase = createServerSupabase()
        if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 })

        const { data, error } = await supabase
            .from('website_config')
            .select('value')
            .eq('key', CONFIG_KEY)
            .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, data: data?.value || {} })
    } catch (err) {
        console.error('[google-apis GET]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request) {
    try {
        const body = await request.json()
        const supabase = createServerSupabase()
        if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 })

        const { error } = await supabase
            .from('website_config')
            .upsert({ key: CONFIG_KEY, value: body, updated_at: new Date().toISOString() }, { onConflict: 'key' })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[google-apis POST]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
