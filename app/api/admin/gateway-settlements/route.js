import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET: Fetch gateway transactions and settlement summary
export async function GET(request) {
    try {
        const supabase = createServerSupabase();
        const { searchParams } = new URL(request.url);
        const gatewayId = searchParams.get('gateway_account_id');
        const status = searchParams.get('status') || 'unsettled'; // 'unsettled' | 'settled' | 'all'
        const channel = searchParams.get('channel') || 'all'; // 'all' | 'pos' | 'technician'
        const fromDate = searchParams.get('from');
        const toDate = searchParams.get('to');

        // 1. Identify all gateway / clearing accounts
        const { data: allBankAccounts } = await supabase
            .from('accounts')
            .select('id, name, type, under, sku')
            .or('under.eq.bank-accounts,type.eq.bank')
            .neq('status', 'archived');

        const gatewayAccounts = (allBankAccounts || []).filter(a => {
            const name = (a.name || '').toLowerCase();
            return name.includes('clearing') ||
                   name.includes('gateway') ||
                   name.includes('google pay') ||
                   name.includes('gpay') ||
                   name.includes('razorpay') ||
                   name.includes('pine') ||
                   name.includes('paytm');
        });

        const gatewayIds = gatewayId 
            ? [gatewayId] 
            : gatewayAccounts.map(g => g.id);

        if (gatewayIds.length === 0) {
            return NextResponse.json({
                success: true,
                gatewayAccounts: [],
                receipts: [],
                settlements: [],
                summary: { totalUnsettled: 0, posTotal: 0, techTotal: 0, count: 0 }
            });
        }

        // 2. Query receipts deposited into these gateway accounts
        let receiptQuery = supabase
            .from('receipt_vouchers')
            .select(`
                id, receipt_number, reference, reference_number, date, amount,
                payment_mode, narration, account_id, account_name, job_id,
                payment_account_id, is_settled, settlement_ref, settled_at, source, created_by,
                jobs:jobs(job_number, technician_id, technicians(id, name, mobile))
            `)
            .in('payment_account_id', gatewayIds)
            .neq('status', 'cancelled')
            .order('date', { ascending: false });

        if (status === 'unsettled') {
            receiptQuery = receiptQuery.or('is_settled.is.null,is_settled.eq.false');
        } else if (status === 'settled') {
            receiptQuery = receiptQuery.eq('is_settled', true);
        }

        if (fromDate) receiptQuery = receiptQuery.gte('date', fromDate);
        if (toDate) receiptQuery = receiptQuery.lte('date', toDate);

        const { data: rawReceipts, error: recErr } = await receiptQuery;
        if (recErr) throw recErr;

        // Process channel tags: POS vs Technician vs Direct
        let receipts = (rawReceipts || []).map(r => {
            const narr = (r.narration || '').toLowerCase();
            const isPos = r.source === 'POS' || narr.includes('store pos') || (!r.job_id && (narr.includes('pos') || narr.includes('walk-in')));
            const isTech = !!r.job_id || !!r.jobs?.technicians?.name || narr.includes('technician');
            const channelType = isPos ? 'pos' : (isTech ? 'technician' : 'direct');

            return {
                ...r,
                channelType,
                technicianName: r.jobs?.technicians?.name || (isTech ? 'Field Technician' : null),
                jobNumber: r.jobs?.job_number || null,
            };
        });

        if (channel === 'pos') {
            receipts = receipts.filter(r => r.channelType === 'pos');
        } else if (channel === 'technician') {
            receipts = receipts.filter(r => r.channelType === 'technician');
        }

        // Summary calculations
        const unsettledOnly = receipts.filter(r => !r.is_settled);
        const totalUnsettled = unsettledOnly.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
        const posTotal = unsettledOnly.filter(r => r.channelType === 'pos').reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
        const techTotal = unsettledOnly.filter(r => r.channelType === 'technician').reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

        // 3. Fetch past settlements
        let settlementsQuery = supabase
            .from('gateway_settlements')
            .select('*')
            .order('settlement_date', { ascending: false })
            .limit(50);

        if (gatewayId) settlementsQuery = settlementsQuery.eq('gateway_account_id', gatewayId);

        const { data: settlements } = await settlementsQuery;

        return NextResponse.json({
            success: true,
            gatewayAccounts,
            receipts,
            settlements: settlements || [],
            summary: {
                totalUnsettled,
                posTotal,
                techTotal,
                count: unsettledOnly.length
            }
        });
    } catch (err) {
        console.error('Error fetching gateway settlements:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// POST: Actions for Auto-Creating Commission Purchase Voucher or Settling to Main Bank
export async function POST(request) {
    try {
        const supabase = createServerSupabase();
        const body = await request.json();
        const { action } = body;

        // =========================================================================
        // ACTION 1: AUTO CREATE COMMISSION PURCHASE VOUCHER
        // =========================================================================
        if (action === 'create_commission_voucher') {
            const {
                gateway_account_id,
                gross_amount,
                fee_amount,
                tax_amount = 0,
                voucher_ids = [],
                notes = '',
                invoice_date = new Date().toISOString().split('T')[0],
                vendor_invoice_number = ''
            } = body;

            if (!gateway_account_id) {
                return NextResponse.json({ success: false, error: 'Gateway account is required' }, { status: 400 });
            }

            const totalCommission = parseFloat(fee_amount || 0) + parseFloat(tax_amount || 0);
            if (totalCommission <= 0) {
                return NextResponse.json({ success: false, error: 'Commission amount must be greater than 0' }, { status: 400 });
            }

            // Fetch gateway account info
            const { data: gatewayAcc } = await supabase
                .from('accounts')
                .select('id, name')
                .eq('id', gateway_account_id)
                .single();

            const gatewayName = gatewayAcc?.name || 'Payment Gateway';

            // Auto-generate invoice number: PUR-YY-XXXXX
            const yy = new Date().getFullYear().toString().slice(-2);
            const invoiceNumber = `PUR-${yy}-${Math.floor(10000 + Math.random() * 90000)}`;

            const subtotal = parseFloat(fee_amount) || 0;
            const tax = parseFloat(tax_amount) || 0;
            const halfTax = +(tax / 2).toFixed(2);

            const purchasePayload = {
                invoice_number: invoiceNumber,
                vendor_invoice_number: vendor_invoice_number || `GW-FEE-${Date.now().toString().slice(-6)}`,
                account_id: gateway_account_id,
                account_name: `${gatewayName} (Gateway Commission)`,
                date: invoice_date,
                subtotal: subtotal,
                cgst: halfTax,
                sgst: halfTax,
                igst: 0,
                total_tax: tax,
                total_amount: totalCommission,
                status: 'paid',
                category: 'Gateway Processing Charges',
                notes: notes || `Gateway processing fee deduction for customer collections (Gross: ₹${gross_amount || '—'})`,
                items: [
                    {
                        name: `Payment Gateway Fee / MDR (${gatewayName})`,
                        description: `Processing fee on customer swipe/UPI collections`,
                        quantity: 1,
                        unit_price: subtotal,
                        total: subtotal
                    }
                ]
            };

            const { data: purchaseData, error: purchaseErr } = await supabase
                .from('purchase_invoices')
                .insert([purchasePayload])
                .select()
                .single();

            if (purchaseErr) throw purchaseErr;

            return NextResponse.json({
                success: true,
                message: `Purchase Voucher ${invoiceNumber} created for gateway commission ₹${totalCommission.toFixed(2)}`,
                purchaseInvoice: purchaseData
            });
        }

        // =========================================================================
        // ACTION 2: SETTLE TRANSACTIONS INTO BANK (WITH OPTIONAL COMMISSION PURCHASE VOUCHER)
        // =========================================================================
        if (action === 'settle_batch') {
            const {
                gateway_account_id,
                destination_account_id, // Default HDFC Current Account
                receipt_ids = [],
                gross_amount,
                fee_amount = 0,
                tax_amount = 0,
                net_amount,
                settlement_ref = '',
                settlement_date = new Date().toISOString().split('T')[0],
                create_commission_voucher = true,
                notes = ''
            } = body;

            if (!receipt_ids || receipt_ids.length === 0) {
                return NextResponse.json({ success: false, error: 'Please select at least one transaction to settle' }, { status: 400 });
            }

            // 1. Resolve destination bank account (HDFC Current Account if not passed)
            let destAccId = destination_account_id;
            if (!destAccId) {
                const { data: hdfc } = await supabase
                    .from('accounts')
                    .select('id')
                    .ilike('name', '%hdfc%')
                    .maybeSingle();
                destAccId = hdfc?.id || 'fb2512f4-c3c3-44ae-9dcf-0b750b5294a6';
            }

            const { data: gatewayAcc } = await supabase
                .from('accounts')
                .select('id, name')
                .eq('id', gateway_account_id)
                .single();

            const { data: destAcc } = await supabase
                .from('accounts')
                .select('id, name')
                .eq('id', destAccId)
                .single();

            const gatewayName = gatewayAcc?.name || 'Payment Gateway';
            const destName = destAcc?.name || 'Bank Account';

            const totalCommission = parseFloat(fee_amount || 0) + parseFloat(tax_amount || 0);
            const computedNet = parseFloat(net_amount) || (parseFloat(gross_amount) - totalCommission);

            let purchaseInvoice = null;

            // 2. Optionally create the Commission Purchase Voucher
            if (create_commission_voucher && totalCommission > 0) {
                const yy = new Date().getFullYear().toString().slice(-2);
                const invoiceNumber = `PUR-${yy}-${Math.floor(10000 + Math.random() * 90000)}`;
                const subtotal = parseFloat(fee_amount) || 0;
                const tax = parseFloat(tax_amount) || 0;
                const halfTax = +(tax / 2).toFixed(2);

                const purchasePayload = {
                    invoice_number: invoiceNumber,
                    vendor_invoice_number: settlement_ref || `SETTLE-COMM-${Date.now().toString().slice(-6)}`,
                    account_id: gateway_account_id,
                    account_name: `${gatewayName} (Gateway Commission)`,
                    date: settlement_date,
                    subtotal: subtotal,
                    cgst: halfTax,
                    sgst: halfTax,
                    igst: 0,
                    total_tax: tax,
                    total_amount: totalCommission,
                    status: 'paid',
                    category: 'Gateway Processing Charges',
                    notes: `Gateway MDR commission deducted on settlement ${settlement_ref || 'Batch'} into ${destName}`,
                    items: [
                        {
                            name: `Payment Gateway Fee (${gatewayName})`,
                            description: `Commission on gross collections ₹${gross_amount}`,
                            quantity: 1,
                            unit_price: subtotal,
                            total: subtotal
                        }
                    ]
                };

                const { data: piData, error: piErr } = await supabase
                    .from('purchase_invoices')
                    .insert([purchasePayload])
                    .select()
                    .single();

                if (!piErr) purchaseInvoice = piData;
            }

            // 3. Create Transfer Payment Voucher (clears Gateway Clearing $\to$ deposits Net into HDFC)
            // A Payment Voucher where account_id = HDFC (Debit HDFC Bank) and payment_account_id = Gateway (Credit Gateway Clearing)
            const yy = new Date().getFullYear().toString().slice(-2);
            const transferVoucherNumber = `PAY-${yy}-${Math.floor(10000 + Math.random() * 90000)}`;

            const transferPayload = {
                payment_number: transferVoucherNumber,
                reference: settlement_ref || 'Gateway Settlement',
                reference_number: settlement_ref || null,
                account_id: destAccId, // Receiving bank account
                account_name: destName,
                payment_account_id: gateway_account_id, // Paying clearing account
                date: settlement_date,
                amount: computedNet,
                payment_mode: 'bank_transfer',
                narration: `Gateway settlement payout from ${gatewayName} into ${destName} (Gross: ₹${gross_amount}, Comm: ₹${totalCommission})`,
                status: 'cleared'
            };

            const { data: transferData, error: transferErr } = await supabase
                .from('payment_vouchers')
                .insert([transferPayload])
                .select()
                .single();

            if (transferErr) console.warn('Could not insert transfer voucher:', transferErr);

            // 4. Mark all selected receipt vouchers as settled
            const { error: updateErr } = await supabase
                .from('receipt_vouchers')
                .update({
                    is_settled: true,
                    settlement_ref: settlement_ref || transferVoucherNumber,
                    settled_at: new Date().toISOString()
                })
                .in('id', receipt_ids);

            if (updateErr) throw updateErr;

            // 5. Record settlement log in gateway_settlements table
            const { data: settlementLog, error: logErr } = await supabase
                .from('gateway_settlements')
                .insert([{
                    gateway_account_id,
                    destination_account_id: destAccId,
                    settlement_ref: settlement_ref || transferVoucherNumber,
                    settlement_date,
                    gross_amount: parseFloat(gross_amount) || 0,
                    fee_amount: parseFloat(fee_amount) || 0,
                    tax_amount: parseFloat(tax_amount) || 0,
                    net_amount: computedNet,
                    purchase_invoice_id: purchaseInvoice?.id || null,
                    receipt_ids: receipt_ids,
                    notes: notes || `Settled ${receipt_ids.length} transactions via ${gatewayName}`
                }])
                .select()
                .single();

            return NextResponse.json({
                success: true,
                message: `Successfully settled ₹${computedNet.toLocaleString('en-IN')} into ${destName}`,
                settlement: settlementLog,
                purchaseInvoice,
                transferVoucher: transferData
            });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch (err) {
        console.error('Error processing gateway settlement:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
