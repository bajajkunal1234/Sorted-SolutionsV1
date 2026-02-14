import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// Map transaction types to Supabase tables
const tableMap = {
    'sales': 'sales_invoices',
    'purchase': 'purchase_invoices',
    'quotation': 'quotations',
    'receipt': 'receipt_vouchers',
    'payment': 'payment_vouchers'
};

// GET - Fetch transactions based on type
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // sales, purchase, quotation, receipt, payment
        const customerId = searchParams.get('customer_id')
        const accountId = searchParams.get('account_id')
        const startDate = searchParams.get('start_date')
        const endDate = searchParams.get('end_date')

        if (!type || !tableMap[type]) {
            return NextResponse.json({
                success: false,
                error: 'Invalid or missing transaction type. Must be one of: sales, purchase, quotation, receipt, payment'
            }, { status: 400 });
        }

        const tableName = tableMap[type];

        let query = supabase
            .from(tableName)
            .select('*')
            .order('date', { ascending: false })

        if (customerId) {
            // Note: In our schema, we use account_id for the ledger/customer link
            query = query.eq('account_id', customerId)
        }
        if (accountId) {
            query = query.eq('account_id', accountId)
        }
        if (startDate) {
            query = query.gte('date', startDate)
        }
        if (endDate) {
            query = query.lte('date', endDate)
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// POST - Create new transaction in specific table
export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type')
        const body = await request.json()

        if (!type || !tableMap[type]) {
            return NextResponse.json({ success: false, error: 'Invalid or missing transaction type' }, { status: 400 });
        }

        const tableName = tableMap[type];

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

// PUT - Update transaction
export async function PUT(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type')
        const body = await request.json()
        const { id, ...updates } = body

        if (!type || !tableMap[type]) {
            return NextResponse.json({ success: false, error: 'Invalid or missing transaction type' }, { status: 400 });
        }

        const tableName = tableMap[type];

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

// DELETE - Delete transaction
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type')
        const id = searchParams.get('id')

        if (!type || !tableMap[type]) {
            return NextResponse.json({ success: false, error: 'Invalid or missing transaction type' }, { status: 400 });
        }

        const tableName = tableMap[type];

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
