import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

/**
 * MIGRATION NOTE: The `customers` table has been merged into `accounts`.
 * This route now proxies to the `accounts` table, filtering for customer-type
 * accounts (under Sundry Debtors / Customers group).
 * The `ledger_id` resolver is no longer needed — jobs.customer_id = accounts.id directly.
 */

// GET - Fetch accounts that are customers (under Sundry Debtors / Customers group)
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search')
        // ledger_id param kept for backward compat — treated as account id lookup
        const ledgerId = searchParams.get('ledger_id')
        const accountId = searchParams.get('account_id') || ledgerId

        let query = supabase
            .from('accounts')
            .select('*')
            .or('under.ilike.%customer%,under_name.ilike.%customer%,under.ilike.%debtor%,under_name.ilike.%debtor%')
            .order('name', { ascending: true })

        if (search) {
            query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
        }
        if (accountId) {
            query = query.eq('id', accountId)
        }

        const { data, error } = await query
        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// POST - No longer needed (customers are created via accounts route)
// Kept as stub to avoid 404s from any legacy callers
export async function POST(request) {
    return NextResponse.json({
        success: false,
        error: 'Customers are now managed via /api/admin/accounts. Create an account under the Customers group instead.'
    }, { status: 410 })
}

export async function PUT(request) {
    // Proxy to accounts route
    try {
        const body = await request.json()
        const { id, ...updates } = body
        const { data, error } = await supabase.from('accounts').update(updates).eq('id', id).select().single()
        if (error) throw error
        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function DELETE(request) {
    // Proxy to accounts route
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const { error } = await supabase.from('accounts').delete().eq('id', id)
        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
