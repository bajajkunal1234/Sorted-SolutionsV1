const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const id = 'a886b94c-2807-40d3-95c9-220ec28b3c3d';
    console.log('Testing job closure update for id:', id);
    const { data, error } = await supabase
        .from('jobs')
        .update({ 
            status: 'closed', 
            completed_at: new Date().toISOString(),
            internal_notes: 'Test note'
        })
        .eq('id', id)
        .select()
        .single();
    
    if (error) {
        console.error('SUPABASE ERROR:', error);
    } else {
        console.log('SUCCESS:', data);
    }
}
run();
