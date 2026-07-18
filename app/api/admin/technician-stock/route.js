import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/technician-stock
 * Retrieves stock list and transaction history for a technician.
 */
export async function GET(request) {
    try {
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

        const formattedStock = (stock || []).map(st => ({
            id: st.id,
            product_id: st.product_id,
            quantity: st.quantity,
            name: st.inventory?.name || 'Unknown Part',
            category: st.inventory?.category || 'General',
            sku: st.inventory?.sku || ''
        }));

        const formattedTx = (transactions || []).map(tx => ({
            id: tx.id,
            product_id: tx.product_id,
            quantity: tx.quantity,
            transaction_type: tx.transaction_type,
            reference_id: tx.reference_id,
            notes: tx.notes,
            created_by: tx.created_by,
            created_at: tx.created_at,
            product_name: tx.inventory?.name || 'Unknown Part',
            product_sku: tx.inventory?.sku || ''
        }));

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
        const body = await request.json();
        const { technician_id, items, created_by = 'Admin' } = body;

        if (!technician_id) {
            return NextResponse.json({ success: false, error: 'Technician ID is required' }, { status: 400 });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ success: false, error: 'Handover items array is required' }, { status: 400 });
        }

        // Process each handover item
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
                    created_by
                });

            if (logError) throw logError;
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[API/admin/technician-stock POST Error]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
