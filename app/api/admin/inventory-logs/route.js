import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const inventoryId = searchParams.get('inventory_id')

        if (!inventoryId) {
            return NextResponse.json({ success: false, error: 'inventory_id is required' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('inventory_logs')
            .select('*')
            .eq('inventory_id', inventoryId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function POST(request) {
    try {
        const body = await request.json()

        const { data, error } = await supabase
            .from('inventory_logs')
            .insert([body])
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
