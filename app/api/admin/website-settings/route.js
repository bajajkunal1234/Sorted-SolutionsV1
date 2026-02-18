import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET - Fetch settings
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const key = searchParams.get('key')

        let query = supabase.from('website_settings').select('*')

        if (key) {
            query = query.eq('key', key).single()
        }

        const { data, error } = await query
        if (error && error.code !== 'PGRST116') throw error // Ignore "not found" for specific key

        return NextResponse.json({ success: true, data: data || (key ? null : []) })
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json({
            success: true,
            data: (new URL(request.url)).searchParams.get('key') ? null : [],
            message: `Fallback due to missing table: ${error.message}`
        })
    }
}

// POST/PUT - Save settings
export async function POST(request) {
    try {
        const body = await request.json()
        const { key, value, description } = body

        if (!key) {
            return NextResponse.json({ success: false, error: 'Key is required' }, { status: 400 })
        }

        // Upsert based on key
        const { data, error } = await supabase
            .from('website_settings')
            .upsert({ key, value, description, updated_at: new Date().toISOString() }, { onConflict: 'key' })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
