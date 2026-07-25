const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("=== CHECKING NOTIFICATION CONFIGURATION ===");
    
    // 1. Fetch triggers
    const { data: triggers, error: trgError } = await supabase
        .from('notification_triggers')
        .select('*');
        
    if (trgError) {
        console.error("Error fetching notification_triggers:", trgError);
    } else {
        console.log("Triggers:", JSON.stringify(triggers, null, 2));
    }

    // 2. Fetch templates
    const { data: templates, error: tmpError } = await supabase
        .from('notification_templates')
        .select('*');
        
    if (tmpError) {
        console.error("Error fetching notification_templates:", tmpError);
    } else {
        console.log("Templates:", JSON.stringify(templates, null, 2));
    }

    // 3. Fetch admin recipients
    const { data: admins, error: admError } = await supabase
        .from('admin_recipients')
        .select('*');
        
    if (admError) {
        console.error("Error fetching admin_recipients:", admError);
    } else {
        console.log("Admin Recipients:", JSON.stringify(admins, null, 2));
    }
}

run();
