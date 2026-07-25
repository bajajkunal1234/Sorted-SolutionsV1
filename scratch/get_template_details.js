const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: template } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('id', '40c91360-1d39-4e38-b211-e6c7823ef019')
        .single();
    console.log("Template details:", template);
}
run();
