import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { logInteractionServer } from '@/lib/log-interaction-server'
import { fireNotification } from '@/lib/fire-notification'

// Map transaction types to Supabase tables
const tableMap = {
    'sales': 'sales_invoices',
    'purchase': 'purchase_invoices',
    'quotation': 'quotations',
    'receipt': 'receipt_vouchers',
    'payment': 'payment_vouchers'
};

// Interaction type maps
const createdInteractionMap = {
    sales: { type: 'sales-invoice-created', category: 'sales', label: 'Sales Invoice' },
    purchase: { type: 'purchase-invoice-created', category: 'sales', label: 'Purchase Invoice' },
    quotation: { type: 'quotation-sent', category: 'sales', label: 'Quotation' },
    receipt: { type: 'receipt-voucher-created', category: 'sales', label: 'Receipt Voucher' },
    payment: { type: 'payment-voucher-created', category: 'sales', label: 'Payment Voucher' },
};

const editedInteractionMap = {
    sales: { type: 'sales-invoice-edited', category: 'sales', label: 'Sales Invoice' },
    purchase: { type: 'purchase-invoice-edited', category: 'sales', label: 'Purchase Invoice' },
    quotation: { type: 'quotation-edited', category: 'sales', label: 'Quotation' },
    receipt: { type: 'receipt-voucher-edited', category: 'sales', label: 'Receipt Voucher' },
    payment: { type: 'payment-voucher-edited', category: 'sales', label: 'Payment Voucher' },
};

// GET - Fetch transactions based on type
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // sales, purchase, quotation, receipt, payment, all
        const customerId = searchParams.get('customer_id')
        const accountId = searchParams.get('account_id')
        const startDate = searchParams.get('start_date')
        const endDate = searchParams.get('end_date')
        const jobId = searchParams.get('job_id')

        if (!type) {
            return NextResponse.json({ success: false, error: 'Missing type' }, { status: 400 });
        }

        if (type === 'all') {
            const tables = ['sales_invoices', 'purchase_invoices', 'receipt_vouchers', 'payment_vouchers'];
            const results = await Promise.all(tables.map(async (table) => {
                let query = supabase.from(table).select('*')
                if (accountId) query = query.eq('account_id', accountId)
                if (startDate) query = query.gte('date', startDate)
                if (endDate) query = query.lte('date', endDate)
                const { data } = await query.limit(100)
                return (data || []).map(item => ({ ...item, type: table.split('_')[0] }))
            }));

            const merged = results.flat().sort((a, b) => new Date(b.date) - new Date(a.date))
            return NextResponse.json({ success: true, data: merged })
        }

        if (!tableMap[type]) {
            return NextResponse.json({ success: false, error: 'Invalid transaction type' }, { status: 400 });
        }

        const tableName = tableMap[type];

        let query = supabase
            .from(tableName)
            .select('*')
            .order('date', { ascending: false })
            .limit(100)

        if (customerId) query = query.eq('account_id', customerId)
        if (accountId) query = query.eq('account_id', accountId)
        if (startDate) query = query.gte('date', startDate)
        if (endDate) query = query.lte('date', endDate)
        if (jobId) query = query.eq('job_id', jobId)

        const includeArchived = searchParams.get('include_archived') === '1' || searchParams.get('include_archived') === 'true';
        if (!includeArchived) query = query.neq('status', 'archived');

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// POST - Create new transaction
export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type')
        const body = await request.json()

        if (!type || !tableMap[type]) {
            return NextResponse.json({ success: false, error: 'Invalid or missing transaction type' }, { status: 400 });
        }

        const tableName = tableMap[type];

        // ── Definitive per-table column allowlists (derived from actual schema) ──
        // Only columns that actually exist in each table are kept.
        const tableColumns = {
            sales:    ['invoice_number','reference','account_id','account_name','date','items','billing_address','shipping_address','subtotal','discount','cgst','sgst','igst','total_tax','total_amount','status','notes','terms','job_id'],
            purchase: ['invoice_number','vendor_invoice_number','po_reference','reference','account_id','account_name','date','items','billing_address','subtotal','discount','cgst','sgst','igst','total_tax','total_amount','status','notes','category','job_id'],
            quotation:['quote_number','reference','account_id','account_name','date','items','billing_address','shipping_address','subtotal','discount','cgst','sgst','igst','total_tax','total_amount','status','notes','terms','valid_until','job_id'],
            receipt:  ['receipt_number','reference','account_id','account_name','date','amount','payment_mode','notes','status','job_id'],
            payment:  ['payment_number','reference','account_id','account_name','date','amount','payment_mode','notes','status','job_id'],
        };

        const allowedCols = tableColumns[type];
        const payload = {};
        if (allowedCols) {
            allowedCols.forEach(col => { if (body[col] !== undefined) payload[col] = body[col]; });
        } else {
            // Unknown type — fall through with minimal strip
            Object.assign(payload, body);
            delete payload.__formType;
        }

        const { data, error } = await supabase
            .from(tableName)
            .insert([payload])
            .select()
            .single()

        if (error) throw error

        // ── Save invoice allocations (many-to-many) ──────────────────────────
        const allocations = body.allocations || [];
        if (allocations.length > 0 && (type === 'receipt' || type === 'payment')) {
            const allocationTable = type === 'receipt'
                ? 'receipt_voucher_allocations'
                : 'payment_voucher_allocations';
            const voucherIdField = type === 'receipt' ? 'receipt_voucher_id' : 'payment_voucher_id';
            const invoiceIdField = type === 'receipt' ? 'invoice_id' : 'purchase_invoice_id';

            const allocationRows = allocations
                .filter(a => a.invoice_id && parseFloat(a.amount_applied) > 0)
                .map(a => ({
                    [voucherIdField]: data.id,
                    [invoiceIdField]: a.invoice_id,
                    amount_applied: parseFloat(a.amount_applied),
                    ...(type === 'payment' ? { purchase_invoice_ref: a.invoice_ref } : {}),
                }));

            if (allocationRows.length > 0) {
                await supabase.from(allocationTable).insert(allocationRows);

                // Update paid_amount on each referenced sales invoice
                if (type === 'receipt') {
                    for (const alloc of allocationRows) {
                        const { data: invData } = await supabase
                            .from('sales_invoices')
                            .select('paid_amount, total_amount')
                            .eq('id', alloc.invoice_id)
                            .single();
                        if (invData) {
                            const newPaid = (parseFloat(invData.paid_amount) || 0) + alloc.amount_applied;
                            const newStatus = newPaid >= (parseFloat(invData.total_amount) || 0) ? 'paid' : 'partial';
                            await supabase.from('sales_invoices')
                                .update({ paid_amount: newPaid, status: newStatus })
                                .eq('id', alloc.invoice_id);
                        }
                    }
                }
            }
        }

        // Log interaction
        const info = createdInteractionMap[type];
        if (info) {
            logInteractionServer({
                type: info.type,
                category: info.category,
                invoiceId: data.reference || data.invoice_number || String(data.id),
                customerId: data.account_id ? String(data.account_id) : null,
                customerName: data.account_name || null,
                performedByName: body.created_by || 'Admin',
                description: `${info.label} created: ${data.reference || data.invoice_number || data.id}`,
                source: 'Admin',
            });
        }

        // Fire in-app + push notification for customer-facing document types
        const notifEventMap = {
            sales:     'sales_invoice_created',
            quotation: 'quotation_sent',
        };
        const notifEvent = notifEventMap[type];
        if (notifEvent && data.account_id) {
            await fireNotification(notifEvent, {
                job_id: data.job_id ? String(data.job_id) : undefined,
                customer_id: String(data.account_id),
                customer_name: data.account_name || undefined,
            }).catch(err => console.error(`[transactions/${type}/fireNotification]:`, err.message));
        }

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
        const { id, ...rawUpdates } = body

        if (!type || !tableMap[type]) {
            return NextResponse.json({ success: false, error: 'Invalid or missing transaction type' }, { status: 400 });
        }

        const tableName = tableMap[type];

        // ── Same column allowlist as POST — strip any computed/UI-only fields ──
        const tableColumns = {
            sales:    ['invoice_number','reference','account_id','account_name','date','items','billing_address','shipping_address','subtotal','discount','cgst','sgst','igst','total_tax','total_amount','paid_amount','status','notes','terms','job_id'],
            purchase: ['invoice_number','vendor_invoice_number','po_reference','reference','account_id','account_name','date','items','billing_address','subtotal','discount','cgst','sgst','igst','total_tax','total_amount','status','notes','category','job_id'],
            quotation:['quote_number','reference','account_id','account_name','date','items','billing_address','shipping_address','subtotal','discount','cgst','sgst','igst','total_tax','total_amount','status','notes','terms','valid_until','job_id'],
            receipt:  ['receipt_number','reference','account_id','account_name','date','amount','payment_mode','notes','status','job_id'],
            payment:  ['payment_number','reference','account_id','account_name','date','amount','payment_mode','notes','status','job_id'],
        };

        const allowedCols = tableColumns[type];
        const updates = {};
        if (allowedCols) {
            allowedCols.forEach(col => { if (rawUpdates[col] !== undefined) updates[col] = rawUpdates[col]; });
        } else {
            Object.assign(updates, rawUpdates);
        }

        const { data, error } = await supabase
            .from(tableName)
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        // Log interaction
        const info = editedInteractionMap[type];
        if (info) {
            logInteractionServer({
                type: info.type,
                category: info.category,
                invoiceId: data.reference || data.invoice_number || String(id),
                customerId: data.account_id ? String(data.account_id) : null,
                customerName: data.account_name || null,
                performedByName: body.updated_by || 'Admin',
                description: `${info.label} edited: ${data.reference || data.invoice_number || id}`,
                source: 'Admin',
            });
        }

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
