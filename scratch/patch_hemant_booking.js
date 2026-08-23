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
    const customerId = 'b3d4e739-6236-4be4-92b2-6206d87d9027';
    const jobId = 'd889f808-3dd0-4582-9441-d240250712e2';

    // 1. Update accounts table
    const { error: acctErr } = await supabase
        .from('accounts')
        .update({
            mailing_address: '1119 B2/B1, 11th Floor SRA Kanakia, Near Kanakia Wall Street, Lower Parel, Mumbai',
            properties: [
                {
                    id: Date.now(),
                    name: 'Home',
                    flat_number: '1119 B2/B1',
                    building_name: '11th Floor SRA Kanakia',
                    address: 'Near Kanakia Wall Street',
                    locality: 'Lower Parel',
                    pincode: '400013',
                    contactPhone: '9082925136',
                    contactPerson: 'Hemant'
                }
            ]
        })
        .eq('id', customerId);

    // 2. Update jobs table
    const { error: jobErr } = await supabase
        .from('jobs')
        .update({
            property: {
                id: 'inline:1119 B2/B1|11th Floor SRA Kanakia|Near Kanakia Wall Street|Lower Parel|400013',
                flat_number: '1119 B2/B1',
                building_name: '11th Floor SRA Kanakia',
                address: 'Near Kanakia Wall Street',
                locality: 'Lower Parel',
                city: 'Mumbai',
                pincode: '400013',
                property_type: 'residential',
                _source: 'inline'
            }
        })
        .eq('id', jobId);

    // 3. Update customers table
    const { error: custErr } = await supabase
        .from('customers')
        .update({
            address: {
                flat_number: '1119 B2/B1',
                building_name: '11th Floor SRA Kanakia',
                street: 'Near Kanakia Wall Street',
                locality: 'Lower Parel',
                city: 'Mumbai',
                pincode: '400013'
            },
            properties: [
                {
                    id: Date.now(),
                    name: 'Home',
                    flat_number: '1119 B2/B1',
                    building_name: '11th Floor SRA Kanakia',
                    address: 'Near Kanakia Wall Street',
                    locality: 'Lower Parel',
                    pincode: '400013',
                    contactPhone: '9082925136',
                    contactPerson: 'Hemant'
                }
            ]
        })
        .eq('ledger_id', customerId);

    console.log('Update complete:', { acctErr, jobErr, custErr });
}

run();
