import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Fetch all jobs or filter by query params
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const customerId = searchParams.get('customer_id')
        const technicianId = searchParams.get('technician_id')

        let query = supabase
            .from('jobs')
            .select(`
                *,
                customer:customers(*),
                technician:technicians(*)
            `)
            .order('created_at', { ascending: false })

        if (status && status !== 'all') {
            query = query.eq('status', status)
        }
        if (customerId) {
            query = query.eq('customer_id', customerId)
        }
        if (technicianId) {
            query = query.eq('assigned_to', technicianId)
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// POST - Create new job
export async function POST(request) {
    try {
        const body = await request.json()

        const { data, error } = await supabase
            .from('jobs')
            .insert([body])
            .select()
            .single()

        if (error) throw error

        // Create initial interaction
        await supabase.from('job_interactions').insert([{
            job_id: data.id,
            type: 'created',
            message: `Job created by ${body.created_by || 'Admin'}`,
            user_name: body.created_by || 'Admin'
        }])

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PUT - Update job
export async function PUT(request) {
    try {
        const body = await request.json()
        const { id, ...updates } = body

        const { data, error } = await supabase
            .from('jobs')
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

// DELETE - Delete job
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        const { error } = await supabase
            .from('jobs')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
