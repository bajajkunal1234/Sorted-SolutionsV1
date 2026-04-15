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
        const ALLOWED_COLUMNS = [
            'name', 'sku', 'type', 'job_type', 'category', 'brand', 'description', 'images',
            'unit_of_measure', 'opening_balance_qty', 'opening_balance_date',
            'current_stock', 'min_stock_level',
            'purchase_price', 'sale_price', 'dealer_price', 'retail_price',
            'gst_applicable', 'gst_rate', 'hsn_code', 'hsn_description',
            'service_terms_template', 'status'
        ];

        // camelCase → snake_case aliases (form submissions & legacy imports)
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
            sacCode:           'hsn_code',      // legacy alias
            gstApplicable:     'gst_applicable',
            gstRate:           'gst_rate',
            openingBalanceQty: 'opening_balance_qty',
        };

        // Apply alias mapping
        const aliased = { ...body };
        for (const [camel, snake] of Object.entries(ALIAS_MAP)) {
            if (aliased[camel] !== undefined && aliased[snake] === undefined) {
                aliased[snake] = aliased[camel];
            }
            delete aliased[camel];
        }

        // Filter to allowed columns only
        const payload = {};
        for (const col of ALLOWED_COLUMNS) {
            if (aliased[col] !== undefined) payload[col] = aliased[col];
        }

        // ── 1. Normalise type to lowercase ────────────────────────────────────
        // Excel may have "Service", "Product", "SERVICE" etc.
        payload.type = payload.type
            ? String(payload.type).toLowerCase().trim()
            : 'product';

        // ── 2. Normalise job_type display labels → DB keys ────────────────────
        // Spreadsheets use "Service / Maintenance"; DB stores "service_maintenance"
        if (payload.job_type) {
            const JOB_TYPE_MAP = {
                'install / uninstall':   'install_uninstall',
                'install/uninstall':     'install_uninstall',
                'install_uninstall':     'install_uninstall',
                'service / maintenance': 'service_maintenance',
                'service/maintenance':   'service_maintenance',
                'service_maintenance':   'service_maintenance',
                'service':               'service_maintenance',
                'maintenance':           'service_maintenance',
                'repair':                'repair',
            };
            const key = String(payload.job_type).toLowerCase().trim();
            payload.job_type = JOB_TYPE_MAP[key] || null;
        }

        // ── 3. Coerce empty strings → null for numeric columns ────────────────
        // Services often leave purchase_price blank; Postgres rejects "" for numeric.
        const NUMERIC_COLS = [
            'current_stock', 'min_stock_level', 'opening_balance_qty',
            'purchase_price', 'sale_price', 'dealer_price', 'retail_price',
            'gst_rate'
        ];
        for (const col of NUMERIC_COLS) {
            const val = payload[col];
            if (val === '' || val === null || val === undefined) {
                payload[col] = null;
            } else {
                const parsed = parseFloat(val);
                payload[col] = isNaN(parsed) ? null : parsed;
            }
        }

        // Services don't carry stock
        if (payload.type === 'service') {
            payload.current_stock       = null;
            payload.min_stock_level     = null;
            payload.opening_balance_qty = null;
        }

        // ── 4. Auto-generate SKU if missing ───────────────────────────────────
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
        payload.gst_applicable = true; // always mandatory

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
