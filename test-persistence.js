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
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDirectPersistence() {
    const testPageId = 'cat-ac-repair-test';
    const testData = {
        page_id: testPageId,
        page_type: 'cat',
        hero_settings: { title: 'Direct Test Title', subtitle: 'Does this persist?' },
        updated_at: new Date().toISOString()
    };

    console.log(`[TEST] Upserting to page_settings for ${testPageId}...`);
    const { data: upsertData, error: upsertError } = await supabase
        .from('page_settings')
        .upsert(testData, { onConflict: 'page_id' })
        .select();

    if (upsertError) {
        console.error('[TEST] Upsert Error:', upsertError);
        return;
    }
    console.log('[TEST] Upsert Success:', upsertData);

    console.log(`[TEST] Verifying persistence for ${testPageId}...`);
    const { data: verifyData, error: verifyError } = await supabase
        .from('page_settings')
        .select('*')
        .eq('page_id', testPageId)
        .single();

    if (verifyError) {
        console.error('[TEST] Verify Error:', verifyError);
    } else {
        console.log('[TEST] Verify Success. Title in DB:', verifyData.hero_settings?.title);
    }

    // Cleanup
    // await supabase.from('page_settings').delete().eq('page_id', testPageId);
}

testDirectPersistence();
