import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET - Fetch AMCs or plans
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // plans, active
        const customerId = searchParams.get('customer_id')
        const status = searchParams.get('status')

        if (type === 'plans') {
            const { data, error } = await supabase
                .from('amc_plans')
                .select('*')
                .eq('is_active', true)
                .order('name')
            if (error) throw error
            return NextResponse.json({ success: true, data })
        } else if (type === 'active') {
            let query = supabase
                .from('active_amcs')
                .select('*, amc_plans(name)')
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

// POST - Create or manage AMCs/plans
export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // plan, amc
        const body = await request.json()

        const tableName = type === 'plan' ? 'amc_plans' : 'active_amcs'

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

// PUT - Update AMCs/plans
export async function PUT(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // plan, amc
        const body = await request.json()
        const { id, ...updates } = body

        const tableName = type === 'plan' ? 'amc_plans' : 'active_amcs'

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

// DELETE - Remove AMC plan or active AMC
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // plan, amc
        const id = searchParams.get('id')

        if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 })

        const tableName = type === 'plan' ? 'amc_plans' : 'active_amcs'

        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
