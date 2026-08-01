require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function cleanPhone10(phone) {
    if (!phone) return null;
    const cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.length === 10) return cleaned;
    if (cleaned.length > 10 && cleaned.startsWith('91') && cleaned.length === 12) {
        return cleaned.substring(2);
    }
    return cleaned.slice(-10);
}

async function findRecord() {
    console.log('Searching for "Shubham", "Payal", or "Versova"...');

    // 1. Search accounts table
    const { data: accounts, error: accErr } = await supabase
        .from('accounts')
        .select('*');
    if (accErr) {
        console.error('Error fetching accounts:', accErr);
        return;
    }

    const matches = accounts.filter(a => {
        const name = (a.name || '').toLowerCase();
        const email = (a.email || '').toLowerCase();
        return name.includes('shubham') || name.includes('payal') || name.includes('versova') ||
               email.includes('shubham') || email.includes('payal') || email.includes('versova');
    });

    console.log(`Found ${matches.length} matching accounts:`);
    matches.forEach(m => {
        console.log(`- ID: ${m.id}, Name: ${m.name}, Phone: ${m.phone}, Mobile: ${m.mobile}, Role: ${m.role}`);
    });

    // 2. Search customers table
    const { data: customers, error: custErr } = await supabase
        .from('customers')
        .select('*');
    if (custErr) {
        console.error('Error fetching customers:', custErr);
    } else {
        const custMatches = customers.filter(c => {
            const name = (c.name || '').toLowerCase();
            return name.includes('shubham') || name.includes('payal') || name.includes('versova');
        });
        console.log(`\nFound ${custMatches.length} matching customers:`);
        custMatches.forEach(m => {
            console.log(`- ID: ${m.id}, Name: ${m.name}, Phone: ${m.phone}, Ledger: ${m.ledger_id}`);
        });
    }

    // 3. Search jobs table
    const { data: jobs, error: jobsErr } = await supabase
        .from('jobs')
        .select('*');
    if (jobsErr) {
        console.error('Error fetching jobs:', jobsErr);
    } else {
        const jobMatches = jobs.filter(j => {
            const name = (j.customer_name || '').toLowerCase();
            const notesStr = typeof j.notes === 'string' ? j.notes : JSON.stringify(j.notes || {});
            return name.includes('shubham') || name.includes('payal') || name.includes('versova') || notesStr.toLowerCase().includes('shubham') || notesStr.toLowerCase().includes('payal');
        });
        console.log(`\nFound ${jobMatches.length} matching jobs:`);
        jobMatches.forEach(j => {
            console.log(`- Job ID: ${j.id}, Job Number: ${j.job_number}, Customer Name: ${j.customer_name}, Status: ${j.status}, Amount: ${j.amount}, Created At: ${j.created_at}`);
        });
    }

    // 4. Search lead_attributions table for these matching phone numbers
    console.log('\nChecking lead_attributions table...');
    const allPhones = new Set();
    matches.forEach(m => {
        const p1 = cleanPhone10(m.phone);
        const p2 = cleanPhone10(m.mobile);
        if (p1) allPhones.add(p1);
        if (p2) allPhones.add(p2);
    });

    if (allPhones.size > 0) {
        const phoneList = Array.from(allPhones);
        const { data: atts, error: attsErr } = await supabase
            .from('lead_attributions')
            .select('*')
            .in('phone', phoneList);
        if (attsErr) {
            console.error('Error fetching lead_attributions:', attsErr);
        } else {
            console.log(`Found ${atts.length} matching lead_attributions:`);
            atts.forEach(a => {
                console.log(`- Phone: ${a.phone}, Name: ${a.name}, Source: ${a.lead_source}, First Contact: ${a.first_contact_at}`);
            });
        }
    } else {
        console.log('No phone numbers extracted from matching accounts.');
    }

    // 5. Audit all customer accounts to see how many are missing from lead_attributions
    const customerAccounts = accounts.filter(a => a.role === 'customer' || !a.role);
    const { data: allLeads, error: allLeadsErr } = await supabase
        .from('lead_attributions')
        .select('phone');
    
    if (allLeadsErr) {
        console.error('Error fetching all lead_attributions:', allLeadsErr);
        return;
    }

    const leadPhones = new Set(allLeads.map(l => l.phone));
    const missingAccounts = [];

    customerAccounts.forEach(acc => {
        const cleanP = cleanPhone10(acc.mobile || acc.phone);
        if (cleanP && !leadPhones.has(cleanP)) {
            missingAccounts.push(acc);
        }
    });

    console.log(`\n--- AUDIT RESULTS ---`);
    console.log(`Total Customer Accounts in DB: ${customerAccounts.length}`);
    console.log(`Total Leads in lead_attributions: ${allLeads.length}`);
    console.log(`Customer Accounts missing from lead_attributions: ${missingAccounts.length}`);
    
    if (missingAccounts.length > 0) {
        console.log('\nFirst 10 missing customer accounts:');
        missingAccounts.slice(0, 10).forEach(m => {
            console.log(`- Name: ${m.name}, Phone/Mobile: ${m.phone}/${m.mobile}, Created At: ${m.created_at}`);
        });
    }
}

findRecord();
