const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const envLines = env.split('\n');
envLines.forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    process.env[key] = val.replace(/\\n/g, '\n');
  }
});

// Import the supabase client from lib/supabase
const { supabase } = require('./lib/supabase');

async function run() {
  console.log("Querying using project supabase client (with ipv4-fetch)...");
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
          *,
          customer:accounts(*),
          technician:technicians(*),
          rental:active_rentals(*),
          amc:active_amcs(*)
      `)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error("QUERY ERROR WITH IPV4-FETCH:", error);
    } else {
      console.log("QUERY SUCCESS WITH IPV4-FETCH, count:", data.length);
      console.log("JOB:", JSON.stringify(data[0], null, 2));
    }
  } catch (err) {
    console.error("CRASHED WITH IPV4-FETCH:", err);
  }
}

run();
