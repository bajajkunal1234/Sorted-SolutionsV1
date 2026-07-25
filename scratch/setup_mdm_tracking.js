const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Service Role Key missing in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Running MDM shift tracking migration...');
    const sql = `
        -- Alter technicians to add mdm_device_id
        ALTER TABLE public.technicians 
        ADD COLUMN IF NOT EXISTS mdm_device_id TEXT;

        -- Alter technician_live_locations to add duty_status
        ALTER TABLE public.technician_live_locations 
        ADD COLUMN IF NOT EXISTS duty_status VARCHAR(50) DEFAULT 'offline';

        -- Alter technician_attendance to add shift and lunch times
        ALTER TABLE public.technician_attendance 
        ADD COLUMN IF NOT EXISTS shift_start_time TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS shift_end_time TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS lunch_start_time TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS lunch_end_time TIMESTAMPTZ;
    `;
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
        console.error('Migration error:', error);
        return;
    }
    console.log('Migration successfully completed:', data);
}

run();
