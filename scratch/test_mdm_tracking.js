const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Service Role Key missing in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('1. Checking technicians table columns...');
    const { data: techCols, error: techErr } = await supabase
        .from('technicians')
        .select('id, name, mdm_device_id')
        .limit(1);
    
    if (techErr) {
        console.error('Error selecting technicians cols:', techErr);
    } else {
        console.log('Technicians columns are correct. Sample data:', techCols);
    }

    console.log('2. Checking technician_live_locations columns...');
    const { data: locCols, error: locErr } = await supabase
        .from('technician_live_locations')
        .select('technician_id, duty_status, is_online')
        .limit(1);

    if (locErr) {
        console.error('Error selecting technician_live_locations cols:', locErr);
    } else {
        console.log('Live location columns are correct. Sample data:', locCols);
    }

    console.log('3. Checking technician_attendance columns...');
    const { data: attCols, error: attErr } = await supabase
        .from('technician_attendance')
        .select('technician_id, date, status, shift_start_time, shift_end_time, lunch_start_time, lunch_end_time')
        .limit(1);

    if (attErr) {
        console.error('Error selecting technician_attendance cols:', attErr);
    } else {
        console.log('Attendance columns are correct. Sample data:', attCols);
    }
}

verify();
