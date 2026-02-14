import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET - Fetch all products
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')

        let query = supabase
            .from('products')
            .select('*')
            .eq('active', true)
            .order('name', { ascending: true })

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

// POST - Create new product
export async function POST(request) {
    try {
        const body = await request.json()

        const { data, error } = await supabase
            .from('products')
            .insert([body])
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PUT - Update product
export async function PUT(request) {
    try {
        const body = await request.json()
        const { id, ...updates } = body

        const { data, error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
