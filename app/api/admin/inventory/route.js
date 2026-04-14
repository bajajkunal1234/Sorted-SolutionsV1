import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET - Fetch all inventory items
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')
        const lowStock = searchParams.get('low_stock')

        let query = supabase
            .from('inventory')
            .select('*')
            .order('name', { ascending: true })

        if (category) {
            query = query.eq('category', category)
        }
        if (lowStock === 'true') {
            // Updated to handle both column names if needed, but current_stock is the new standard
            query = query.or('current_stock.lt.min_stock_level,quantity.lt.reorder_level')
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// POST - Create new inventory item
export async function POST(request) {
    try {
        const body = await request.json()

        // ── Column allowlist: only DB columns go to Supabase ──────────────────
        // This prevents camelCase keys from bulk-import from causing 400 errors.
        const ALLOWED_COLUMNS = [
            'name', 'sku', 'type', 'job_type', 'category', 'brand', 'description', 'images',
            'unit_of_measure', 'opening_balance_qty', 'opening_balance_date',
            'current_stock', 'min_stock_level',
            'purchase_price', 'sale_price', 'dealer_price', 'retail_price',
            'gst_applicable', 'gst_rate', 'hsn_code', 'hsn_description',
            'service_terms_template', 'status'
        ];

        // Also handle camelCase → snake_case aliases from bulk import
        const ALIAS_MAP = {
            currentStock:      'current_stock',
            minStockLevel:     'min_stock_level',
            reorderLevel:      'min_stock_level',
            salePrice:         'sale_price',
            purchasePrice:     'purchase_price',
            dealerPrice:       'dealer_price',
            retailPrice:       'retail_price',
            unitOfMeasure:     'unit_of_measure',
            hsnCode:           'hsn_code',
            hsnDescription:    'hsn_description',
            sacCode:           'hsn_description', // legacy alias
            gstApplicable:     'gst_applicable',
            gstRate:           'gst_rate',
            openingBalanceQty: 'opening_balance_qty',
        };

        // First apply alias mapping, then filter to allowed columns only
        const aliased = { ...body };
        for (const [camel, snake] of Object.entries(ALIAS_MAP)) {
            if (aliased[camel] !== undefined && aliased[snake] === undefined) {
                aliased[snake] = aliased[camel];
            }
            delete aliased[camel]; // always remove camelCase version
        }

        const payload = {};
        for (const col of ALLOWED_COLUMNS) {
            if (aliased[col] !== undefined) payload[col] = aliased[col];
        }

        // ── Auto-generate SKU if missing ──────────────────────────────────────
        if (!payload.sku) {
            const prefix = payload.type === 'service' ? 'SVC' : 'PRD';
            const { data: existing } = await supabase
                .from('inventory')
                .select('sku')
                .like('sku', `${prefix}%`);
            const maxNum = (existing || []).reduce((max, r) => {
                const n = parseInt((r.sku || '').replace(prefix, '')) || 0;
                return n > max ? n : max;
            }, 0);
            payload.sku = `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
        }

        // Defaults
        if (!payload.status) payload.status = 'active';
        if (!payload.type) payload.type = 'product';

        const { data, error } = await supabase
            .from('inventory')
            .insert([payload])
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PUT - Update inventory item
export async function PUT(request) {
    try {
        const body = await request.json()
        const { id, ...updates } = body

        const { data, error } = await supabase
            .from('inventory')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// DELETE - Delete inventory item
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        const { error } = await supabase
            .from('inventory')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
