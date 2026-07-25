const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUpsert() {
    const data = {
        technician_id: '0afe33e9-74e5-4cb4-82b7-dfce153a6540',
        product_id: 'd5539a3d-3c51-414d-9ebd-9dfc0084fc37', // lg magnetron
        quantity: -1,
        updated_at: new Date().toISOString()
    };

    console.log("Attempting upsert of negative stock record:", data);
    const { data: resData, error } = await supabase
        .from('technician_stock')
        .upsert(data, {
            onConflict: 'technician_id,product_id'
        })
        .select();

    if (error) {
        console.error("Upsert failed with error:", error);
    } else {
        console.log("Upsert succeeded! Response data:", resData);
    }
}

testUpsert();
