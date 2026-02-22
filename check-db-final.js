const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Basic .env.local parser
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

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const pageId = 'cat-ac-repair';
    console.log(`Checking page_settings for: ${pageId}`);

    const { data: page, error } = await supabase
        .from('page_settings')
        .select('*')
        .eq('page_id', pageId)
        .single();

    if (error) {
        console.error('Error fetching page_settings:', error);
    } else {
        console.log('Page Settings Found:', {
            id: page.id,
            page_id: page.page_id,
            hero: !!page.hero_settings,
            problems: page.problems_settings?.items?.length || 0,
            services: page.services_settings?.items?.length || 0,
            subcategories: page.subcategories_settings?.items?.length || 0,
            visibility: page.section_visibility
        });
        console.log('Problem Items:', JSON.stringify(page.problems_settings?.items, null, 2));
    }

    // Check related tables
    const tables = ['page_problems', 'page_services', 'page_localities'];
    for (const table of tables) {
        const { data, error: tableError } = await supabase
            .from(table)
            .select('*')
            .eq('page_id', pageId);

        if (tableError) {
            console.error(`Error fetching ${table}:`, tableError);
        } else {
            console.log(`${table} count:`, data.length);
            if (data.length > 0 && table === 'page_problems') {
                console.log('First problem row:', data[0]);
            }
        }
    }
}

check();
