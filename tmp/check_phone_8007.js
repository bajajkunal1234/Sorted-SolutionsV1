require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPhone() {
    const { data: custs } = await supabase.from('customers').select('id, phone, name, password_hash').like('phone', '%8007889260%');
    console.log("Customers:", custs);

    const { data: accs } = await supabase.from('accounts').select('id, mobile, name').like('mobile', '%8007889260%');
    console.log("Accounts:", accs);
}
checkPhone();
