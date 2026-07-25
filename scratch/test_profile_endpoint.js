const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('1. Loading Vinod\'s session token...');
    const { data: tech } = await supabase
        .from('technicians')
        .select('id, current_session_token')
        .eq('name', 'Vinod Gupta Tech')
        .single();

    if (!tech || !tech.current_session_token) {
        console.error('No active session token found for Vinod');
        return;
    }

    const url = `http://localhost:3000/api/technician/profile?technicianId=${tech.id}`;
    console.log('2. Requesting:', url);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-session-token': tech.current_session_token
            }
        });

        console.log('Response Status:', response.status);
        const data = await response.json();
        console.log('Response Body:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Request to local server failed:', err.message);
    }
}

run();
