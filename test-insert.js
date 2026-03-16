require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/"/g, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY.replace(/"/g, '');
const supabase = createClient(url, key);

async function run() {
    const { data, error } = await supabase
        .from('interactions')
        .select('*')
        .eq('type', 'note-added')
        .order('timestamp', { ascending: false })
        .limit(2);
        
    if (error) {
        console.error(error);
    } else {
        console.log("Latest interactions:", JSON.stringify(data, null, 2));
    }
}
run();

