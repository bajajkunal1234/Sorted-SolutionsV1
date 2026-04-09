import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

/**
 * GET  /api/admin/account-views
 * POST /api/admin/account-views  { views }   ← full array of named account views
 *
 * Stores an array of named view configs in website_settings.
 * Schema example:
 * [
 *   { id: "v1", name: "Sales by Month", isDefault: true, tab: "sales",
 *     config: { sortBy, sortOrder, groupBy, filters, columnWidths, viewType } },
 *   ...
 * ]
 */

const KEY = 'admin_accounts_views'

export async function GET() {
    try {
        const supabase = createServerSupabase()
        const { data, error } = await supabase
            .from('website_settings')
            .select('value')
            .eq('key', KEY)
            .single()

        if (error && error.code === 'PGRST116') {
            return NextResponse.json({ success: true, data: [] })
        }
        if (error) throw error

        return NextResponse.json({ success: true, data: data?.value ?? [] })
    } catch (error) {
        console.error('[admin account-views GET]', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function POST(request) {
    try {
        const body = await request.json()
        const { views } = body   // full updated array

        if (!Array.isArray(views)) {
            return NextResponse.json({ success: false, error: 'views must be an array' }, { status: 400 })
        }

        const supabase = createServerSupabase()
        const { data, error } = await supabase
            .from('website_settings')
            .upsert(
                {
                    key: KEY,
                    value: views,
                    description: 'Admin saved accounts-tab views',
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'key' }
            )
            .select()
            .single()

        if (error) throw error
        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('[admin account-views POST]', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
