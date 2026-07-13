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
    console.log('1. Altering technicians table to add weekly_off_day...');
    const alterQuery = `
        ALTER TABLE public.technicians 
        ADD COLUMN IF NOT EXISTS weekly_off_day TEXT DEFAULT 'Sunday';
    `;
    const { data: alterData, error: alterErr } = await supabase.rpc('exec_sql', { sql_query: alterQuery });
    if (alterErr) {
        console.error('Alter table error:', alterErr);
        return;
    }
    console.log('Alter result:', alterData);

    console.log('2. Creating technician_attendance table...');
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS public.technician_attendance (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            technician_id UUID NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            status VARCHAR(50) NOT NULL CHECK (status IN ('present', 'absent', 'half_day', 'weekly_off', 'leave')),
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE (technician_id, date)
        );
    `;
    const { data: createData, error: createErr } = await supabase.rpc('exec_sql', { sql_query: createTableQuery });
    if (createErr) {
        console.error('Create table error:', createErr);
        return;
    }
    console.log('Create table result:', createData);

    console.log('3. Enabling RLS and creating policies...');
    const policiesQuery = `
        ALTER TABLE public.technician_attendance ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow all for technician_attendance" ON public.technician_attendance;
        CREATE POLICY "Allow all for technician_attendance" ON public.technician_attendance FOR ALL USING (true) WITH CHECK (true);
    `;
    const { data: policiesData, error: policiesErr } = await supabase.rpc('exec_sql', { sql_query: policiesQuery });
    if (policiesErr) {
        console.error('Policies error:', policiesErr);
        return;
    }
    console.log('Policies result:', policiesData);
    
    console.log('Attendance setup script finished successfully.');
}

run();
