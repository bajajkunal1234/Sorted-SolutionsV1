const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envText = fs.readFileSync('.env.local', 'utf8');
let url = '', key = '';
envText.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/['"]/g, '');
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
});

const supabase = createClient(url, key);

async function check() {
    const { data, error } = await supabase
        .from('interactions')
        .select('*, jobs(technician_name, technician_id)')
        .order('timestamp', { ascending: false })
        .limit(50);
    if (error) {
        console.error('Error:', error);
    } else {
        fs.writeFileSync('scripts/recent-interactions.json', JSON.stringify(data, null, 2));
        console.log('Done, saved to scripts/recent-interactions.json');
    }
}

check().catch(console.error);
