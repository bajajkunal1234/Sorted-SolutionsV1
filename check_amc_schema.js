import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    // Attempt a basic select
    const { data, error } = await supabase.from('active_amcs').select('*').limit(1);
    console.log('Sample Data:', data);
    if (error) console.log('Basic Error:', error);

    // Attempt the problematic join
    const { data: joinData, error: joinError } = await supabase
        .from('active_amcs')
        .select('*, accounts(id, name)')
        .limit(1);
    
    console.log('\nJoin Data:', joinData);
    if (joinError) console.log('Join Error:', joinError);
}

check();
