const fs = require('fs');
try {
    const envText = fs.readFileSync('c:/Users/KIIT/OneDrive/Desktop/sorted-on-next/.env.local', 'utf8');
    envText.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
            const key = trimmed.substring(0, eqIdx).trim();
            const value = trimmed.substring(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
            process.env[key] = value;
        }
    });
} catch (e) {
    console.error('Failed to read env:', e.message);
}

const { createClient } = require('c:/Users/KIIT/OneDrive/Desktop/sorted-on-next/node_modules/@supabase/supabase-js');
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
    // Search in jobs table
    console.log('--- SEARCHING IN JOBS TABLE ---');
    const { data: jobs, error: err1 } = await supabase
        .from('jobs')
        .select('*')
        .or('customer_name.ilike.%Hemant%,description.ilike.%Hemant%,notes.ilike.%Hemant%');

    if (err1) {
        console.error('Jobs error:', err1);
    } else {
        console.log(`Found ${jobs.length} matching rows in jobs:`);
        jobs.forEach(j => {
            console.log(JSON.stringify(j, null, 2));
            console.log('----------------------------------------');
        });
    }

    // Is there any other table? Let's check other tables in Supabase that might hold booking requests
    console.log('\n--- SEARCHING FOR OTHER TABLES ---');
    // Let's search if there's an 'enquiries' or 'bookings' or 'booking_requests' table
    const tables = ['bookings', 'booking_requests', 'enquiries', 'website_bookings'];
    for (const table of tables) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(5);
            if (!error) {
                console.log(`Table '${table}' exists. Count: ${data.length}`);
                const matches = data.filter(d => JSON.stringify(d).toLowerCase().includes('hemant'));
                if (matches.length > 0) {
                    console.log(`Found matches in '${table}':`, JSON.stringify(matches, null, 2));
                }
            }
        } catch (e) {
            // Table doesn't exist
        }
    }
}

run();
