require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('*, customer:accounts(*), assigned_technician:technicians(id, name, phone)')
    .eq('technician_id', '0afe33e9-74e5-4cb4-82b7-dfce153a6540')
    .not('status', 'in', '("closed","cancelled")')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  const job = jobs.find(j => j.job_number === 'JOB-1099');
  console.log('JOB-1099:', job ? job.status : 'Not found');
  
  const job1100 = jobs.find(j => j.job_number === 'JOB-1100');
  console.log('JOB-1100:', job1100 ? job1100.status : 'Not found');
}
test();
