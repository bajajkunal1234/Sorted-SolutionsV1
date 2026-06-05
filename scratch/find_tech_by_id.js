const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const techId = 'a8d60d4e-3c66-4f77-83f4-9c6a20bb1478';
    
    const { data: tech } = await supabase.from('technicians').select('*').eq('id', techId).single();
    console.log('In technicians table:', tech);
    
    const { data: acc } = await supabase.from('accounts').select('*').eq('id', techId).single();
    console.log('In accounts table:', acc);
}
run();
