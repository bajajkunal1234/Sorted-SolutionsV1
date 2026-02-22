const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function parseEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            let value = match[2] || '';
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            env[match[1]] = value;
        }
    });
    return env;
}

const env = parseEnv(path.join(process.cwd(), '.env.local'));
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const tables = [
        'page_settings',
        'page_problems',
        'page_services',
        'page_localities',
        'page_brands_mapping',
        'page_faqs_mapping'
    ];

    console.log('--- Schema Investigation ---');

    // Using RPC or raw query if possible, but let's try a simpler approach: select 1 row and check keys
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`Table ${table}: ERROR - ${error.message}`);
        } else {
            const columns = data.length > 0 ? Object.keys(data[0]) : 'No data to check';
            console.log(`Table ${table}: ${columns === 'No data to check' ? columns : columns.join(', ')}`);

            // If no data, try to check via information_schema (if allowed via RPC)
        }
    }
}

checkSchema();
