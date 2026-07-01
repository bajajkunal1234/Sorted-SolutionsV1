const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function updateKunal() {
    const { data, error } = await supabase
        .from('technicians')
        .update({ email: 'kunal.bajaj@sortedsolutions.in' })
        .eq('name', 'Kunal Bajaj')
        .select();
        
    if (error) {
        console.error('Error updating Kunal Bajaj:', error);
    } else {
        console.log('Successfully updated Kunal Bajaj email:', data);
    }
}

updateKunal();
