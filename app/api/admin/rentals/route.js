import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET - Fetch rentals or plans
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // plans, active
        const customerId = searchParams.get('customer_id')
        const status = searchParams.get('status')

        if (type === 'plans') {
            const { data, error } = await supabase
                .from('rental_plans')
                .select('*')
                .eq('is_active', true)
                .order('product_name')
            if (error) throw error
            return NextResponse.json({ success: true, data })
        } else if (type === 'active') {
            let query = supabase
                .from('active_rentals')
                .select('*, rental_plans(product_name), accounts(name)')
                .order('created_at', { ascending: false })

            if (customerId) query = query.eq('customer_id', customerId)
            if (status) query = query.eq('status', status)

            const { data, error } = await query
            if (error) throw error
            return NextResponse.json({ success: true, data })
        } else {
            return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 })
        }
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// POST - Create or manage rentals/plans
export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // plan, rental
        const body = await request.json()

        const tableName = type === 'plan' ? 'rental_plans' : 'active_rentals'

        const { data, error } = await supabase
            .from(tableName)
            .insert([body])
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PUT - Update rentals/plans
export async function PUT(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // plan, rental
        const body = await request.json()
        const { id, ...updates } = body

        const tableName = type === 'plan' ? 'rental_plans' : 'active_rentals'

        const { data, error } = await supabase
            .from(tableName)
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
