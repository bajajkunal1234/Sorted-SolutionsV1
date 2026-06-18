const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: interactions, error } = await supabase
        .from('interactions')
        .select('*')
        .order('timestamp', { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Total interactions fetched: ${interactions.length}`);
    const techInteractions = interactions.filter(i => i.source === 'Technician App' || i.performed_by || i.description.includes('Technician'));
    console.log(`Technician-related interactions: ${techInteractions.length}`);
    
    // Group by type
    const grouped = {};
    techInteractions.forEach(i => {
        if (!grouped[i.type]) {
            grouped[i.type] = [];
        }
        grouped[i.type].push({
            id: i.id,
            description: i.description,
            metadata: i.metadata,
            timestamp: i.timestamp || i.created_at,
            job_id: i.job_id,
            performed_by_name: i.performed_by_name
        });
    });

    console.log('Grouped Types:');
    for (const type in grouped) {
        console.log(`\n--- Type: ${type} (${grouped[type].length} occurrences) ---`);
        console.log('Sample:', JSON.stringify(grouped[type].slice(0, 3), null, 2));
    }
}

run();
