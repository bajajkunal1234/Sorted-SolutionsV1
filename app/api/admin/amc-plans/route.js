import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET - Fetch all AMC plans
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const customerId = searchParams.get('customer_id')

        let query = supabase
            .from('amc_plans')
            .select(`
                *,
                customer:customers(*),
                product:products(*)
            `)
            .order('created_at', { ascending: false })

        if (status) {
            query = query.eq('status', status)
        }
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

// POST - Create new AMC plan
export async function POST(request) {
    try {
        const body = await request.json()

        const { data, error } = await supabase
            .from('amc_plans')
            .insert([body])
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PUT - Update AMC plan
export async function PUT(request) {
    try {
        const body = await request.json()
        const { id, ...updates } = body

        const { data, error } = await supabase
            .from('amc_plans')
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

// DELETE - Delete AMC plan
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        const { error } = await supabase
            .from('amc_plans')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
