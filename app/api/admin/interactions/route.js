import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// POST - Create new interaction/note
export async function POST(request) {
    try {
        const body = await request.json()

        const { data, error } = await supabase
            .from('interactions')
            .insert([body])
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
