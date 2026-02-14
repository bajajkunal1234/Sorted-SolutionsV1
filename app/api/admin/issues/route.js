import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET - Fetch all issues
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')

        let query = supabase
            .from('issues')
            .select('*')
            .order('title', { ascending: true })

        if (category) {
            query = query.eq('category', category)
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// POST - Create new issue
export async function POST(request) {
    try {
        const body = await request.json()

        const { data, error } = await supabase
            .from('issues')
            .insert([body])
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
