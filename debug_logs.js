const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    console.log("Testing insert...");
    
    // Check table info roughly
    const { data, error } = await supabase.from('notification_logs').insert({
        trigger_id: '80976afe-05bf-420c-878a-ec38540df14a',
        channel: 'push',
        recipient_type: 'admin',
        recipient_id: 'admin',
        recipient_name: 'Admin',
        event_type: 'job_started',
        status: 'skipped',
        error: null,
        sent_at: new Date().toISOString()
    }).select();
        
    console.log("Error if any:", error);
    console.log("Inserted:", data);
}

testInsert();
