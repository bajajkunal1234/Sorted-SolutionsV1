import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
    const supabase = createServerSupabase()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    try {
        let query = supabase
            .from('technicians')
            .select('id, name, phone, is_active, created_at, photo_url, rating, years_experience, bio, specializations, customer_card_fields, ledger_id')
            .order('name', { ascending: true })

        if (id) query = query.eq('id', id).single()

        const { data, error } = await query
        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}

export async function PATCH(request) {
    const supabase = createServerSupabase()
    try {
        const body = await request.json()
        const { id, ...updates } = body

        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

        delete updates.password_hash
        delete updates.username

        const { data, error } = await supabase
            .from('technicians')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select('id, name, phone, is_active, photo_url, rating, years_experience, bio, specializations, customer_card_fields, ledger_id')
            .single()

        if (error) throw error
        return NextResponse.json({ success: true, data })
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}
