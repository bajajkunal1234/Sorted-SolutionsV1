const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("=== CHECKING BOOKING TRIGGERS & TEMPLATES ===");
    
    // Check triggers for booking_created_website
    const { data: triggers, error: trgError } = await supabase
        .from('notification_triggers')
        .select('*, notification_templates(*)')
        .or('event_type.eq.booking_created_website,event_type.eq.new_job_request');
        
    if (trgError) {
        console.error("Error:", trgError);
    } else {
        console.log("Booking Triggers & Templates:", JSON.stringify(triggers, null, 2));
    }
}

run();
