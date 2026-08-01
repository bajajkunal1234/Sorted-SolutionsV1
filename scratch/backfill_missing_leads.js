require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { trackLeadAttribution } = require('../lib/lead-tracker');

function cleanPhone10(phone) {
    if (!phone) return null;
    const cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.length === 10) return cleaned;
    if (cleaned.length > 10 && cleaned.startsWith('91') && cleaned.length === 12) {
        return cleaned.substring(2);
    }
    return cleaned.slice(-10);
}

async function backfill() {
    console.log('Starting backfill for missing customer leads...');

    // 1. Fetch all customer accounts
    const { data: accounts, error: accErr } = await supabase
        .from('accounts')
        .select('*');
    if (accErr) {
        console.error('Error fetching accounts:', accErr);
        return;
    }
    const customerAccounts = accounts.filter(a => a.role === 'customer' || !a.role);

    // 2. Fetch all lead attributions
    const { data: allLeads, error: leadsErr } = await supabase
        .from('lead_attributions')
        .select('phone');
    if (leadsErr) {
        console.error('Error fetching lead_attributions:', leadsErr);
        return;
    }
    const leadPhones = new Set(allLeads.map(l => l.phone));

    // 3. Find missing ones
    const missing = [];
    customerAccounts.forEach(acc => {
        const cleanP = cleanPhone10(acc.mobile || acc.phone);
        if (cleanP && !leadPhones.has(cleanP)) {
            missing.push(acc);
        }
    });

    console.log(`Found ${missing.length} missing customer accounts to backfill.`);

    // 4. Backfill each one
    let successCount = 0;
    for (const acc of missing) {
        const cleanP = cleanPhone10(acc.mobile || acc.phone);
        const source = acc.acquisition_source || 'direct';
        const contactDate = acc.created_at || new Date().toISOString();

        console.log(`Backfilling Name: "${acc.name}", Phone: ${cleanP}, Source: ${source}, Date: ${contactDate}`);

        try {
            const res = await trackLeadAttribution(supabase, {
                phone: cleanP,
                name: acc.name,
                conversion_type: 'manual_account',
                status: 'converted',
                notes: 'Backfilled automatically from existing customer account.',
                lead_source: source,
                first_contact_at: contactDate
            });

            if (res.success) {
                successCount++;
            } else {
                console.error(`- Failed to backfill ${acc.name}: ${res.error}`);
            }
        } catch (err) {
            console.error(`- Exception backfilling ${acc.name}:`, err.message);
        }
    }

    console.log(`\n--- BACKFILL SUMMARY ---`);
    console.log(`Successfully backfilled: ${successCount} / ${missing.length} accounts.`);
}

backfill();
