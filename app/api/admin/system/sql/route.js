import { getSupabaseServer } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request) {
    try {
        const { query } = await request.json()

        if (!query) {
            return NextResponse.json({ success: false, error: 'Query is required' }, { status: 400 })
        }

        const supabase = getSupabaseServer()
        if (!supabase) return NextResponse.json({ error: 'DB not available' }, { status: 503 })

        // Execute the RPC function
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: query })

        if (error) {
            console.error('SQL Execution Error:', error)
            return NextResponse.json({ success: false, error: error.message }, { status: 400 })
        }

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('Server Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
