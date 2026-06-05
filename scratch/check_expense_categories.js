const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Key not found in env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCategories() {
    // Check website_settings for expense categories
    const { data, error } = await supabase
        .from('website_settings')
        .select('*')
        .eq('key', 'expense-categories')
        .single();
    
    if (error) {
        console.error('Error fetching categories setting:', error);
    } else {
        console.log('Expense Categories Setting:', JSON.stringify(data, null, 2));
    }
}

checkCategories();
