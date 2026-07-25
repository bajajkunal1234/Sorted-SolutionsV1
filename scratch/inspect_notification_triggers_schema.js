const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: triggers } = await supabase
        .from('notification_triggers')
        .select('*')
        .limit(1);
    if (triggers && triggers.length > 0) {
        console.log("Trigger Columns:", Object.keys(triggers[0]));
    } else {
        console.log("No triggers found or empty table");
    }
}
run();
