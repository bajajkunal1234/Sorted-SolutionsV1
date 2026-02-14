import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET - Fetch properties for a customer
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const customerId = searchParams.get('customer_id')

        let query = supabase
            .from('properties')
            .select('*, customer:customers(*)')
            .order('created_at', { ascending: false })

        if (customerId) {
            query = query.eq('customer_id', customerId)
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// POST - Create new property
export async function POST(request) {
    try {
        const body = await request.json()

        const { data, error } = await supabase
            .from('properties')
            .insert([body])
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PUT - Update property
export async function PUT(request) {
    try {
        const body = await request.json()
        const { id, ...updates } = body

        const { data, error } = await supabase
            .from('properties')
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
