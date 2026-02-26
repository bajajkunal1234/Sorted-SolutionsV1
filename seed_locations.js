// Direct Supabase location seeder - run with: node seed_locations.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://oqwvbwaqcdbggcqvzswv.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODkzODI2NiwiZXhwIjoyMDU0NTE0MjY2fQ.TdS9UKZH4L0PQvlZxa4fCbYiILikhTbKEi0MRpu-9s4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const LOCATIONS = [
    "andheri", "malad", "jogeshwari", "kandivali", "goregaon",
    "ville-parle", "santacruz", "bandra", "khar", "mahim",
    "dadar", "powai", "saki-naka", "ghatkopar", "kurla"
];

const DEFAULT_PROBLEMS = [
    { question: 'Not working at all', answer: 'Our technicians diagnose and fix all types of complete failures.' },
    { question: 'Making unusual noise', answer: 'We identify the source of abnormal sounds and resolve mechanical issues.' },
    { question: 'Performance issues', answer: 'We restore full performance through comprehensive service and parts replacement.' },
    { question: 'Electrical problems', answer: 'Our certified technicians handle all electrical faults safely.' },
    { question: 'Needs regular maintenance', answer: 'We provide preventive maintenance to extend appliance lifespan.' },
];

async function seedLocations() {
    console.log('Seeding 15 location hub pages...');

    const pagesToUpsert = [];
    const problemsToInsert = [];

    for (const loc of LOCATIONS) {
        const locName = loc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const pageId = `loc-${loc}`;
        pagesToUpsert.push({
            page_id: pageId,
            page_type: 'location',
            hero_settings: {
                title: `Appliance Repair Solutions in ${locName}`,
                subtitle: `Trusted repair services across ${locName}, Mumbai`
            },
            problems_settings: { title: `Common Appliance Problems in ${locName}`, subtitle: 'Expert diagnosis and repair for all appliances' },
            services_settings: { title: `Repair Services in ${locName}`, subtitle: 'Full-range appliance repair at competitive prices' },
            localities_settings: { title: `Nearby Areas in ${locName}`, subtitle: 'We cover all localities around you' },
            brands_settings: { items: [] },
            faqs_settings: { items: [] },
            updated_at: new Date().toISOString()
        });
        DEFAULT_PROBLEMS.forEach((p, i) => problemsToInsert.push({
            page_id: pageId, problem_title: p.question,
            problem_description: p.answer, display_order: i
        }));
    }

    // Upsert pages
    const { error: upsertErr } = await supabase.from('page_settings').upsert(pagesToUpsert, { onConflict: 'page_id' });
    if (upsertErr) { console.error('Upsert error:', upsertErr.message); process.exit(1); }
    console.log(`✅ Upserted ${pagesToUpsert.length} location pages`);

    // Clear and insert problems
    const allIds = pagesToUpsert.map(p => p.page_id);
    await supabase.from('page_problems').delete().in('page_id', allIds);
    const { error: probErr } = await supabase.from('page_problems').insert(problemsToInsert);
    if (probErr) console.warn('Problems insert warning:', probErr.message);
    else console.log(`✅ Inserted ${problemsToInsert.length} problem records`);

    // Normalize abbreviated types
    const normalizations = [
        { from: 'loc', to: 'location' }, { from: 'cat', to: 'category' },
        { from: 'sub', to: 'subcategory' }, { from: 'sub-loc', to: 'sublocation' }
    ];
    for (const n of normalizations) {
        const { count } = await supabase.from('page_settings').update({ page_type: n.to }).eq('page_type', n.from).select('page_id', { count: 'exact', head: true });
        if (count > 0) console.log(`✅ Normalized ${count} rows: '${n.from}' → '${n.to}'`);
    }

    console.log('\n🎉 Done! Refresh the Active Service Pages dashboard.');
}

seedLocations().catch(console.error);
