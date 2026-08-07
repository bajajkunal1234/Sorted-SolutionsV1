require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { trackLeadAttribution } = require('../lib/lead-tracker');

function cleanPhone10(phone) {
    if (!phone) return null;
    const cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.length < 10) return null;
    return cleaned.slice(-10);
}

async function audit() {
    console.log('Auditing database for missing customer lead attributions...');

    // 1. Fetch all accounts
    const { data: accounts, error: accErr } = await supabase
        .from('accounts')
        .select('*');
    if (accErr) {
        console.error('Error fetching accounts:', accErr);
        return;
    }

    // 2. Filter strictly for customer accounts
    const customerAccounts = accounts.filter(a => 
        a.type === 'customer' || 
        a.under === 'customers' || 
        (a.under || '').toLowerCase().includes('customer') ||
        (a.under || '').toLowerCase().includes('debtor')
    );
    console.log(`Total customer accounts in DB: ${customerAccounts.length}`);

    // 3. Fetch all lead attributions
    const { data: allLeads, error: leadsErr } = await supabase
        .from('lead_attributions')
        .select('phone');
    if (leadsErr) {
        console.error('Error fetching lead_attributions:', leadsErr);
        return;
    }
    const leadPhones = new Set(allLeads.map(l => l.phone));

    // 4. Identify missing leads
    const missing = [];
    customerAccounts.forEach(acc => {
        const cleanP = cleanPhone10(acc.mobile);
        if (cleanP) {
            if (!leadPhones.has(cleanP)) {
                missing.push(acc);
            }
        }
    });

    console.log(`Found ${missing.length} missing customer accounts:`);
    missing.forEach(acc => {
        console.log(`- "${acc.name}" (Phone: ${acc.mobile}, Created: ${acc.created_at}, Source: ${acc.acquisition_source})`);
    });

    if (missing.length === 0) {
        console.log('No missing customer lead attributions found!');
        return;
    }

    console.log('\nBackfilling missing leads...');
    let successCount = 0;
    for (const acc of missing) {
        const cleanP = cleanPhone10(acc.mobile);
        const source = acc.acquisition_source || 'direct';
        const contactDate = acc.created_at || new Date().toISOString();

        try {
            const res = await trackLeadAttribution(supabase, {
                phone: cleanP,
                name: acc.name,
                conversion_type: 'manual_account',
                status: 'converted',
                notes: 'Backfilled automatically during DB audit.',
                lead_source: source,
                first_contact_at: contactDate
            });

            if (res.success) {
                successCount++;
                console.log(`  ✓ Successfully backfilled: "${acc.name}"`);
            } else {
                console.error(`  ✗ Failed to backfill "${acc.name}": ${res.error}`);
            }
        } catch (err) {
            console.error(`  ✗ Exception backfilling "${acc.name}":`, err.message);
        }
    }

    console.log(`\nAudit completed. Successfully backfilled ${successCount} / ${missing.length} missing records.`);
}

audit();
