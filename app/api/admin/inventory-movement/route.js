import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/inventory-movement?inventory_id=XXX
 * Returns all sales and purchase invoices that contain this inventory item.
 * Items are stored as JSONB arrays in each invoice, so we filter server-side.
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const inventoryId = searchParams.get('inventory_id')

        if (!inventoryId) {
            return NextResponse.json({ success: false, error: 'inventory_id is required' }, { status: 400 })
        }

        // Fetch all sales invoices and purchase invoices in parallel
        const [salesRes, purchaseRes] = await Promise.all([
            supabase
                .from('sales_invoices')
                .select('id, invoice_number, date, account_name, items, total_amount, status')
                .order('date', { ascending: false }),
            supabase
                .from('purchase_invoices')
                .select('id, invoice_number, date, account_name, items, total_amount, status')
                .order('date', { ascending: false })
        ])

        if (salesRes.error) throw salesRes.error
        if (purchaseRes.error) throw purchaseRes.error

        const movement = []

        // Filter sales invoices for this inventory item
        for (const invoice of (salesRes.data || [])) {
            const items = invoice.items || []
            const matchedItem = items.find(
                item => item.inventory_id === inventoryId || item.id === inventoryId
            )
            if (matchedItem) {
                movement.push({
                    type: 'sale',
                    voucher_number: invoice.invoice_number,
                    voucher_id: invoice.id,
                    date: invoice.date,
                    party: invoice.account_name,
                    qty: parseFloat(matchedItem.quantity || matchedItem.qty || 0),
                    unit_price: parseFloat(matchedItem.unit_price || matchedItem.rate || matchedItem.price || 0),
                    total: parseFloat(matchedItem.total || matchedItem.amount || 0),
                    status: invoice.status,
                    created_at: invoice.date
                })
            }
        }

        // Filter purchase invoices for this inventory item
        for (const invoice of (purchaseRes.data || [])) {
            const items = invoice.items || []
            const matchedItem = items.find(
                item => item.inventory_id === inventoryId || item.id === inventoryId
            )
            if (matchedItem) {
                movement.push({
                    type: 'purchase',
                    voucher_number: invoice.invoice_number,
                    voucher_id: invoice.id,
                    date: invoice.date,
                    party: invoice.account_name,
                    qty: parseFloat(matchedItem.quantity || matchedItem.qty || 0),
                    unit_price: parseFloat(matchedItem.unit_price || matchedItem.rate || matchedItem.price || 0),
                    total: parseFloat(matchedItem.total || matchedItem.amount || 0),
                    status: invoice.status,
                    created_at: invoice.date
                })
            }
        }

        // Sort by date descending
        movement.sort((a, b) => new Date(b.date) - new Date(a.date))

        return NextResponse.json({ success: true, data: movement })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
