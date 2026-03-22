// Temporary schema introspection script
// Run with: node scripts/get-schema.mjs

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = ['sales_invoices', 'purchase_invoices', 'quotations', 'receipt_vouchers', 'payment_vouchers'];

for (const table of tables) {
    const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', table)
        .eq('table_schema', 'public')
        .order('ordinal_position');

    if (error) {
        // Fallback: try inserting an empty row to see which columns exist
        console.log(`\n=== ${table} ===`);
        console.error('  info_schema failed:', error.message);
        
        // Try selecting one row to implicitly get column names
        const { data: row, error: selErr } = await supabase
            .from(table)
            .select('*')
            .limit(1);
        
        if (row && row[0]) {
            console.log('  Columns (from sample row):', Object.keys(row[0]).join(', '));
        } else {
            console.log('  Could not determine columns:', selErr?.message);
        }
    } else {
        console.log(`\n=== ${table} ===`);
        console.log('  Columns:', (data || []).map(c => `${c.column_name}(${c.data_type}${c.is_nullable === 'NO' ? ' NOT NULL' : ''})`).join(', '));
    }
}
