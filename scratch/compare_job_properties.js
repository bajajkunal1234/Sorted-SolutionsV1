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
    const { data: schedJobs } = await supabase.from('jobs').select('*, customer:accounts(*), technician:technicians(*)').eq('status', 'scheduled').limit(1);
    const { data: quoteJobs } = await supabase.from('jobs').select('*, customer:accounts(*), technician:technicians(*)').eq('status', 'quotation_sent').limit(1);

    console.log('--- SCHEDULED JOB EXAMPLE ---');
    if (schedJobs && schedJobs[0]) {
        const j = schedJobs[0];
        console.log('job_number:', j.job_number);
        console.log('scheduled_date:', j.scheduled_date);
        console.log('dueDate:', j.dueDate);
        console.log('technician_name:', j.technician_name);
        console.log('customer_name:', j.customer_name);
        console.log('customerMobile:', j.customerMobile);
        console.log('customerPhone:', j.customerPhone);
        console.log('customer relation mobile:', j.customer?.mobile);
        console.log('customer relation phone:', j.customer?.phone);
        console.log('property:', j.property);
    }

    console.log('\n--- QUOTATION SENT JOB EXAMPLE ---');
    if (quoteJobs && quoteJobs[0]) {
        const j = quoteJobs[0];
        console.log('job_number:', j.job_number);
        console.log('scheduled_date:', j.scheduled_date);
        console.log('dueDate:', j.dueDate);
        console.log('technician_name:', j.technician_name);
        console.log('customer_name:', j.customer_name);
        console.log('customerMobile:', j.customerMobile);
        console.log('customerPhone:', j.customerPhone);
        console.log('customer relation mobile:', j.customer?.mobile);
        console.log('customer relation phone:', j.customer?.phone);
        console.log('property:', j.property);
    }
}

run();
