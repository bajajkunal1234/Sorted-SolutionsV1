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
    const { data: customer, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', 'b3d4e739-6236-4be4-92b2-6206d87d9027')
        .single();

    if (error) {
        console.error(error);
        return;
    }

    console.log(JSON.stringify(customer, null, 2));
}

run();
