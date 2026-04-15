import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET - Fetch all inventory items
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')
        const lowStock = searchParams.get('low_stock')
        const includeArchived = searchParams.get('include_archived') === 'true'

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
        if (!includeArchived) {
            query = query.neq('status', 'archived')
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

        // camelCase → snake_case aliases
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
            sacCode:           'hsn_code',
            gstApplicable:     'gst_applicable',
            gstRate:           'gst_rate',
            openingBalanceQty: 'opening_balance_qty',
        };

        const aliased = { ...body };
        for (const [camel, snake] of Object.entries(ALIAS_MAP)) {
            if (aliased[camel] !== undefined && aliased[snake] === undefined) {
                aliased[snake] = aliased[camel];
            }
            delete aliased[camel];
        }

        const payload = {};
        for (const col of ALLOWED_COLUMNS) {
            if (aliased[col] !== undefined) payload[col] = aliased[col];
        }

        // ── 1. Normalise type ─────────────────────────────────────────────────
        payload.type = payload.type
            ? String(payload.type).toLowerCase().trim()
            : 'product';

        // ── 2. Normalise job_type labels → DB keys ────────────────────────────
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

        // ── 4. Auto-generate SKU ──────────────────────────────────────────────
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
        payload.gst_applicable = true;

        // ── 5. Duplicate name check ───────────────────────────────────────────
        if (payload.name) {
            const { data: dupe } = await supabase
                .from('inventory')
                .select('id, name, sku')
                .ilike('name', payload.name.trim())
                .limit(1)
                .single();
            if (dupe) {
                return NextResponse.json({
                    success: true,
                    data: dupe,
                    skipped_duplicate: true,
                    message: `Skipped — "${dupe.name}" already exists (${dupe.sku})`
                });
            }
        }

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

// PUT - Update inventory item (also used for archive)
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

// DELETE - Delete inventory item (with dependency check)
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const force = searchParams.get('force') === 'true'

        if (!id) {
            return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
        }

        // ── Dependency check ──────────────────────────────────────────────────
        // Check if this inventory item appears in any transaction's line items.
        // Line items are stored as JSONB arrays with product_id or inventory_id.
        if (!force) {
            const TRANSACTION_TABLES = [
                { table: 'sales_invoices',    label: 'Sales Invoice' },
                { table: 'purchase_invoices', label: 'Purchase Invoice' },
                { table: 'quotations',        label: 'Quotation' },
                { table: 'receipt_vouchers',  label: 'Receipt Voucher' },
                { table: 'payment_vouchers',  label: 'Payment Voucher' },
            ];

            const blocking = [];

            for (const { table, label } of TRANSACTION_TABLES) {
                // Try direct inventory_id FK match
                try {
                    const { data: fkRows } = await supabase
                        .from(table)
                        .select('id, invoice_number, voucher_number, quotation_number, date')
                        .or(`items.cs.[{"inventory_id":"${id}"}],items.cs.[{"product_id":"${id}"}]`)
                        .limit(5);

                    if (fkRows && fkRows.length > 0) {
                        fkRows.forEach(row => {
                            const ref = row.invoice_number || row.voucher_number || row.quotation_number || row.id;
                            blocking.push({ table: label, ref, date: row.date });
                        });
                    }
                } catch (_) {
                    // table may not exist or column pattern differs — skip silently
                }
            }

            // Also check inventory_logs (stock movements)
            try {
                const { data: logRows, count } = await supabase
                    .from('inventory_logs')
                    .select('id', { count: 'exact' })
                    .eq('inventory_id', id)
                    .limit(1);
                if (count && count > 0) {
                    blocking.push({ table: 'Stock Logs', ref: `${count} movement record(s)`, date: null });
                }
            } catch (_) {}

            if (blocking.length > 0) {
                return NextResponse.json({
                    success: false,
                    blocking: true,
                    dependencies: blocking,
                    error: `This item is used in ${blocking.length} record(s) and cannot be deleted.`
                }, { status: 409 })
            }
        }

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
