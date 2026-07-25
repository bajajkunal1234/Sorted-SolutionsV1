const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function resync() {
    console.log("Recalculating technician stocks from transactions...");

    // 1. Fetch all stock transactions
    const { data: txs, error: txError } = await supabase
        .from('technician_stock_transactions')
        .select('*');

    if (txError) {
        console.error("Error fetching transactions:", txError);
        return;
    }

    // 2. Aggregate quantities by technician_id and product_id
    const aggregates = {};
    txs.forEach(t => {
        const key = `${t.technician_id}:${t.product_id}`;
        if (!aggregates[key]) {
            aggregates[key] = 0;
        }
        aggregates[key] += t.quantity;
    });

    console.log("Aggregates computed:", aggregates);

    // 3. Clear current technician_stock table to build fresh
    const { error: deleteError } = await supabase
        .from('technician_stock')
        .delete()
        .neq('id', 'efa3b3e6-0946-473f-99d1-6fcc1bd2b4f8'); // delete all rows safely

    if (deleteError) {
        console.error("Error clearing stock table:", deleteError);
        return;
    }

    // 4. Insert computed stocks (exclude zero stocks)
    const insertRows = Object.keys(aggregates)
        .map(key => {
            const [technician_id, product_id] = key.split(':');
            return {
                technician_id,
                product_id,
                quantity: aggregates[key],
                updated_at: new Date().toISOString()
            };
        })
        .filter(r => r.quantity !== 0);

    if (insertRows.length > 0) {
        const { error: insertError } = await supabase
            .from('technician_stock')
            .insert(insertRows);

        if (insertError) {
            console.error("Error inserting recalculated stocks:", insertError);
        } else {
            console.log(`Successfully recalculated and synchronized ${insertRows.length} stock records!`);
        }
    } else {
        console.log("No stocks to synchronize.");
    }
}

resync();
