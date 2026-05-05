const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: page, error } = await supabase
        .from('page_settings')
        .select('section_visibility')
        .eq('page_id', 'sub-washing-machine-repair-front-load')
        .single();
    if (error) console.error(error);
    console.dir(page, { maxArrayLength: null });
}
run();
