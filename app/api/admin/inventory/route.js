import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET - Fetch all inventory items
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')
        const lowStock = searchParams.get('low_stock')

        let query = supabase
            .from('inventory')
            .select('*')
            .order('name', { ascending: true })

        if (category) {
            query = query.eq('category', category)
        }
        if (lowStock === 'true') {
            // Updated to handle both column names if needed, but current_stock is the new standard
            query = query.or('current_stock.lt.min_stock_level,quantity.lt.reorder_level')
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// POST - Create new inventory item
export async function POST(request) {
    try {
        const body = await request.json()

        const { data, error } = await supabase
            .from('inventory')
            .insert([body])
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PUT - Update inventory item
export async function PUT(request) {
    try {
        const body = await request.json()
        const { id, ...updates } = body

        const { data, error } = await supabase
            .from('inventory')
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

// DELETE - Delete inventory item
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        const { error } = await supabase
            .from('inventory')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
