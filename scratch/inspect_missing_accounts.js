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

async function inspect() {
    const { data: accounts, error: accErr } = await supabase
        .from('accounts')
        .select('*');
    if (accErr) {
        console.error(accErr);
        return;
    }

    const { data: allLeads, error: leadsErr } = await supabase
        .from('lead_attributions')
        .select('*');
    if (leadsErr) {
        console.error(leadsErr);
        return;
    }

    const leadPhones = new Set(allLeads.map(l => l.phone));
    
    // Find customer accounts that are not in lead_attributions
    const customerAccounts = accounts.filter(a => a.role === 'customer' || !a.role);
    const missing = [];
    
    customerAccounts.forEach(acc => {
        const cleanP = cleanPhone10(acc.mobile || acc.phone);
        if (cleanP && !leadPhones.has(cleanP)) {
            missing.push(acc);
        }
    });

    console.log(`Found ${missing.length} missing customer accounts:`);
    missing.forEach((m, i) => {
        console.log(`[${i+1}] Name: "${m.name}", Mobile: ${m.mobile}, Phone: ${m.phone}, Source: "${m.acquisition_source}", Channel: "${m.lead_channel}", Created: ${m.created_at}`);
    });
}

inspect();
