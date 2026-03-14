import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET - Fetch template by type
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type')

        if (!type) {
            return NextResponse.json({ success: false, error: 'Type is required' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('agreement_templates')
            .select('*')
            .eq('type', type)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ success: true, data: null });
            }
            throw error;
        }

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PUT - Update or create template
export async function PUT(request) {
    try {
        const body = await request.json()
        const { type, content } = body

        if (!type || !content) {
            return NextResponse.json({ success: false, error: 'Type and content are required' }, { status: 400 })
        }

        // Upsert based on type
        const { data, error } = await supabase
            .from('agreement_templates')
            .upsert(
                { type, content, updated_at: new Date().toISOString() },
                { onConflict: 'type' }
            )
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
