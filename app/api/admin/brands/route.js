import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET - Fetch all brands
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('brands')
            .select('*')
            .eq('active', true)
            .order('name', { ascending: true })

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// POST - Create new brand
export async function POST(request) {
    try {
        const body = await request.json()

        const { data, error } = await supabase
            .from('brands')
            .insert([body])
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
