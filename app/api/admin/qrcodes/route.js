import { getSupabaseServer } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request) {
    try {
        const supabase = getSupabaseServer();
        const { data, error } = await supabase
            .from('qrcodes')
            .select('*')
            .order('priority', { ascending: true })
            .order('created_at', { ascending: false })

        if (error) {
            // gracefully return empty if table doesn't exist
            if (error.code === '42P01') {
                 return NextResponse.json({ success: true, data: [] })
            }
            throw error;
        }

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function POST(request) {
    try {
        const supabase = getSupabaseServer();
        const body = await request.json()
        const { data, error } = await supabase
            .from('qrcodes')
            .insert([body])
            .select()
            .single()

        if (error) throw error
        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function PUT(request) {
    try {
        const supabase = getSupabaseServer();
        const body = await request.json()
        const { id, ...updates } = body
        const { data, error } = await supabase
            .from('qrcodes')
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

export async function DELETE(request) {
    try {
        const supabase = getSupabaseServer();
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        const { error } = await supabase
            .from('qrcodes')
            .delete()
            .eq('id', id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
