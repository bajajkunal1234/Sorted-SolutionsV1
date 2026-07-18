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

const isUUID = (val) => val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

/**
 * Syncs double-entry journal logs for a finalized transaction.
 * If status is 'draft' or 'cancelled', no journal is created (or existing is deleted).
 */
async function syncJournalEntry(type, txData) {
    if (!['sales', 'purchase', 'receipt', 'payment'].includes(type) || !txData.account_id) return;
    
    // Always delete any existing journals for this transaction to allow clean replacement/reversal
    await supabase.from('journal_entries').delete().eq('reference_id', txData.id);

    if (txData.status === 'draft' || txData.status === 'cancelled') return;

    const { data: accounts } = await supabase.from('accounts').select('id, name, under');
    const findAcc = (condition) => accounts?.find(condition) || null;

    const salesAcc = findAcc(a => (a.under?.toLowerCase().includes('income') || a.under?.toLowerCase().includes('sales')) && a.name?.toLowerCase().includes('sales'));
    const purchAcc = findAcc(a => (a.under?.toLowerCase().includes('expense') || a.under?.toLowerCase().includes('purchase')) && a.name?.toLowerCase().includes('purchase'));
    
    // Universal tax ledger resolution
    const cgstAcc = findAcc(a => a.under?.toLowerCase().includes('duties') && a.name?.toUpperCase().trim() === 'CGST') || findAcc(a => a.under?.toLowerCase().includes('duties') && a.name?.toUpperCase().includes('CGST'));
    const sgstAcc = findAcc(a => a.under?.toLowerCase().includes('duties') && a.name?.toUpperCase().trim() === 'SGST') || findAcc(a => a.under?.toLowerCase().includes('duties') && a.name?.toUpperCase().includes('SGST'));
    const igstAcc = findAcc(a => a.under?.toLowerCase().includes('duties') && a.name?.toUpperCase().trim() === 'IGST') || findAcc(a => a.under?.toLowerCase().includes('duties') && a.name?.toUpperCase().includes('IGST'));

    const bankAcc = findAcc(a => a.under?.toLowerCase().includes('bank')) || findAcc(a => a.under?.toLowerCase().includes('cash'));
    const cashAcc = findAcc(a => a.under?.toLowerCase().includes('cash'));

    let lines = [];
    const amt = (val) => parseFloat(val) || 0;

    if (type === 'sales') {
        const total = amt(txData.total_amount);
        const cgst = amt(txData.cgst);
        const sgst = amt(txData.sgst);
        const igst = amt(txData.igst);
        const base = total - cgst - sgst - igst;

        lines.push({ account_id: txData.account_id, debit: total, credit: 0 });
        if (salesAcc) lines.push({ account_id: salesAcc.id, debit: 0, credit: base });
        if (cgst > 0 && cgstAcc) lines.push({ account_id: cgstAcc.id, debit: 0, credit: cgst });
        if (sgst > 0 && sgstAcc) lines.push({ account_id: sgstAcc.id, debit: 0, credit: sgst });
        if (igst > 0 && igstAcc) lines.push({ account_id: igstAcc.id, debit: 0, credit: igst });
    } else if (type === 'purchase') {
        const total = amt(txData.total_amount);
        const cgst = amt(txData.cgst);
        const sgst = amt(txData.sgst);
        const igst = amt(txData.igst);
        const base = total - cgst - sgst - igst;

        let debitAcc = purchAcc;
        if (txData.category) {
            if (isUUID(txData.category)) {
                const catAcc = findAcc(a => a.id === txData.category);
                if (catAcc) debitAcc = catAcc;
            } else {
                const catAcc = findAcc(a => a.name?.toLowerCase().includes(txData.category.toLowerCase()) && (a.under?.toLowerCase().includes('expense') || a.under?.toLowerCase().includes('indirect')));
                if (catAcc) debitAcc = catAcc;
            }
        }

        let creditAccountId = txData.account_id;
        if (txData.paid_by === 'technician' && txData.po_reference) {
            const { data: tech } = await supabase.from('technicians').select('ledger_id').eq('id', txData.po_reference).maybeSingle();
            if (tech && tech.ledger_id) {
                creditAccountId = tech.ledger_id;
            }
        }

        if (debitAcc) lines.push({ account_id: debitAcc.id, debit: base, credit: 0 });
        if (cgst > 0 && cgstAcc) lines.push({ account_id: cgstAcc.id, debit: cgst, credit: 0 });
        if (sgst > 0 && sgstAcc) lines.push({ account_id: sgstAcc.id, debit: sgst, credit: 0 });
        if (igst > 0 && igstAcc) lines.push({ account_id: igstAcc.id, debit: igst, credit: 0 });
        if (creditAccountId) lines.push({ account_id: creditAccountId, debit: 0, credit: total });
    } else if (type === 'receipt') {
        const total = amt(txData.amount);
        const explicitAcc = txData.payment_account_id ? { id: txData.payment_account_id } : null;
        const recAcc = explicitAcc || (txData.payment_mode === 'cash' ? cashAcc : bankAcc);
        if (recAcc) lines.push({ account_id: recAcc.id, debit: total, credit: 0 });
        lines.push({ account_id: txData.account_id, debit: 0, credit: total });
    } else if (type === 'payment') {
        const total = amt(txData.amount);
        const explicitAcc = txData.payment_account_id ? { id: txData.payment_account_id } : null;
        const payAcc = explicitAcc || (txData.payment_mode === 'cash' ? cashAcc : bankAcc);
        lines.push({ account_id: txData.account_id, debit: total, credit: 0 });
        if (payAcc) lines.push({ account_id: payAcc.id, debit: 0, credit: total });
    }

    const totalD = lines.reduce((s, l) => s + l.debit, 0);
    const totalC = lines.reduce((s, l) => s + l.credit, 0);

    // If completely balanced, persist to DB
    if (Math.abs(totalD - totalC) < 0.01 && totalD > 0 && lines.every(l => !!l.account_id)) {
        const yy = new Date().getFullYear().toString().slice(-2);
        const { count } = await supabase.from('journal_entries').select('*', { count: 'exact', head: true });
        const entry_number = `JV-${yy}-${String((count || 0) + 1).padStart(4, '0')}`;
        
        const { data: jeData, error } = await supabase.from('journal_entries').insert([{
            entry_number, date: txData.date, reference_type: `${type}_invoice`, reference_id: txData.id, notes: `Auto-journal for ${type}`
        }]).select().single();

        if (jeData && !error) {
            const finalLines = lines.filter(l => l.debit > 0 || l.credit > 0).map(l => ({ ...l, journal_entry_id: jeData.id }));
            await supabase.from('journal_entry_lines').insert(finalLines);
        }
    }
}


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

        const isUUID = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

        if (customerId && !isUUID(customerId)) return NextResponse.json({ success: true, data: [] });
        if (accountId && !isUUID(accountId)) return NextResponse.json({ success: true, data: [] });
        if (jobId && !isUUID(jobId)) return NextResponse.json({ success: true, data: [] });

        if (!type) {
            return NextResponse.json({ success: false, error: 'Missing type' }, { status: 400 });
        }

        if (type === 'all') {
            const tables = ['sales_invoices', 'purchase_invoices', 'receipt_vouchers', 'payment_vouchers'];
            const results = await Promise.all(tables.map(async (table) => {
                const fkAlias = table === 'receipt_vouchers' ? 'accounts:accounts!receipt_vouchers_account_id_fkey(name, mobile, email, address, gstin)' : (table === 'payment_vouchers' ? 'accounts:accounts!payment_vouchers_account_id_fkey(name, mobile, email, address, gstin)' : 'accounts(name, mobile, email, address, gstin)');
                let query = supabase.from(table).select(`*, ${fkAlias}, jobs(job_number, technician_name)`)
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
        const fkAlias = tableName === 'receipt_vouchers' ? 'accounts:accounts!receipt_vouchers_account_id_fkey(name, mobile, email, address, gstin)' : (tableName === 'payment_vouchers' ? 'accounts:accounts!payment_vouchers_account_id_fkey(name, mobile, email, address, gstin)' : 'accounts(name, mobile, email, address, gstin)');

        let query = supabase
            .from(tableName)
            .select(`*, ${fkAlias}, jobs(job_number, technician_name)`)
            .order('date', { ascending: false })
            .limit(100)

        if (customerId) query = query.eq('account_id', customerId)
        if (accountId) query = query.eq('account_id', accountId)
        if (startDate) query = query.gte('date', startDate)
        if (endDate) query = query.lte('date', endDate)
        if (jobId) query = query.eq('job_id', jobId)

        const includeArchived = searchParams.get('include_archived') === '1' || searchParams.get('include_archived') === 'true';
        if (!includeArchived && type !== 'receipt' && type !== 'payment') {
            query = query.neq('status', 'archived');
        }

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
            sales:    ['invoice_number','reference','account_id','account_name','account_phone','account_mobile','account_email','account_gstin','account_state','account_address','date','items','billing_address','shipping_address','subtotal','discount','cgst','sgst','igst','total_tax','total_amount','items_subtotal','charges_total','status','notes','terms','job_id','technician_id','technician_name'],
            purchase: ['invoice_number','vendor_invoice_number','po_reference','reference','account_id','account_name','account_phone','account_email','date','items','billing_address','subtotal','discount','cgst','sgst','igst','total_tax','total_amount','status','notes','category','job_id','handed_to_service_center','paid_by'],
            quotation:['quote_number','reference','account_id','account_name','account_phone','account_mobile','account_email','account_gstin','account_state','account_address','date','items','billing_address','shipping_address','subtotal','discount','cgst','sgst','igst','total_tax','total_amount','status','notes','terms','valid_until','job_id','technician_id','technician_name'],
            receipt:  ['receipt_number','reference','reference_number','account_id','account_name','date','amount','payment_mode','payment_account_id','narration','job_id','status','source','created_by'],
            payment:  ['payment_number','reference','reference_number','account_id','account_name','date','amount','payment_mode','payment_account_id','narration','job_id','status','source','created_by'],
        };

        const allowedCols = tableColumns[type];
        const payload = {};
        if (allowedCols) {
            allowedCols.forEach(col => {
                if (body[col] !== undefined) {
                    payload[col] = body[col] === '' ? null : body[col];
                }
            });
        } else {
            // Unknown type — fall through with minimal strip
            Object.assign(payload, body);
            delete payload.__formType;
            Object.keys(payload).forEach(key => {
                if (payload[key] === '') payload[key] = null;
            });
        }

        // Auto-generate unique internal invoice number for purchase invoices if not sent
        if (type === 'purchase' && !payload.invoice_number) {
            payload.invoice_number = `PUR-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        }

        const { data, error } = await supabase
            .from(tableName)
            .insert([payload])
            .select()
            .single()

        if (error) throw error

        // ── AUTO-JOURNAL ──
        await syncJournalEntry(type, data);

        // ── Deduct Physical Stock for Technician ──
        if (type === 'sales' && data.technician_id && data.items && Array.isArray(data.items)) {
            try {
                for (const item of data.items) {
                    const prodId = item.productId || item.product_id;
                    const qty = Number(item.qty) || 1;
                    if (prodId) {
                        // Fetch current stock
                        const { data: currentStock } = await supabase
                            .from('technician_stock')
                            .select('quantity')
                            .eq('technician_id', data.technician_id)
                            .eq('product_id', prodId)
                            .maybeSingle();

                        const currentQty = currentStock ? currentStock.quantity : 0;
                        const newQty = currentQty - qty;

                        // Upsert new stock level
                        await supabase
                            .from('technician_stock')
                            .upsert({
                                technician_id: data.technician_id,
                                product_id: prodId,
                                quantity: newQty,
                                updated_at: new Date().toISOString()
                            }, {
                                onConflict: 'technician_id,product_id'
                            });

                        // Log transaction audit
                        await supabase
                            .from('technician_stock_transactions')
                            .insert({
                                technician_id: data.technician_id,
                                product_id: prodId,
                                quantity: -qty,
                                transaction_type: 'sale',
                                reference_id: data.id,
                                notes: `Consumed by sales invoice ${data.invoice_number} for job ${data.job_id || ''}`,
                                created_by: data.technician_name || 'System'
                            });
                    }
                }
            } catch (err) {
                console.error('[STOCK DEDUCTION ERROR]:', err);
            }
        }

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

                // Update paid_amount on each referenced sales or purchase invoice
                const invoiceTable = type === 'receipt' ? 'sales_invoices' : 'purchase_invoices';
                for (const alloc of allocationRows) {
                    const invId = type === 'receipt' ? alloc.invoice_id : alloc.purchase_invoice_id;
                    const { data: invData } = await supabase
                        .from(invoiceTable)
                        .select('paid_amount, total_amount')
                        .eq('id', invId)
                        .single();
                    if (invData) {
                        const newPaid = (parseFloat(invData.paid_amount) || 0) + alloc.amount_applied;
                        const newStatus = newPaid >= (parseFloat(invData.total_amount) || 0) ? 'paid' : 'partial';
                        await supabase.from(invoiceTable)
                            .update({ paid_amount: newPaid, status: newStatus })
                            .eq('id', invId);
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
            fireNotification(notifEvent, {
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
            sales:    ['invoice_number','reference','account_id','account_name','account_phone','account_mobile','account_email','account_gstin','account_state','account_address','date','items','billing_address','shipping_address','subtotal','discount','cgst','sgst','igst','total_tax','total_amount','items_subtotal','charges_total','paid_amount','status','notes','terms','job_id','technician_id','technician_name'],
            purchase: ['invoice_number','vendor_invoice_number','po_reference','reference','account_id','account_name','account_phone','account_email','date','items','billing_address','subtotal','discount','cgst','sgst','igst','total_tax','total_amount','status','notes','category','job_id','handed_to_service_center'],
            quotation:['quote_number','reference','account_id','account_name','account_phone','account_mobile','account_email','account_gstin','account_state','account_address','date','items','billing_address','shipping_address','subtotal','discount','cgst','sgst','igst','total_tax','total_amount','status','notes','terms','valid_until','job_id','technician_id','technician_name'],
            receipt:  ['receipt_number','reference','reference_number','account_id','account_name','date','amount','payment_mode','payment_account_id','narration','job_id','status','source','created_by'],
            payment:  ['payment_number','reference','reference_number','account_id','account_name','date','amount','payment_mode','payment_account_id','narration','job_id','status','source','created_by'],
        };

        const allowedCols = tableColumns[type];
        const updates = {};
        if (allowedCols) {
            allowedCols.forEach(col => {
                if (rawUpdates[col] !== undefined) {
                    updates[col] = rawUpdates[col] === '' ? null : rawUpdates[col];
                }
            });
        } else {
            Object.assign(updates, rawUpdates);
            Object.keys(updates).forEach(key => {
                if (updates[key] === '') updates[key] = null;
            });
        }

        const { data, error } = await supabase
            .from(tableName)
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        // ── AUTO-JOURNAL ──
        await syncJournalEntry(type, data);
        
        // ── Re-calculate Allocations (PUT) ──
        const allocations = body.allocations || [];
        if (type === 'receipt' || type === 'payment') {
            const allocationTable = type === 'receipt'
                ? 'receipt_voucher_allocations'
                : 'payment_voucher_allocations';
            const voucherIdField = type === 'receipt' ? 'receipt_voucher_id' : 'payment_voucher_id';
            const invoiceTable = type === 'receipt' ? 'sales_invoices' : 'purchase_invoices';
            const invoiceIdField = type === 'receipt' ? 'invoice_id' : 'purchase_invoice_id';

            // 1. Fetch existing allocations
            const { data: existingAllocs } = await supabase
                .from(allocationTable)
                .select('*')
                .eq(voucherIdField, id);

            // 2. Reverse existing allocations from invoice paid_amount
            if (existingAllocs && existingAllocs.length > 0) {
                for (const oldAlloc of existingAllocs) {
                    const invId = type === 'receipt' ? oldAlloc.invoice_id : oldAlloc.purchase_invoice_id;
                    const { data: invData } = await supabase
                        .from(invoiceTable)
                        .select('paid_amount, total_amount')
                        .eq('id', invId)
                        .single();
                        
                    if (invData) {
                        const reversedPaid = Math.max(0, (parseFloat(invData.paid_amount) || 0) - parseFloat(oldAlloc.amount_applied));
                        const reversedStatus = reversedPaid >= (parseFloat(invData.total_amount) || 0) ? 'paid' : (reversedPaid > 0 ? 'partial' : 'draft');
                        await supabase.from(invoiceTable).update({ paid_amount: reversedPaid, status: reversedStatus }).eq('id', invId);
                    }
                }
                // 3. Clear existing allocations in DB
                await supabase.from(allocationTable).delete().eq(voucherIdField, id);
            }

            // 4. Apply new allocations
            const allocationRows = allocations
                .filter(a => a.invoice_id && parseFloat(a.amount_applied) > 0)
                .map(a => ({
                    [voucherIdField]: id,
                    [invoiceIdField]: a.invoice_id,
                    amount_applied: parseFloat(a.amount_applied),
                    ...(type === 'payment' ? { purchase_invoice_ref: a.invoice_ref } : {}),
                }));

            if (allocationRows.length > 0) {
                await supabase.from(allocationTable).insert(allocationRows);

                // 5. Increment paid_amount on invoice
                for (const newAlloc of allocationRows) {
                    const invId = type === 'receipt' ? newAlloc.invoice_id : newAlloc.purchase_invoice_id;
                    const { data: invData } = await supabase
                        .from(invoiceTable)
                        .select('paid_amount, total_amount')
                        .eq('id', invId)
                        .single();
                        
                    if (invData) {
                        const newPaid = (parseFloat(invData.paid_amount) || 0) + newAlloc.amount_applied;
                        const newStatus = newPaid >= (parseFloat(invData.total_amount) || 0) ? 'paid' : 'partial';
                        await supabase.from(invoiceTable).update({ paid_amount: newPaid, status: newStatus }).eq('id', invId);
                    }
                }
            }
        }

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
        const jobId = searchParams.get('job_id')

        if (!type || !tableMap[type]) {
            return NextResponse.json({ success: false, error: 'Invalid or missing transaction type' }, { status: 400 });
        }

        const tableName = tableMap[type];

        const isUUID = (val) => val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
        
        let targetId = id;
        if (!isUUID(targetId)) {
            if (jobId && isUUID(jobId)) {
                const { data: record } = await supabase
                    .from(tableName)
                    .select('id')
                    .eq('job_id', jobId)
                    .maybeSingle();
                if (record) {
                    targetId = record.id;
                }
            }
        }

        if (!isUUID(targetId)) {
            return NextResponse.json({ success: false, error: `Invalid transaction ID: "${id || ''}"` }, { status: 400 });
        }

        // ── Reverse Allocations Before Deletion ──
        if (type === 'receipt' || type === 'payment') {
            const allocationTable = type === 'receipt' ? 'receipt_voucher_allocations' : 'payment_voucher_allocations';
            const voucherIdField = type === 'receipt' ? 'receipt_voucher_id' : 'payment_voucher_id';
            const invoiceTable = type === 'receipt' ? 'sales_invoices' : 'purchase_invoices';

            // 1. Fetch allocations to reverse
            const { data: existingAllocs } = await supabase
                .from(allocationTable)
                .select('*')
                .eq(voucherIdField, targetId);

            if (existingAllocs && existingAllocs.length > 0) {
                for (const oldAlloc of existingAllocs) {
                    const invId = type === 'receipt' ? oldAlloc.invoice_id : oldAlloc.purchase_invoice_id;
                    const { data: invData } = await supabase
                        .from(invoiceTable)
                        .select('paid_amount, total_amount')
                        .eq('id', invId)
                        .single();
                        
                    if (invData) {
                        const reversedPaid = Math.max(0, (parseFloat(invData.paid_amount) || 0) - parseFloat(oldAlloc.amount_applied));
                        const reversedStatus = reversedPaid >= (parseFloat(invData.total_amount) || 0) ? 'paid' : (reversedPaid > 0 ? 'partial' : 'draft');
                        await supabase.from(invoiceTable).update({ paid_amount: reversedPaid, status: reversedStatus }).eq('id', invId);
                    }
                }
            }
        }

        // ── Return Stock If Invoice is Deleted ──
        if (type === 'sales') {
            try {
                const { data: invoice } = await supabase
                    .from('sales_invoices')
                    .select('technician_id, technician_name, items, invoice_number, job_id')
                    .eq('id', targetId)
                    .single();

                if (invoice && invoice.technician_id && invoice.items && Array.isArray(invoice.items)) {
                    for (const item of invoice.items) {
                        const prodId = item.productId || item.product_id;
                        const qty = Number(item.qty) || 1;
                        if (prodId) {
                            // Add back to stock
                            const { data: currentStock } = await supabase
                                .from('technician_stock')
                                .select('quantity')
                                .eq('technician_id', invoice.technician_id)
                                .eq('product_id', prodId)
                                .maybeSingle();

                            const currentQty = currentStock ? currentStock.quantity : 0;
                            const newQty = currentQty + qty;

                            await supabase
                                .from('technician_stock')
                                .upsert({
                                    technician_id: invoice.technician_id,
                                    product_id: prodId,
                                    quantity: newQty,
                                    updated_at: new Date().toISOString()
                                }, {
                                    onConflict: 'technician_id,product_id'
                                });

                            // Insert transaction log
                            await supabase
                                .from('technician_stock_transactions')
                                .insert({
                                    technician_id: invoice.technician_id,
                                    product_id: prodId,
                                    quantity: qty,
                                    transaction_type: 'return',
                                    reference_id: targetId,
                                    notes: `Returned due to deletion of sales invoice ${invoice.invoice_number}`,
                                    created_by: 'System'
                                });
                        }
                    }
                }
            } catch (err) {
                console.error('[STOCK REVERSAL ERROR]:', err);
            }
        }

        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', targetId)

        if (error) throw error

        // ── Clean up orphaned auto-journals ──
        await supabase.from('journal_entries').delete().eq('reference_id', targetId);

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}


