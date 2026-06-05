const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('1. Querying technicians schema to confirm data types...');
    const schemaQuery = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'technicians';
    `;
    const { data: schemaData, error: schemaErr } = await supabase.rpc('exec_sql', { sql_query: schemaQuery });
    if (schemaErr) {
        console.error('Schema check error:', schemaErr);
        return;
    }
    console.log('Technicians columns:', schemaData);

    console.log('\n2. Creating technician_leaves table...');
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS public.technician_leaves (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            technician_id UUID NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
            leave_date DATE NOT NULL,
            reason TEXT,
            status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE (technician_id, leave_date)
        );
    `;
    const { data: createData, error: createErr } = await supabase.rpc('exec_sql', { sql_query: createTableQuery });
    if (createErr) {
        console.error('Create table error:', createErr);
        return;
    }
    console.log('Create table result:', createData);

    console.log('\n3. Checking if technician_leaves was created...');
    const checkQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'technician_leaves';
    `;
    const { data: checkData, error: checkErr } = await supabase.rpc('exec_sql', { sql_query: checkQuery });
    if (checkErr) {
        console.error('Check table error:', checkErr);
        return;
    }
    console.log('technician_leaves columns:', checkData);
}

run();
