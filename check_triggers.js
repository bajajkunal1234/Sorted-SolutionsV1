const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTriggers() {
    const { data: triggers } = await supabase
        .from('notification_triggers')
        .select('id, event_type, channel, audience, is_active, notification_templates(name)')
        .order('event_type');
    
    console.log("ALL DB Triggers:", JSON.stringify(triggers, null, 2));
}

checkTriggers();
