const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Querying database tables in public schema...');
    
    const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    `;
    
    const { data: tablesData, error: tablesError } = await supabase.rpc('exec_sql', {
        sql_query: tablesQuery.trim().replace(/;+$/, '')
    });
    
    console.log('tablesData:', tablesData);
    console.log('tablesError:', tablesError);
    
    if (tablesError) {
        console.error('Error fetching tables:', tablesError);
        return;
    }
    
    if (!tablesData || !Array.isArray(tablesData)) {
        console.error('tablesData is not an array:', tablesData);
        return;
    }
    
    console.log(`Found ${tablesData.length} tables in public schema.`);
    
    const schemaDetails = {};
    
    for (const row of tablesData) {
        const tableName = row.table_name;
        
        const colsQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = '${tableName}'
            ORDER BY ordinal_position;
        `;
        
        const { data: colsData, error: colsError } = await supabase.rpc('exec_sql', {
            sql_query: colsQuery.trim().replace(/;+$/, '')
        });
        
        if (colsError) {
            console.error(`Error fetching columns for ${tableName}:`, colsError);
            continue;
        }
        
        schemaDetails[tableName] = colsData.map(c => ({
            column: c.column_name,
            type: c.data_type,
            nullable: c.is_nullable,
            default: c.column_default
        }));
    }
    
    fs.writeFileSync(
        path.join(__dirname, 'db_schema_dump.json'),
        JSON.stringify(schemaDetails, null, 2)
    );
    console.log('Database schema written to scratch/db_schema_dump.json');
}

run();
