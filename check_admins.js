const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdmins() {
    const { data: admins } = await supabase.from('admin_recipients').select('*');
    console.log("admin_recipients:", JSON.stringify(admins, null, 2));

    const { data: recent } = await supabase.from('app_notifications').select('id, title, recipient_type, recipient_id, created_at').order('created_at', { ascending: false }).limit(20);
    console.log("app_notifications:", JSON.stringify(recent, null, 2));
}

checkAdmins();
