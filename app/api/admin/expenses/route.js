import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const technicianId = searchParams.get('technician_id')
        const status = searchParams.get('status')

        let query = supabase
            .from('expenses')
            .select('*')
            .order('created_at', { ascending: false })

        if (technicianId) query = query.eq('technician_id', technicianId)
        if (status && status !== 'all') query = query.eq('status', status)

        const { data, error } = await query
        if (error) throw error

        return NextResponse.json({ success: true, expenses: data || [] })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function PATCH(request) {
    try {
        const { id, status, admin_notes } = await request.json()
        if (!id || !status) {
            return NextResponse.json({ error: 'id and status required' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('expenses')
            .update({
                status,
                admin_notes: admin_notes || null,
                reviewed_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return NextResponse.json({ success: true, expense: data })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
