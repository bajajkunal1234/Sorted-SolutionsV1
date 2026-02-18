import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type')

        let query = supabase
            .from('print_templates')
            .select('*')
            .order('name', { ascending: true })

        if (type) {
            query = query.eq('type', type)
        }

        const { data, error } = await query

        if (error) {
            // Return empty list if table doesn't exist yet to prevent UI crash
            return NextResponse.json({ success: true, data: [] });
        }

        return NextResponse.json({ success: true, data: data || [] })
    } catch (error) {
        return NextResponse.json({ success: true, data: [] })
    }
}
