const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Querying seeded members...');
    const { data: members, error } = await supabase.from('newera_members').select('*');
    if (error) {
        console.error('Failed to query newera_members:', error);
    } else {
        console.log('Seeded members in database:');
        console.log(JSON.stringify(members, null, 2));
    }

    console.log('Querying table list to verify newera tables...');
    const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'newera_%'"
    });
    if (tablesError) {
        console.error('Failed to query tables list:', tablesError);
    } else {
        console.log('NewEra tables found in public schema:');
        console.log(JSON.stringify(tables, null, 2));
    }
}

run();
