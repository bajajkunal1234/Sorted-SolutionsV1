const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: jobs, error } = await supabase
        .from('jobs')
        .select(`
            *,
            customer:accounts(*)
        `)
        .order('created_at', { ascending: false })
        .limit(2);
        
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log(JSON.stringify(jobs, null, 2));
}

run();
