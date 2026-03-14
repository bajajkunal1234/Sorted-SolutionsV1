import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET - Fetch print settings
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('print_settings')
            .select('*')
            .limit(1)
            .single()

        if (error) {
            // Return default settings if none exist
            return NextResponse.json({ success: true, data: null });
        }

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PUT - Update print settings
export async function PUT(request) {
    try {
        const body = await request.json()
        const { id, created_at, updated_at, ...updates } = body

        let result;
        if (id) {
            result = await supabase
                .from('print_settings')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single()
        } else {
            result = await supabase
                .from('print_settings')
                .insert([updates])
                .select()
                .single()
        }

        if (result.error) throw result.error

        return NextResponse.json({ success: true, data: result.data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
