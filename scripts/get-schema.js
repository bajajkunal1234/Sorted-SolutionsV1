require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const tables = ['sales_invoices', 'purchase_invoices', 'quotations', 'receipt_vouchers', 'payment_vouchers'];
const result = {};

async function main() {
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            result[table] = { error: error.message };
        } else if (data && data[0]) {
            result[table] = { columns: Object.keys(data[0]) };
        } else {
            // Empty table — insert garbage to get schema error
            const { error: e2 } = await supabase.from(table).insert([{}]);
            result[table] = { empty: true, probe: e2?.message || 'no error' };
        }
    }
    fs.writeFileSync('scripts/schema-result.json', JSON.stringify(result, null, 2));
    console.log('Done. See scripts/schema-result.json');
}

main().catch(err => {
    fs.writeFileSync('scripts/schema-result.json', JSON.stringify({ fatal: err.message }, null, 2));
});
