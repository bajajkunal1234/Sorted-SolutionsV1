const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTemplates() {
    const { data, error } = await supabase.from('notification_templates').select('*');
    if (error) {
        console.error('Error fetching templates:', error);
    } else {
        console.log('Templates:', JSON.stringify(data, null, 2));
    }
}

checkTemplates();
