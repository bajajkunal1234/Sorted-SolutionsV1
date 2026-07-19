import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/technician-stock
 * Retrieves stock list and transaction history for a technician.
 */
export async function GET(request) {
    try {
        const supabase = createServerSupabase();
        const { searchParams } = new URL(request.url)
        const technicianId = searchParams.get('technicianId')

        if (!technicianId) {
            return NextResponse.json({ success: false, error: 'Technician ID is required' }, { status: 400 });
        }

        // 1. Fetch current stock
        const { data: stock, error: stockError } = await supabase
            .from('technician_stock')
            .select(`
                id,
                quantity,
                product_id,
                inventory (
                    id,
                    name,
                    category,
                    sku
                )
            `)
            .eq('technician_id', technicianId)
            .order('updated_at', { ascending: false });

        if (stockError) throw stockError;

        // 2. Fetch stock transaction log
        const { data: transactions, error: txError } = await supabase
            .from('technician_stock_transactions')
            .select(`
                id,
                quantity,
                transaction_type,
                reference_id,
                notes,
                created_by,
                created_at,
                product_id,
                inventory (
                    name,
                    sku
                )
            `)
            .eq('technician_id', technicianId)
            .order('created_at', { ascending: false })
            .limit(100);

        if (txError) throw txError;

        // 3. Fetch all transaction logs to build audit trails for current stock
        const { data: allTxs } = await supabase
            .from('technician_stock_transactions')
            .select('*')
            .eq('technician_id', technicianId)
            .order('created_at', { ascending: false });

        // 4. Resolve Sales Invoices details and Job details for negative stock events
        const invoiceIds = (allTxs || [])
            .filter(t => t.transaction_type === 'sale' && t.reference_id)
            .map(t => t.reference_id);

        let invoiceMap = {};
        if (invoiceIds.length > 0) {
            const { data: invoices } = await supabase
                .from('sales_invoices')
                .select(`
                    id,
                    job_id,
                    jobs (
                        id,
                        job_number,
                        property
                    )
                `)
                .in('id', invoiceIds);

            (invoices || []).forEach(inv => {
                const prop = inv.jobs?.property || {};
                invoiceMap[inv.id] = {
                    job_id: inv.job_id,
                    job_number: inv.jobs?.job_number || 'N/A',
                    location: [prop.locality, prop.city].filter(Boolean).join(', ') || 'Unknown Location'
                };
            });
        }

        // 5. Resolve Inventory names map for handover items lookup
        const allProductIds = (allTxs || []).map(t => t.product_id);
        let inventoryNameMap = {};
        if (allProductIds.length > 0) {
            const { data: invItems } = await supabase
                .from('inventory')
                .select('id, name')
                .in('id', allProductIds);

            (invItems || []).forEach(item => {
                inventoryNameMap[item.id] = item.name;
            });
        }

        // 6. Group handover transactions by batch ID (reference_id) to figure out "other items in same handover"
        const handoverGroups = {};
        (allTxs || []).forEach(t => {
            if (t.transaction_type === 'handover' && t.reference_id) {
                if (!handoverGroups[t.reference_id]) {
                    handoverGroups[t.reference_id] = [];
                }
                handoverGroups[t.reference_id].push(t);
            }
        });

        // 7. Format stock items and assign detailed context
        const formattedStock = (stock || []).map(st => {
            const productTxs = (allTxs || []).filter(t => t.product_id === st.product_id);
            const negativeDetails = [];
            const positiveDetails = [];

            if (st.quantity < 0) {
                const sales = productTxs.filter(t => t.transaction_type === 'sale');
                sales.forEach(s => {
                    const invDetail = invoiceMap[s.reference_id] || { job_id: null, job_number: 'N/A', location: 'Unknown' };
                    negativeDetails.push({
                        date: s.created_at,
                        quantity: Math.abs(s.quantity),
                        job_id: invDetail.job_id,
                        job_number: invDetail.job_number,
                        location: invDetail.location
                    });
                });
            } else if (st.quantity > 0) {
                const handovers = productTxs.filter(t => t.transaction_type === 'handover');
                handovers.forEach(h => {
                    const otherItems = [];
                    if (h.reference_id && handoverGroups[h.reference_id]) {
                        handoverGroups[h.reference_id].forEach(otherTx => {
                            if (otherTx.product_id !== h.product_id) {
                                const name = inventoryNameMap[otherTx.product_id] || 'Other Item';
                                otherItems.push(`${name} (Qty: ${otherTx.quantity})`);
                            }
                        });
                    }
                    positiveDetails.push({
                        handover_id: h.reference_id || 'N/A',
                        date: h.created_at,
                        quantity: h.quantity,
                        other_items: otherItems
                    });
                });
            }

            return {
                id: st.id,
                product_id: st.product_id,
                quantity: st.quantity,
                name: st.inventory?.name || 'Unknown Part',
                category: st.inventory?.category || 'General',
                sku: st.inventory?.sku || '',
                negative_details: negativeDetails,
                positive_details: positiveDetails
            };
        });

        // 8. Format ledger transactions to include resolved job details
        const formattedTx = (transactions || []).map(tx => {
            const invDetail = invoiceMap[tx.reference_id] || null;
            return {
                id: tx.id,
                product_id: tx.product_id,
                quantity: tx.quantity,
                transaction_type: tx.transaction_type,
                reference_id: tx.reference_id,
                notes: tx.notes,
                created_by: tx.created_by,
                created_at: tx.created_at,
                product_name: tx.inventory?.name || 'Unknown Part',
                product_sku: tx.inventory?.sku || '',
                job_id: invDetail?.job_id || null,
                job_number: invDetail?.job_number || null,
                job_location: invDetail?.location || null
            };
        });

        return NextResponse.json({
            success: true,
            stock: formattedStock,
            transactions: formattedTx
        });

    } catch (error) {
        console.error('[API/admin/technician-stock GET Error]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/admin/technician-stock
 * Records a physical parts handover to a technician.
 */
export async function POST(request) {
    try {
        const supabase = createServerSupabase();
        const body = await request.json();
        const { technician_id, items, created_by = 'Admin' } = body;

        if (!technician_id) {
            return NextResponse.json({ success: false, error: 'Technician ID is required' }, { status: 400 });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ success: false, error: 'Handover items array is required' }, { status: 400 });
        }

        // Process each handover item
        const handoverId = crypto.randomUUID();

        for (const item of items) {
            const { product_id, quantity, notes = '' } = item;
            const qty = Number(quantity);

            if (!product_id || isNaN(qty) || qty <= 0) {
                continue; // Skip invalid entries
            }

            // 1. Fetch current stock to increment
            const { data: currentStock } = await supabase
                .from('technician_stock')
                .select('quantity')
                .eq('technician_id', technician_id)
                .eq('product_id', product_id)
                .maybeSingle();

            const currentQty = currentStock ? currentStock.quantity : 0;
            const newQty = currentQty + qty;

            // 2. Upsert stock quantity
            const { error: upsertError } = await supabase
                .from('technician_stock')
                .upsert({
                    technician_id,
                    product_id,
                    quantity: newQty,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'technician_id,product_id'
                });

            if (upsertError) throw upsertError;

            // 3. Log stock transaction record
            const { error: logError } = await supabase
                .from('technician_stock_transactions')
                .insert({
                    technician_id,
                    product_id,
                    quantity: qty,
                    transaction_type: 'handover',
                    notes: notes || 'Service Center Handover',
                    created_by,
                    reference_id: handoverId
                });

            if (logError) throw logError;
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[API/admin/technician-stock POST Error]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
