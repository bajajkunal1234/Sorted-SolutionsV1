const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Key not found in env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGeocodeCount() {
    console.log('GOOGLE_GEOCODING_API_KEY is configured:', !!process.env.GOOGLE_GEOCODING_API_KEY);
    
    // Count properties where latitude is null
    const { count, error } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .is('latitude', null);
        
    const { count: total, error: error2 } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true });
        
    if (error || error2) {
        console.error('Database query failed:', error || error2);
    } else {
        console.log(`Geocoding status: ${count} of ${total} properties are missing coordinates (latitude IS NULL).`);
    }
}

checkGeocodeCount();
