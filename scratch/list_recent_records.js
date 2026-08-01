require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function formatIST(isoString) {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return new Date(date.getTime() + 5.5 * 60 * 60 * 1000).toLocaleString('en-IN', { timeZone: 'UTC' }) + ' IST';
}

async function listRecent() {
    console.log('Fetching recent records (last 48 hours)...');

    const cutOffUTC = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // 1. Fetch recent accounts
    const { data: accounts, error: accErr } = await supabase
        .from('accounts')
        .select('*')
        .gte('created_at', cutOffUTC)
        .order('created_at', { ascending: false });

    if (accErr) {
        console.error('Error fetching accounts:', accErr);
    } else {
        const customerAccounts = accounts.filter(a => a.role === 'customer' || !a.role);
        console.log(`\n--- CUSTOMER ACCOUNTS (${customerAccounts.length} found) ---`);
        customerAccounts.forEach(a => {
            console.log(`- "${a.name}" | Mobile: ${a.mobile} | Source: ${a.acquisition_source} | Created: ${formatIST(a.created_at)} (UTC: ${a.created_at})`);
        });
    }

    // 2. Fetch recent jobs
    const { data: jobs, error: jobsErr } = await supabase
        .from('jobs')
        .select('*')
        .gte('created_at', cutOffUTC)
        .order('created_at', { ascending: false });

    if (jobsErr) {
        console.error('Error fetching jobs:', jobsErr);
    } else {
        console.log(`\n--- JOBS (${jobs.length} found) ---`);
        jobs.forEach(j => {
            console.log(`- Job #${j.job_number} for "${j.customer_name}" | Status: ${j.status} | Source: ${j.source} | Created: ${formatIST(j.created_at)}`);
        });
    }

    // 3. Fetch recent lead_attributions
    const { data: leads, error: leadsErr } = await supabase
        .from('lead_attributions')
        .select('*')
        .gte('first_contact_at', cutOffUTC)
        .order('first_contact_at', { ascending: false });

    if (leadsErr) {
        console.error('Error fetching lead_attributions:', leadsErr);
    } else {
        console.log(`\n--- LEAD ATTRIBUTIONS (${leads.length} found) ---`);
        leads.forEach(l => {
            console.log(`- "${l.name}" | Phone: ${l.phone} | Source: ${l.lead_source} | Conv: ${l.conversion_type} | Contacted: ${formatIST(l.first_contact_at)}`);
        });
    }
}

listRecent();
