const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oqwvbwaqcdbggcqvzswv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkyMDY2NiwiZXhwIjoyMDg2NDk2NjY2fQ.TdS9UKZH4L0PQvlZxa4fCbYiILikhTbKEi0MRpu-9s4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTechs() {
    const { data, error } = await supabase.from('technicians').select('id, name');
    console.log("TECHS:", data);
}
listTechs();
