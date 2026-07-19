import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/technician/stock
 * Retrieves physical stock for the logged-in technician.
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const technicianId = searchParams.get('technicianId')

        if (!technicianId) {
            return NextResponse.json({ success: false, error: 'Technician ID is required' }, { status: 400 });
        }

        // Validate active session
        const sessionToken = request.headers.get('x-session-token');
        const { data: tech } = await supabase
            .from('technicians')
            .select('current_session_token')
            .eq('id', technicianId)
            .single();

        if (!tech || tech.current_session_token !== sessionToken) {
            return NextResponse.json({ success: false, error: 'Unauthorized session' }, { status: 401 });
        }

        // Fetch stock records joined with inventory details
        const { data: stock, error } = await supabase
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
            .neq('quantity', 0) // Return positive and negative stocks, exclude empty
            .order('updated_at', { ascending: false });

        if (error) throw error;

        // Fetch all transaction logs for this technician to map sales & handovers
        const { data: txs } = await supabase
            .from('technician_stock_transactions')
            .select('*')
            .eq('technician_id', technicianId)
            .order('created_at', { ascending: false });

        // Resolve Sales Invoices details and Job details for negative stock events
        const invoiceIds = (txs || [])
            .filter(t => t.transaction_type === 'sale' && t.reference_id)
            .map(t => t.reference_id);

        let invoiceMap = {};
        if (invoiceIds.length > 0) {
            const { data: invoices } = await supabase
                .from('sales_invoices')
                .select(`
                    id,
                    invoice_number,
                    job_id,
                    jobs (
                        id,
                        job_number,
                        locality,
                        city
                    )
                `)
                .in('id', invoiceIds);

            (invoices || []).forEach(inv => {
                invoiceMap[inv.id] = {
                    invoice_number: inv.invoice_number,
                    job_number: inv.jobs?.job_number || 'N/A',
                    location: [inv.jobs?.locality, inv.jobs?.city].filter(Boolean).join(', ') || 'Unknown Location'
                };
            });
        }

        // Resolve Inventory names map for handover items lookup
        const allProductIds = (txs || []).map(t => t.product_id);
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

        // Group handover transactions by batch ID (reference_id) to figure out "other items in same handover"
        const handoverGroups = {};
        (txs || []).forEach(t => {
            if (t.transaction_type === 'handover' && t.reference_id) {
                if (!handoverGroups[t.reference_id]) {
                    handoverGroups[t.reference_id] = [];
                }
                handoverGroups[t.reference_id].push(t);
            }
        });

        // Format stock items and assign detailed context
        const formattedStock = (stock || []).map(st => {
            const productTxs = (txs || []).filter(t => t.product_id === st.product_id);
            const negativeDetails = [];
            const positiveDetails = [];

            if (st.quantity < 0) {
                // Find sales
                const sales = productTxs.filter(t => t.transaction_type === 'sale');
                sales.forEach(s => {
                    const invDetail = invoiceMap[s.reference_id] || { job_number: 'N/A', location: 'Unknown' };
                    negativeDetails.push({
                        date: s.created_at,
                        quantity: Math.abs(s.quantity),
                        job_number: invDetail.job_number,
                        location: invDetail.location
                    });
                });
            } else if (st.quantity > 0) {
                // Find handovers
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
                name: st.inventory?.name || 'Unknown Spare Part',
                category: st.inventory?.category || 'General',
                sku: st.inventory?.sku || '',
                negative_details: negativeDetails,
                positive_details: positiveDetails
            };
        });

        return NextResponse.json({
            success: true,
            stock: formattedStock
        });

    } catch (error) {
        console.error('[API/technician/stock GET Error]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
