import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET: Fetch gateway transactions, settlement summary, and auto-detected bank settlement payouts
export async function GET(request) {
    try {
        const supabase = createServerSupabase();
        const { searchParams } = new URL(request.url);
        const gatewayId = searchParams.get('gateway_account_id') || searchParams.get('gateway_id');
        const status = searchParams.get('status') || 'unsettled'; // 'unsettled' | 'settled' | 'all'
        const channel = searchParams.get('channel') || 'all'; // 'all' | 'pos' | 'technician'
        const fromDate = searchParams.get('from');
        const toDate = searchParams.get('to');

        // 1. Identify all gateway / clearing accounts & destination bank accounts
        const { data: allBankAccounts, error: accsErr } = await supabase
            .from('accounts')
            .select('id, name, type, under, sku')
            .or('under.eq.bank-accounts,type.eq.bank')
            .neq('status', 'archived');

        if (accsErr) console.error('Error fetching bank accounts:', accsErr);

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

        const bankAccounts = (allBankAccounts || []).filter(a => {
            return !gatewayAccounts.some(g => g.id === a.id);
        });

        const gatewayIds = gatewayId 
            ? [gatewayId] 
            : gatewayAccounts.map(g => g.id);

        if (gatewayIds.length === 0) {
            return NextResponse.json({
                success: true,
                gatewayAccounts: [],
                bankAccounts: bankAccounts || [],
                receipts: [],
                bankPayouts: [],
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
                jobs:jobs(job_number, technician_id, technicians:technicians(id, name, phone))
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

        // 3. Fetch past settlements with enriched accounts and linked receipts
        let settlementsQuery = supabase
            .from('gateway_settlements')
            .select('*')
            .order('settlement_date', { ascending: false })
            .limit(100);

        if (gatewayId) settlementsQuery = settlementsQuery.eq('gateway_account_id', gatewayId);
        const { data: rawSettlements } = await settlementsQuery;

        // Collect all linked receipt IDs, account IDs, and purchase invoice IDs
        const allLinkedReceiptIds = Array.from(new Set(
            (rawSettlements || []).flatMap(s => Array.isArray(s.receipt_ids) ? s.receipt_ids : [])
        ));
        const allAccIds = Array.from(new Set(
            (rawSettlements || []).flatMap(s => [s.gateway_account_id, s.destination_account_id].filter(Boolean))
        ));
        const allPiIds = Array.from(new Set(
            (rawSettlements || []).map(s => s.purchase_invoice_id).filter(Boolean)
        ));

        const [linkedRecsRes, extraAccsRes, linkedPisRes] = await Promise.all([
            allLinkedReceiptIds.length > 0
                ? supabase
                    .from('receipt_vouchers')
                    .select(`
                        id, receipt_number, reference, reference_number, date, amount,
                        payment_mode, narration, account_id, account_name, job_id,
                        payment_account_id, is_settled, settlement_ref, settled_at, source,
                        jobs:jobs(job_number, technician_id, technicians:technicians(id, name, phone))
                    `)
                    .in('id', allLinkedReceiptIds)
                : Promise.resolve({ data: [] }),
            allAccIds.length > 0
                ? supabase
                    .from('accounts')
                    .select('id, name, sku, type')
                    .in('id', allAccIds)
                : Promise.resolve({ data: [] }),
            allPiIds.length > 0
                ? supabase
                    .from('purchase_invoices')
                    .select('id, invoice_number, total_amount, subtotal, date, status, notes')
                    .in('id', allPiIds)
                : Promise.resolve({ data: [] })
        ]);

        const linkedRecsMap = {};
        (linkedRecsRes.data || []).forEach(r => {
            const narr = (r.narration || '').toLowerCase();
            const isPos = r.source === 'POS' || narr.includes('store pos') || (!r.job_id && (narr.includes('pos') || narr.includes('walk-in')));
            const isTech = !!r.job_id || !!r.jobs?.technicians?.name || narr.includes('technician');
            linkedRecsMap[r.id] = {
                ...r,
                channelType: isPos ? 'pos' : (isTech ? 'technician' : 'direct'),
                technicianName: r.jobs?.technicians?.name || (isTech ? 'Field Technician' : null),
                jobNumber: r.jobs?.job_number || null,
            };
        });

        const accMap = {};
        (extraAccsRes.data || []).forEach(a => { accMap[a.id] = a; });

        const piMap = {};
        (linkedPisRes.data || []).forEach(p => { piMap[p.id] = p; });

        const settlements = (rawSettlements || []).map(s => {
            const ids = Array.isArray(s.receipt_ids) ? s.receipt_ids : [];
            const linkedReceipts = ids.map(id => linkedRecsMap[id]).filter(Boolean);
            return {
                ...s,
                gatewayAccount: accMap[s.gateway_account_id] || null,
                destinationAccount: accMap[s.destination_account_id] || null,
                purchaseInvoice: s.purchase_invoice_id ? piMap[s.purchase_invoice_id] || null : null,
                receipts: linkedReceipts,
                receiptCount: ids.length
            };
        });

        // 4. DETECT BANK SETTLEMENT PAYOUTS (from HDFC Statements & Gmail Alerts)
        // Match statement inflows containing gateway keywords
        const [stmtsRes, alertsRes] = await Promise.all([
            supabase
                .from('bank_statement_transactions')
                .select('id, date, particulars, ref_no, amount, type, status, voucher_id, reconciled_at')
                .eq('type', 'receipt')
                .or('particulars.ilike.%google%,particulars.ilike.%gpay%,particulars.ilike.%razorpay%,particulars.ilike.%pine%,particulars.ilike.%nod-perfect%,particulars.ilike.%settle%')
                .order('date', { ascending: false })
                .limit(40),
            supabase
                .from('bank_alerts_log')
                .select('id, date, narration, party_name, reference_number, amount, type, status, voucher_id, created_at')
                .eq('type', 'credit')
                .or('narration.ilike.%google%,narration.ilike.%gpay%,narration.ilike.%razorpay%,narration.ilike.%pine%,narration.ilike.%settle%,party_name.ilike.%google%,party_name.ilike.%razorpay%')
                .order('date', { ascending: false })
                .limit(40)
        ]);

        const rawStmts = stmtsRes.data || [];
        const rawAlerts = alertsRes.data || [];

        // Deduplicate alerts already present in bank statements
        const normRef = (s) => (s || '').toString().trim().replace(/^0+/, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const stmtRefs = new Set(rawStmts.map(s => normRef(s.ref_no)).filter(Boolean));

        const unifiedPayouts = [];

        rawStmts.forEach(st => {
            unifiedPayouts.push({
                id: st.id,
                origin: 'statement',
                date: st.date,
                amount: parseFloat(st.amount) || 0,
                particulars: st.particulars,
                ref_no: st.ref_no || '',
                status: st.status || 'unreconciled',
                voucher_id: st.voucher_id || null,
                is_reconciled: st.status === 'reconciled' || !!st.voucher_id
            });
        });

        rawAlerts.forEach(al => {
            const cleanRef = normRef(al.reference_number);
            if (cleanRef && stmtRefs.has(cleanRef)) return; // Covered by statement

            unifiedPayouts.push({
                id: al.id,
                origin: 'alert',
                date: al.date,
                amount: parseFloat(al.amount) || 0,
                particulars: al.narration || al.party_name || 'Bank Alert',
                ref_no: al.reference_number || '',
                status: al.status || 'unreconciled',
                voucher_id: al.voucher_id || null,
                is_reconciled: al.status === 'reconciled' || !!al.voucher_id
            });
        });

        // 5. Build intelligent matching between each Bank Payout and candidate receipts
        const bankPayouts = unifiedPayouts.map(payout => {
            const text = (payout.particulars + ' ' + payout.ref_no).toLowerCase();
            let provider = 'Payment Gateway';
            let matchedGw = null;

            if (text.includes('google') || text.includes('gpay') || text.includes('nod-perfect')) {
                provider = 'Google Pay Business';
                matchedGw = gatewayAccounts.find(g => (g.name || '').toLowerCase().includes('google') || (g.name || '').toLowerCase().includes('gpay'));
            } else if (text.includes('razorpay')) {
                provider = 'Razorpay';
                matchedGw = gatewayAccounts.find(g => (g.name || '').toLowerCase().includes('razorpay'));
            } else if (text.includes('pine')) {
                provider = 'Pine Labs';
                matchedGw = gatewayAccounts.find(g => (g.name || '').toLowerCase().includes('pine'));
            } else {
                matchedGw = gatewayAccounts[0];
            }

            const targetGwId = matchedGw ? matchedGw.id : (gatewayAccounts[0]?.id || null);

            // Filter candidate receipts for this payout:
            // Same gateway, created on or before payout date (typically date T or T-1 window, or matching settlement_ref)
            const pDate = new Date(payout.date);
            const pDateMinus2 = new Date(pDate);
            pDateMinus2.setDate(pDateMinus2.getDate() - 2);
            const minDateStr = pDateMinus2.toISOString().split('T')[0];
            const pDateStr = payout.date;

            // Check if this payout is already matched to a settlement record
            const existingSettlement = (settlements || []).find(s => 
                (payout.ref_no && s.settlement_ref === payout.ref_no) ||
                (s.settlement_date === payout.date && Math.abs(parseFloat(s.net_amount || 0) - payout.amount) < 0.05)
            );

            // Candidate receipts:
            let candidates = [];
            if (existingSettlement && Array.isArray(existingSettlement.receipt_ids)) {
                // If already settled, pick the exact receipts recorded in the settlement
                candidates = receipts.filter(r => existingSettlement.receipt_ids.includes(r.id));
            } else {
                // For pending payouts: pick unsettled receipts for this gateway in the batch timeframe (T-2 to T)
                candidates = receipts.filter(r => 
                    r.payment_account_id === targetGwId &&
                    !r.is_settled &&
                    r.date >= minDateStr &&
                    r.date <= pDateStr
                );

                // If no receipts in tight window, check if any unsettled receipts exist on or before payout date
                if (candidates.length === 0) {
                    candidates = receipts.filter(r => 
                        r.payment_account_id === targetGwId &&
                        !r.is_settled &&
                        r.date <= pDateStr
                    ).slice(0, 20);
                }
            }

            const candidateTotal = candidates.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
            const candidatePos = candidates.filter(r => r.channelType === 'pos').reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
            const candidateTech = candidates.filter(r => r.channelType === 'technician').reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

            // Variance = Bank Payout - Candidate Receipts Total
            // If Variance > 0: Bank received more money than system has logged (Missing receipts in system)
            // If Variance < 0: System has logged more money than bank payout (Short settlement / Cutoff rollover)
            // If Variance == 0: Exact match
            const variance = +(payout.amount - candidateTotal).toFixed(2);
            const isReconciled = payout.is_reconciled || !!existingSettlement;

            let discrepancyType = 'matched';
            if (isReconciled) {
                discrepancyType = 'reconciled';
            } else if (Math.abs(variance) < 1.0) {
                discrepancyType = 'matched';
            } else if (variance > 0) {
                discrepancyType = 'missing_receipts';
            } else {
                discrepancyType = 'short_settlement';
            }

            return {
                ...payout,
                provider,
                gatewayAccount: matchedGw || null,
                gatewayAccountId: targetGwId,
                candidateReceipts: candidates,
                candidateCount: candidates.length,
                candidateTotal,
                candidatePos,
                candidateTech,
                variance,
                discrepancyType,
                isReconciled,
                settlementRecord: existingSettlement || null
            };
        });

        return NextResponse.json({
            success: true,
            gatewayAccounts,
            bankAccounts,
            receipts,
            bankPayouts,
            settlements: settlements || [],
            summary: {
                totalUnsettled,
                posTotal,
                techTotal,
                count: unsettledOnly.length,
                payoutsCount: bankPayouts.length,
                pendingPayoutsCount: bankPayouts.filter(p => !p.isReconciled).length
            }
        });
    } catch (err) {
        console.error('Error fetching gateway settlements:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// POST: Actions for Auto-Creating Commission Purchase Voucher, Batch Settlement, or Direct Match & Reconcile
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
        // ACTION 2: SETTLE BATCH TRANSACTIONS INTO BANK
        // =========================================================================
        if (action === 'settle_batch') {
            const {
                gateway_account_id,
                destination_account_id,
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

            const yy = new Date().getFullYear().toString().slice(-2);
            const transferVoucherNumber = `PAY-${yy}-${Math.floor(10000 + Math.random() * 90000)}`;

            const transferPayload = {
                payment_number: transferVoucherNumber,
                reference: settlement_ref || 'Gateway Settlement',
                reference_number: settlement_ref || null,
                account_id: destAccId,
                account_name: destName,
                payment_account_id: gateway_account_id,
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

            const { error: updateErr } = await supabase
                .from('receipt_vouchers')
                .update({
                    is_settled: true,
                    settlement_ref: settlement_ref || transferVoucherNumber,
                    settled_at: new Date().toISOString()
                })
                .in('id', receipt_ids);

            if (updateErr) throw updateErr;

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

        // =========================================================================
        // ACTION 3: 1-CLICK MATCH & RECONCILE BANK PAYOUT (WITH AUTO-BALANCING & COMM)
        // =========================================================================
        if (action === 'reconcile_bank_payout') {
            const {
                bank_payout_id,
                payout_source = 'statement', // 'statement' | 'alert'
                gateway_account_id,
                destination_account_id,
                receipt_ids = [],
                bank_amount,
                gross_amount,
                fee_amount = 0,
                tax_amount = 0,
                settlement_ref = '',
                settlement_date = new Date().toISOString().split('T')[0],
                create_missing_voucher = false,
                missing_amount = 0,
                missing_account_id = null,
                create_commission_voucher = false,
                notes = ''
            } = body;

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
            const destName = destAcc?.name || 'HDFC Current A/c';

            const activeReceiptIds = [...receipt_ids];

            // 1. If Missing Receipts detected and requested to auto-balance, create balancing receipt voucher
            let balancingVoucher = null;
            if (create_missing_voucher && parseFloat(missing_amount) > 0) {
                const yy = new Date().getFullYear().toString().slice(-2);
                const balRecNumber = `REC-${yy}-BAL${Math.floor(1000 + Math.random() * 9000)}`;

                const balancingPayload = {
                    receipt_number: balRecNumber,
                    account_id: missing_account_id || '91354883-3379-4ca4-b770-850acb7d8e93', // Sales Revenue
                    account_name: 'Unrecorded Customer Collection (Auto-Balanced)',
                    payment_account_id: gateway_account_id,
                    amount: parseFloat(missing_amount),
                    date: settlement_date,
                    payment_mode: 'upi',
                    reference_number: settlement_ref,
                    narration: `Balancing receipt for unrecorded collection detected in bank settlement ${settlement_ref}`,
                    is_settled: true,
                    settlement_ref: settlement_ref,
                    settled_at: new Date().toISOString(),
                    source: 'Auto-Reconciliation'
                };

                const { data: bData, error: bErr } = await supabase
                    .from('receipt_vouchers')
                    .insert([balancingPayload])
                    .select()
                    .single();

                if (!bErr && bData) {
                    balancingVoucher = bData;
                    activeReceiptIds.push(bData.id);
                }
            }

            // 2. If commission specified, create Purchase Voucher
            let purchaseInvoice = null;
            const totalCommission = parseFloat(fee_amount || 0) + parseFloat(tax_amount || 0);

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
                    notes: `Gateway MDR processing fee on settlement ${settlement_ref} into ${destName}`,
                    items: [
                        {
                            name: `Payment Gateway Fee (${gatewayName})`,
                            description: `Processing MDR fee for settlement ${settlement_ref}`,
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

            // 3. Create Transfer Payment Voucher to HDFC
            const yy = new Date().getFullYear().toString().slice(-2);
            const transferVoucherNumber = `PAY-${yy}-${Math.floor(10000 + Math.random() * 90000)}`;

            const transferPayload = {
                payment_number: transferVoucherNumber,
                reference: settlement_ref || 'Gateway Settlement',
                reference_number: settlement_ref || null,
                account_id: destAccId,
                account_name: destName,
                payment_account_id: gateway_account_id,
                date: settlement_date,
                amount: parseFloat(bank_amount),
                payment_mode: 'bank_transfer',
                narration: `Gateway settlement transfer from ${gatewayName} to ${destName} - Ref: ${settlement_ref}`,
                status: 'cleared'
            };

            const { data: transferData, error: transferErr } = await supabase
                .from('payment_vouchers')
                .insert([transferPayload])
                .select()
                .single();

            if (transferErr) console.warn('Could not insert transfer voucher:', transferErr);

            // 4. Mark all selected and balancing receipt vouchers as settled
            if (activeReceiptIds.length > 0) {
                await supabase
                    .from('receipt_vouchers')
                    .update({
                        is_settled: true,
                        settlement_ref: settlement_ref || transferVoucherNumber,
                        settled_at: new Date().toISOString()
                    })
                    .in('id', activeReceiptIds);
            }

            // 5. Mark bank statement transaction or alert as reconciled
            if (payout_source === 'statement' && bank_payout_id) {
                await supabase
                    .from('bank_statement_transactions')
                    .update({
                        status: 'reconciled',
                        voucher_id: transferData?.id || null,
                        reconciled_at: new Date().toISOString()
                    })
                    .eq('id', bank_payout_id);
            } else if (payout_source === 'alert' && bank_payout_id) {
                await supabase
                    .from('bank_alerts_log')
                    .update({
                        status: 'reconciled',
                        voucher_id: transferData?.id || null
                    })
                    .eq('id', bank_payout_id);
            }

            // 6. Record audit entry in gateway_settlements
            const { data: settlementLog } = await supabase
                .from('gateway_settlements')
                .insert([{
                    gateway_account_id,
                    destination_account_id: destAccId,
                    settlement_ref: settlement_ref || transferVoucherNumber,
                    settlement_date,
                    gross_amount: parseFloat(gross_amount) || parseFloat(bank_amount),
                    fee_amount: parseFloat(fee_amount) || 0,
                    tax_amount: parseFloat(tax_amount) || 0,
                    net_amount: parseFloat(bank_amount),
                    purchase_invoice_id: purchaseInvoice?.id || null,
                    receipt_ids: activeReceiptIds,
                    notes: notes || `Auto-matched bank payout ${settlement_ref}`
                }])
                .select()
                .single();

            return NextResponse.json({
                success: true,
                message: `Successfully matched & reconciled settlement of ₹${parseFloat(bank_amount).toLocaleString('en-IN')} with ${activeReceiptIds.length} receipts`,
                settlement: settlementLog,
                balancingVoucher,
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

// PUT: Edit existing settlement (update metadata, adjust linked receipts, adjust commission fee)
export async function PUT(request) {
    try {
        const supabase = createServerSupabase();
        const body = await request.json();
        const {
            id,
            settlement_ref,
            settlement_date,
            notes,
            fee_amount = 0,
            tax_amount = 0,
            receipt_ids = []
        } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: 'Settlement ID is required' }, { status: 400 });
        }

        // 1. Fetch current settlement record
        const { data: current, error: getErr } = await supabase
            .from('gateway_settlements')
            .select('*')
            .eq('id', id)
            .single();

        if (getErr || !current) {
            return NextResponse.json({ success: false, error: 'Settlement not found' }, { status: 404 });
        }

        const oldReceiptIds = Array.isArray(current.receipt_ids) ? current.receipt_ids : [];
        const newReceiptIds = Array.isArray(receipt_ids) ? receipt_ids : [];

        // Identify added and removed receipts
        const removedIds = oldReceiptIds.filter(rid => !newReceiptIds.includes(rid));
        const addedIds = newReceiptIds.filter(rid => !oldReceiptIds.includes(rid));

        // Un-settle removed receipts
        if (removedIds.length > 0) {
            await supabase
                .from('receipt_vouchers')
                .update({ is_settled: false, settlement_ref: null, settled_at: null })
                .in('id', removedIds);
        }

        // Mark added receipts as settled
        if (addedIds.length > 0) {
            await supabase
                .from('receipt_vouchers')
                .update({
                    is_settled: true,
                    settlement_ref: settlement_ref || current.settlement_ref,
                    settled_at: new Date().toISOString()
                })
                .in('id', addedIds);
        }

        // Compute new gross amount from all newReceiptIds
        let newGross = 0;
        if (newReceiptIds.length > 0) {
            const { data: recs } = await supabase
                .from('receipt_vouchers')
                .select('amount')
                .in('id', newReceiptIds);
            newGross = (recs || []).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
        }

        const newFee = parseFloat(fee_amount) || 0;
        const newTax = parseFloat(tax_amount) || 0;
        const totalCommission = newFee + newTax;
        const newNet = +(newGross - totalCommission).toFixed(2);

        // Update or create Purchase Invoice for gateway commission
        let purchaseInvoiceId = current.purchase_invoice_id;
        if (totalCommission > 0) {
            if (purchaseInvoiceId) {
                await supabase
                    .from('purchase_invoices')
                    .update({
                        subtotal: newFee,
                        total_tax: newTax,
                        total_amount: totalCommission,
                        date: settlement_date || current.settlement_date,
                        notes: `Updated gateway commission on settlement ${settlement_ref || current.settlement_ref}`
                    })
                    .eq('id', purchaseInvoiceId);
            } else {
                const yy = new Date().getFullYear().toString().slice(-2);
                const invoiceNumber = `PUR-${yy}-${Math.floor(10000 + Math.random() * 90000)}`;
                const { data: newPi } = await supabase
                    .from('purchase_invoices')
                    .insert([{
                        invoice_number: invoiceNumber,
                        account_id: current.gateway_account_id,
                        account_name: 'Payment Gateway (MDR Fee)',
                        date: settlement_date || current.settlement_date,
                        subtotal: newFee,
                        total_tax: newTax,
                        total_amount: totalCommission,
                        status: 'paid',
                        category: 'Gateway Processing Charges',
                        notes: `Gateway MDR processing fee on settlement ${settlement_ref || current.settlement_ref}`
                    }])
                    .select()
                    .single();
                if (newPi) purchaseInvoiceId = newPi.id;
            }
        } else if (totalCommission === 0 && purchaseInvoiceId) {
            await supabase.from('purchase_invoices').delete().eq('id', purchaseInvoiceId);
            purchaseInvoiceId = null;
        }

        // Update settlement record
        const { data: updated, error: updErr } = await supabase
            .from('gateway_settlements')
            .update({
                settlement_ref: settlement_ref || current.settlement_ref,
                settlement_date: settlement_date || current.settlement_date,
                gross_amount: newGross,
                fee_amount: newFee,
                tax_amount: newTax,
                net_amount: newNet,
                purchase_invoice_id: purchaseInvoiceId,
                receipt_ids: newReceiptIds,
                notes: notes !== undefined ? notes : current.notes
            })
            .eq('id', id)
            .select()
            .single();

        if (updErr) throw updErr;

        return NextResponse.json({
            success: true,
            message: `Settlement ${updated.settlement_ref || ''} updated successfully (${newReceiptIds.length} collections linked)`,
            settlement: updated
        });
    } catch (err) {
        console.error('Error updating settlement:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// DELETE: Un-settle / Rollback a settlement
export async function DELETE(request) {
    try {
        const supabase = createServerSupabase();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'Settlement ID is required' }, { status: 400 });
        }

        const { data: current, error: getErr } = await supabase
            .from('gateway_settlements')
            .select('*')
            .eq('id', id)
            .single();

        if (getErr || !current) {
            return NextResponse.json({ success: false, error: 'Settlement not found' }, { status: 404 });
        }

        // 1. Un-settle all linked receipt vouchers
        const receiptIds = Array.isArray(current.receipt_ids) ? current.receipt_ids : [];
        if (receiptIds.length > 0) {
            await supabase
                .from('receipt_vouchers')
                .update({ is_settled: false, settlement_ref: null, settled_at: null })
                .in('id', receiptIds);
        }

        // 2. Delete linked purchase invoice voucher if any
        if (current.purchase_invoice_id) {
            await supabase
                .from('purchase_invoices')
                .delete()
                .eq('id', current.purchase_invoice_id);
        }

        // 3. Revert linked bank statement transaction status if matching
        if (current.settlement_ref) {
            await supabase
                .from('bank_statement_transactions')
                .update({ status: 'unreconciled', voucher_id: null, reconciled_at: null })
                .eq('ref_no', current.settlement_ref);

            await supabase
                .from('bank_alerts_log')
                .update({ status: 'unreconciled', voucher_id: null })
                .eq('reference_number', current.settlement_ref);
        }

        // 4. Delete the settlement record
        const { error: delErr } = await supabase
            .from('gateway_settlements')
            .delete()
            .eq('id', id);

        if (delErr) throw delErr;

        return NextResponse.json({
            success: true,
            message: `Settlement ${current.settlement_ref || ''} deleted and rolled back. All ${receiptIds.length} customer collections returned to holding.`
        });
    } catch (err) {
        console.error('Error deleting settlement:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
