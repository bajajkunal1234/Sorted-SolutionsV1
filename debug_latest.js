const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecent() {
    console.log("Checking recent notifications in the last hour...");
    
    const { data: notifs } = await supabase
        .from('app_notifications')
        .select('id, title, recipient_type, recipient_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
        
    console.log("Recent Notifications:");
    console.dir(notifs, { depth: null });

    const { data: logs } = await supabase
        .from('notification_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
        
    console.log("\nRecent Logs (if inserted):", logs?.length > 0 ? logs : "None");
}

checkRecent();
