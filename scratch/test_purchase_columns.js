const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
    const { data, error } = await supabase.from('purchase_invoices').select('*').limit(1);
    if (error) {
        console.error('Select error:', error);
    } else {
        console.log('Columns:', Object.keys(data[0] || {}));
    }
}
testQuery();
