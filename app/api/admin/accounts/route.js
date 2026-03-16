import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { logInteractionServer } from '@/lib/log-interaction-server'

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

        // ── Generate SKU server-side to prevent client race conditions ──────────
        if (!body.sku || body.sku === '') {
            // Determine prefix from under/type
            let prefix = 'A'
            const under = (body.under || '').toLowerCase()
            const type  = (body.type  || '').toLowerCase()
            if (under.includes('customer') || under.includes('debtor') || type === 'customer') prefix = 'C'
            else if (under.includes('supplier') || under.includes('creditor') || type === 'supplier') prefix = 'S'
            else if (under.includes('bank')) prefix = 'B'
            else if (under.includes('fixed')) prefix = 'FA'
            else if (under.includes('technician') || type === 'technician') prefix = 'T'

            // Find max existing SKU number with this prefix
            const { data: existing } = await supabase
                .from('accounts')
                .select('sku')
                .like('sku', `${prefix}%`)
            
            const maxNum = (existing || []).reduce((max, acc) => {
                const n = parseInt((acc.sku || '').replace(prefix, '')) || 0
                return n > max ? n : max
            }, 100)

            body.sku = `${prefix}${maxNum + 1}`
        }

        // ── Stamp the origin so it shows in the 'Created By' column ──────────
        body.source = body.source || 'admin';

        const { data, error } = await supabase
            .from('accounts')
            .insert([body])
            .select()
            .single()

        if (error) throw error

        // Sync with customers/technicians tables
        const isCustomer = body.type === 'customer' ||
            (body.under_name || '').toLowerCase().includes('customer') ||
            (body.under_name || '').toLowerCase().includes('debtor');

        const isTechnician = body.type === 'technician' ||
            (body.under_name || '').toLowerCase().includes('technician') ||
            (body.under_name || '').toLowerCase().includes('creditor');

        if (isCustomer) {
            await supabase.from('customers').upsert({
                name: body.name,
                phone: body.mobile || '',
                email: body.email || '',
                gstin: body.gstin || '',
                address: body.mailing_address || {},
                properties: body.properties || [],
                ledger_id: data.id
            }, { onConflict: 'ledger_id' });
        } else if (isTechnician) {
            await supabase.from('technicians').upsert({
                name: body.name,
                phone: body.mobile || '',
                email: body.email || '',
                ledger_id: data.id,
                status: 'available'
            }, { onConflict: 'ledger_id' });
        }

        // ── Rich creation log ──────────────────────────────────────────────
        const creationDetails = [
            `SKU: ${data.sku}`,
            `Type: ${body.type || 'N/A'}`,
            body.mobile   ? `Phone: ${body.mobile}`   : null,
            body.email    ? `Email: ${body.email}`     : null,
            body.gstin    ? `GSTIN: ${body.gstin}`     : null,
            body.status   ? `Status: ${body.status}`   : null,
        ].filter(Boolean).join(' · ');

        logInteractionServer({
            type: 'account-created',
            category: 'account',
            customerId: data.id,
            customerName: data.name,
            performedByName: 'Admin',
            description: `Account created — ${data.name} · ${creationDetails}`,
            source: 'Admin App'
        });

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

        // Fetch the current state BEFORE updating so we can diff it
        const { data: before } = await supabase
            .from('accounts')
            .select('*')
            .eq('id', id)
            .single()

        const { data, error } = await supabase
            .from('accounts')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        // Sync with customers/technicians tables
        const isCustomer = (updates.type === 'customer' || data.type === 'customer') ||
            ((updates.under_name || data.under_name || '').toLowerCase().includes('customer')) ||
            ((updates.under_name || data.under_name || '').toLowerCase().includes('debtor'));

        const isTechnician = (updates.type === 'technician' || data.type === 'technician') ||
            ((updates.under_name || data.under_name || '').toLowerCase().includes('technician')) ||
            ((updates.under_name || data.under_name || '').toLowerCase().includes('creditor'));

        if (isCustomer) {
            await supabase.from('customers').upsert({
                name: updates.name || data.name,
                phone: updates.mobile || data.mobile,
                email: updates.email || data.email,
                gstin: updates.gstin || data.gstin,
                address: updates.mailing_address || data.mailing_address,
                properties: updates.properties || data.properties,
                ledger_id: id
            }, { onConflict: 'ledger_id' });
        } else if (isTechnician) {
            await supabase.from('technicians').upsert({
                name: updates.name || data.name,
                phone: updates.mobile || data.mobile,
                email: updates.email || data.email,
                ledger_id: id,
                status: 'available'
            }, { onConflict: 'ledger_id' });
        }

        // ── Build a per-field diff log ─────────────────────────────────────
        const TRACKED_FIELDS = {
            name:            'Name',
            mobile:          'Phone',
            email:           'Email',
            status:          'Status',
            type:            'Type',
            gstin:           'GSTIN',
            pan:             'PAN',
            credit_limit:    'Credit Limit',
            credit_period:   'Credit Period',
            opening_balance: 'Opening Balance',
            balance_type:    'Balance Type',
            under:           'Group',
            mailing_address: 'Address',
        };

        const changed = [];
        if (before) {
            Object.entries(TRACKED_FIELDS).forEach(([field, label]) => {
                const oldVal = before[field];
                const newVal = updates[field];
                if (newVal !== undefined) {
                    const oldStr = typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal ?? '');
                    const newStr = typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal ?? '');
                    if (oldStr !== newStr) {
                        changed.push(`${label}: "${oldStr}" → "${newStr}"`);
                    }
                }
            });
        }

        const diffSummary = changed.length > 0
            ? `Changed: ${changed.join(' | ')}`
            : 'No tracked fields changed (internal fields updated)';

        logInteractionServer({
            type: 'account-edited',
            category: 'account',
            customerId: id,
            customerName: data.name,
            performedByName: 'Admin',
            description: `Account edited — ${data.name} (${data.sku || ''}) · ${diffSummary}`,
            source: 'Admin App'
        });

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

        // Check ALL dependencies in parallel
        const [
            technicianRows,
            jobRows,
            salesRows,
            purchaseRows,
            quotationRows,
            receiptRows,
            paymentRows,
        ] = await Promise.all([
            supabase.from('technicians').select('id, name').eq('ledger_id', id),
            supabase.from('jobs').select('id, job_number').eq('customer_id', id).limit(5),
            supabase.from('sales_invoices').select('id, invoice_number').eq('account_id', id).limit(5),
            supabase.from('purchase_invoices').select('id, invoice_number').eq('account_id', id).limit(5),
            supabase.from('quotations').select('id, quote_number').eq('account_id', id).limit(5),
            supabase.from('receipt_vouchers').select('id, receipt_number').eq('account_id', id).limit(5),
            supabase.from('payment_vouchers').select('id, payment_number').eq('account_id', id).limit(5),
        ])

        // Build a clear dependency list
        const blocking = []

        if (technicianRows.data?.length > 0) {
            blocking.push({
                type: 'Technician Profile',
                records: technicianRows.data.map(r => r.name),
            })
        }
        if (jobRows.data?.length > 0) {
            blocking.push({
                type: 'Jobs',
                records: jobRows.data.map(r => r.job_number || r.id),
            })
        }
        if (salesRows.data?.length > 0) {
            blocking.push({
                type: 'Sales Invoices',
                records: salesRows.data.map(r => r.invoice_number || r.id),
                action: 'Delete or reassign these sales invoices under Accounts → Sales tab first.'
            })
        }
        if (purchaseRows.data?.length > 0) {
            blocking.push({
                type: 'Purchase Invoices',
                records: purchaseRows.data.map(r => r.invoice_number || r.id),
                action: 'Delete or reassign these purchase invoices under Accounts → Purchases tab first.'
            })
        }
        if (quotationRows.data?.length > 0) {
            blocking.push({
                type: 'Quotations',
                records: quotationRows.data.map(r => r.quote_number || r.id),
                action: 'Delete or reassign these quotations under Accounts → Quotations tab first.'
            })
        }
        if (receiptRows.data?.length > 0) {
            blocking.push({
                type: 'Receipt Vouchers',
                records: receiptRows.data.map(r => r.receipt_number || r.id),
                action: 'Delete these receipts under Accounts → Receipts tab first.'
            })
        }
        if (paymentRows.data?.length > 0) {
            blocking.push({
                type: 'Payment Vouchers',
                records: paymentRows.data.map(r => r.payment_number || r.id),
                action: 'Delete these payments under Accounts → Payments tab first.'
            })
        }

        if (blocking.length > 0) {
            const summary = blocking
                .map(b => `${b.records.length} ${b.type}`)
                .join(', ')

            return NextResponse.json({
                success: false,
                error: `Cannot delete — this account has active dependencies: ${summary}`,
                blocking,
            }, { status: 400 })
        }

        // No dependencies — safe to delete. Capture account details BEFORE deletion.
        const { data: accountToDelete } = await supabase
            .from('accounts')
            .select('name, sku, mobile, type, email')
            .eq('id', id)
            .single()

        // ── Log deletion BEFORE removing the record ────────────────────────
        logInteractionServer({
            type: 'account-deleted',
            category: 'account',
            customerId: id,
            customerName: accountToDelete?.name || id,
            performedByName: 'Admin',
            description: `Account deleted — ${accountToDelete?.name || 'Unknown'} (SKU: ${accountToDelete?.sku || 'N/A'}, Type: ${accountToDelete?.type || 'N/A'}${accountToDelete?.mobile ? `, Phone: ${accountToDelete.mobile}` : ''})`,
            source: 'Admin App'
        });

        const { error } = await supabase
            .from('accounts')
            .delete()
            .eq('id', id)

        if (error) throw error

        // If this was a customer account, also remove from the customers table
        // so the phone number is freed up for future signups
        if (accountToDelete?.type === 'customer' && accountToDelete?.mobile) {
            const mobile = accountToDelete.mobile.replace(/\D/g, '').slice(-10)
            await supabase
                .from('customers')
                .delete()
                .or(`phone.eq.${mobile},phone.eq.+91${mobile}`)
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

