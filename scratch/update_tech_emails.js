const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function updateTechs() {
    // 1. Update Vinod Gupta's email
    const { data: vinod, error: vinodError } = await supabase
        .from('technicians')
        .update({ email: 'vinodgupta@sortedsolutions.in' })
        .eq('name', 'Vinod Gupta Tech')
        .select();
        
    if (vinodError) {
        console.error('Error updating Vinod Gupta:', vinodError);
    } else {
        console.log('Successfully updated Vinod Gupta:', vinod);
    }

    // 2. Check if Hitesh Tayde exists, if not, we can let the user create him, or we can check
    const { data: hiteshSearch, error: hiteshError } = await supabase
        .from('technicians')
        .select('*')
        .ilike('name', '%Hitesh%');
        
    if (hiteshError) {
        console.error('Error searching for Hitesh:', hiteshError);
    } else {
        console.log('Search for Hitesh yielded:', hiteshSearch);
    }
}

updateTechs();
