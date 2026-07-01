const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixHitesh() {
    const { data, error } = await supabase
        .from('technicians')
        .update({ email: 'hiteshtayde@sortedsolutions.in' })
        .eq('name', 'Hitesh Tayde Tech')
        .select();
        
    if (error) {
        console.error('Error fixing Hitesh Tayde:', error);
    } else {
        console.log('Successfully fixed Hitesh Tayde email:', data);
    }
}

fixHitesh();
