require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkGroups() {
    const { data: groups, error } = await supabase
        .from('account_groups')
        .select('*');

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Total groups: ${groups.length}`);
    for(const g of groups) {
        console.log(`- ${g.id} (name: ${g.name}, parent: ${g.parent_id})`);
    }
}
checkGroups();
