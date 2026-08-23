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
    const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*, customer:accounts(*)')
        .ilike('customer_name', '%HS Tiwari%');

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Found ${jobs.length} jobs:`);
    jobs.forEach(j => {
        console.log(`Job Number: ${j.job_number}, ID: ${j.id}, Status: ${j.status}, Customer Name: ${j.customer_name}, Technician Name: ${j.technician_name}`);
        console.log(`Customer Mobile: ${j.customer?.mobile}, Phone: ${j.customer?.phone}`);
        console.log(`Property Address:`, j.property);
        console.log(`----------------------------------------`);
    });
}

run();
