const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTechs() {
    const { data, error } = await supabase
        .from('technicians')
        .select('*');
        
    if (error) {
        console.error('Error fetching technicians:', error);
    } else {
        console.log('Technicians in database:');
        console.log(JSON.stringify(data, null, 2));
    }
}

checkTechs();
