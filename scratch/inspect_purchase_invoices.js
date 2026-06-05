const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    console.log('Inspecting purchase_invoices table...');

    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'purchase_invoices'"
    });

    if (error) {
        console.error('Error fetching schema:', error);
    } else {
        console.log('Columns in purchase_invoices:');
        data.forEach(col => {
            console.log(`- ${col.column_name} (${col.data_type}) [Nullable: ${col.is_nullable}]`);
        });
    }
}

inspectSchema();
