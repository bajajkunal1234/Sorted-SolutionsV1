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

async function runMigration() {
    console.log('Running database migration for technician columns...');

    const query = `
        ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL;
        ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS technician_name TEXT;

        ALTER TABLE quotations ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL;
        ALTER TABLE quotations ADD COLUMN IF NOT EXISTS technician_name TEXT;
    `;

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: query });

    if (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } else {
        console.log('Migration succeeded! Columns added successfully.');
        console.log(data);
    }
}

runMigration();
