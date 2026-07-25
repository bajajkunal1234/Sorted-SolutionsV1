const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: triggers } = await supabase
        .from('notification_triggers')
        .select('event_type, is_active, audience');
    console.log("Trigger Events:", triggers);
}
run();
