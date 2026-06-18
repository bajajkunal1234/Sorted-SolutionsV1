const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: interactions, error } = await supabase
        .from('interactions')
        .select('type, category, description, source, metadata')
        .limit(200);

    if (error) {
        console.error('Error:', error);
        return;
    }

    const uniqueTypes = {};
    interactions.forEach(i => {
        const key = `${i.type} | ${i.category} | ${i.source}`;
        if (!uniqueTypes[key]) {
            uniqueTypes[key] = [];
        }
        if (uniqueTypes[key].length < 5) {
            uniqueTypes[key].push({ desc: i.description, meta: i.metadata });
        }
    });

    console.log('Unique Type | Category | Source patterns with sample descriptions:');
    console.log(JSON.stringify(uniqueTypes, null, 2));
}

run();
