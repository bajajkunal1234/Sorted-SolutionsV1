const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envFile = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envFile, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        let key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        env[key] = value.trim();
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runDiagnostics() {
    console.log('--- START DIAGNOSTICS ---\n');

    // 1. List Page IDs
    console.log('1. Listing Page IDs in page_settings:');
    const { data: allIds, error: listError } = await supabase.from('page_settings').select('page_id');
    if (listError) console.error('Error:', listError.message);
    else console.log('IDs Found:', allIds.map(r => r.page_id).join(', ') || 'NONE');

    // 2. Test Manual Upsert for cat-ac-repair
    const testId = 'cat-ac-repair';
    console.log(`\n2. Testing Manual Upsert for ${testId}:`);
    const testData = {
        page_id: testId,
        page_type: 'category',
        hero_settings: {
            title: 'MANUAL TEST HERO',
            subtitle: 'This was inserted via script at ' + new Date().toLocaleTimeString(),
            bg_type: 'gradient'
        },
        section_visibility: { hero: true, problems: true }
    };

    const { data: upsertData, error: uError } = await supabase
        .from('page_settings')
        .upsert(testData, { onConflict: 'page_id' })
        .select();

    if (uError) {
        console.error('Upsert Error:', uError.message);
    } else {
        console.log('Upsert Success! Row returned:', !!upsertData?.[0]);
    }

    // 3. Verify immediately
    const { data: verifyData } = await supabase.from('page_settings').select('*').eq('page_id', testId).single();
    if (verifyData) {
        console.log('\n3. Verification: ROW EXISTS');
        console.log('Hero Title:', verifyData.hero_settings?.title);
    } else {
        console.log('\n3. Verification: ROW STILL MISSING');
    }

    // 4. Check normalized tables for this ID
    const { data: problems } = await supabase.from('page_problems').select('*').eq('page_id', testId);
    console.log(`\n4. Normalized Tables for ${testId}:`);
    console.log(`- page_problems: ${problems?.length || 0} rows`);

    console.log('\n--- END DIAGNOSTICS ---');
}

runDiagnostics();
