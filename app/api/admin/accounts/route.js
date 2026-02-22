import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Fetch all accounts
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type')
        const id = searchParams.get('id')

        if (id) {
            const { data, error } = await supabase
                .from('accounts')
                .select('*')
                .eq('id', id)
                .single()
            if (error) throw error
            return NextResponse.json({ success: true, data })
        }

        let query = supabase
            .from('accounts')
            .select('*')
            .order('name', { ascending: true })
            .limit(200)

        if (type && type !== 'all') {
            query = query.eq('type', type)
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// POST - Create new account
export async function POST(request) {
    try {
        const body = await request.json()

        const { data, error } = await supabase
            .from('accounts')
            .insert([body])
            .select()
            .single()

        if (error) throw error

        // Sync with customers/technicians tables
        if (body.type === 'customer') {
            await supabase.from('customers').upsert({
                name: body.name,
                phone: body.mobile || '',
                email: body.email || '',
                gstin: body.gstin || '',
                address: body.mailing_address || {},
                properties: body.properties || [],
                ledger_id: data.id
            }, { onConflict: 'ledger_id' });
        } else if (body.type === 'technician') {
            await supabase.from('technicians').upsert({
                name: body.name,
                phone: body.mobile || '',
                email: body.email || '',
                ledger_id: data.id,
                status: 'available'
            }, { onConflict: 'ledger_id' });
        }

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PUT - Update account
export async function PUT(request) {
    try {
        const body = await request.json()
        const { id, ...updates } = body

        const { data, error } = await supabase
            .from('accounts')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        // Sync with customers/technicians tables
        if (updates.type === 'customer' || data.type === 'customer') {
            await supabase.from('customers').update({
                name: updates.name || data.name,
                phone: updates.mobile || data.mobile,
                email: updates.email || data.email,
                gstin: updates.gstin || data.gstin,
                address: updates.mailing_address || data.mailing_address,
                properties: updates.properties || data.properties
            }).eq('ledger_id', id);
        } else if (updates.type === 'technician' || data.type === 'technician') {
            await supabase.from('technicians').update({
                name: updates.name || data.name,
                phone: updates.mobile || data.mobile,
                email: updates.email || data.email
            }).eq('ledger_id', id);
        }

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// DELETE - Delete account
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ success: false, error: 'Account ID is required' }, { status: 400 })
        }

        // 1. Check for dependencies
        const dependencyChecks = [
            { table: 'sales_invoices', column: 'account_id', label: 'Sales Invoices' },
            { table: 'purchase_invoices', column: 'account_id', label: 'Purchase Invoices' },
            { table: 'quotations', column: 'account_id', label: 'Quotations' },
            { table: 'receipt_vouchers', column: 'account_id', label: 'Receipt Vouchers' },
            { table: 'payment_vouchers', column: 'account_id', label: 'Payment Vouchers' },
            { table: 'customers', column: 'ledger_id', label: 'Customers' },
            { table: 'technicians', column: 'ledger_id', label: 'Technicians' }
        ];

        for (const check of dependencyChecks) {
            const { count, error: checkError } = await supabase
                .from(check.table)
                .select('*', { count: 'exact', head: true })
                .eq(check.column, id);

            if (checkError) throw checkError;

            if (count > 0) {
                return NextResponse.json({
                    success: false,
                    error: `Cannot delete account because it is linked to ${count} ${check.label}. Please delete those records first.`
                }, { status: 400 });
            }
        }

        // 2. Perform deletion if no dependencies found
        const { error } = await supabase
            .from('accounts')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
