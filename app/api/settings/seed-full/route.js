import { getSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const LOCATIONS = [
    'andheri', 'malad', 'jogeshwari', 'kandivali', 'goregaon',
    'ville-parle', 'santacruz', 'bandra', 'khar', 'mahim',
    'dadar', 'powai', 'saki-naka', 'ghatkopar', 'kurla'
];
const APPLIANCES = [
    { slug: 'ac-repair', name: 'Air Conditioner', subs: [{ slug: 'split-ac', name: 'Split AC' }, { slug: 'window-ac', name: 'Window AC' }] },
    { slug: 'washing-machine-repair', name: 'Washing Machine', subs: [{ slug: 'front-load', name: 'Front Load' }, { slug: 'top-load', name: 'Top Load' }] },
    { slug: 'refrigerator-repair', name: 'Refrigerator', subs: [{ slug: 'single-door', name: 'Single Door' }, { slug: 'double-door', name: 'Double Door' }] },
    { slug: 'oven-repair', name: 'Microwave Oven', subs: [{ slug: 'microwave-oven', name: 'Microwave Oven' }, { slug: 'otg-oven', name: 'OTG Oven' }] },
    { slug: 'water-purifier-repair', name: 'Water Purifier', subs: [{ slug: 'ro-purifier', name: 'RO Purifier' }, { slug: 'uv-purifier', name: 'UV Purifier' }] },
    { slug: 'hob-repair', name: 'Gas Stove / HOB', subs: [{ slug: 'gas-stove', name: 'Gas Stove' }, { slug: 'built-in-hob', name: 'Built-in HOB' }] },
];
const PROBLEMS = [
    { q: 'Not working at all', a: 'Our technicians diagnose and fix all types of complete failures.' },
    { q: 'Making unusual noise', a: 'We identify the source of abnormal sounds and resolve mechanical issues.' },
    { q: 'Performance issues', a: 'We restore full performance through comprehensive service and parts replacement.' },
    { q: 'Electrical problems', a: 'Our certified technicians handle all electrical faults safely.' },
    { q: 'Needs regular maintenance', a: 'We provide preventive maintenance to extend appliance lifespan.' },
];
function cap(s) { return s.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); }

function buildExpected() {
    const pages = [];
    for (const loc of LOCATIONS) {
        const n = cap(loc);
        pages.push({
            page_id: `loc-${loc}`, page_type: 'location',
            hero_settings: { title: `Appliance Repair Solutions in ${n}`, subtitle: `Trusted repair services across ${n}, Mumbai` },
            problems_settings: { title: `Common Appliance Problems in ${n}`, subtitle: 'Expert diagnosis and repair for all appliances' },
            services_settings: { title: `Repair Services in ${n}`, subtitle: 'Full-range appliance repair at competitive prices' },
            localities_settings: { title: `Nearby Areas in ${n}`, subtitle: 'We cover all localities around you' },
            brands_settings: { items: [] }, faqs_settings: { items: [] }, updated_at: new Date().toISOString()
        });
    }
    for (const app of APPLIANCES) {
        const n = app.name;
        pages.push({
            page_id: `cat-${app.slug}`, page_type: 'category',
            hero_settings: { title: `${n} Repair Services`, subtitle: `Expert ${n.toLowerCase()} repair in Mumbai` },
            problems_settings: { title: `${n} Problems We Solve`, subtitle: `Common ${n.toLowerCase()} issues we fix` },
            services_settings: { title: `${n} Services`, subtitle: 'Transparent pricing, no hidden charges' },
            localities_settings: { title: 'We Are Right In Your Neighbourhood', subtitle: 'Find us in your area' },
            brands_settings: { items: [] }, faqs_settings: { items: [] }, updated_at: new Date().toISOString()
        });
        for (const sub of app.subs) {
            pages.push({
                page_id: `sub-${app.slug}-${sub.slug}`, page_type: 'subcategory',
                hero_settings: { title: `${sub.name} Repair Services`, subtitle: `Expert ${sub.name.toLowerCase()} repair in Mumbai` },
                problems_settings: { title: `${sub.name} Problems We Fix`, subtitle: `Common issues with your ${sub.name.toLowerCase()}` },
                services_settings: { title: `${sub.name} Services & Pricing`, subtitle: 'Starts at competitive prices' },
                localities_settings: { title: 'Service Available Across Mumbai', subtitle: "We're in your neighbourhood" },
                brands_settings: { items: [] }, faqs_settings: { items: [] }, updated_at: new Date().toISOString()
            });
        }
        for (const loc of LOCATIONS) {
            const ln = cap(loc);
            pages.push({
                page_id: `sloc-${loc}-${app.slug}`, page_type: 'sublocation',
                hero_settings: { title: `${n} Repair in ${ln}`, subtitle: `Expert ${n.toLowerCase()} repair in ${ln}, Mumbai` },
                problems_settings: { title: `${n} Problems We Solve in ${ln}`, subtitle: `Common ${n.toLowerCase()} issues in ${ln}` },
                services_settings: { title: `Popular ${n} Services in ${ln}`, subtitle: 'Most booked services in your area' },
                localities_settings: { title: `Nearby Areas in ${ln}`, subtitle: 'Find your specific locality' },
                brands_settings: { items: [] }, faqs_settings: { items: [] }, updated_at: new Date().toISOString()
            });
        }
    }
    return pages;
}

/**
 * GET /api/settings/seed-full
 * Audits then seeds all missing pages in 2 round-trips only.
 * Pass ?audit=1 to only report counts without seeding.
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const auditOnly = searchParams.get('audit') === '1';

    const supabase = getSupabaseServer();
    if (!supabase) return NextResponse.json({ error: 'No DB connection' }, { status: 500 });

    // Round-trip 1: fetch existing IDs only (minimal payload)
    const { data: existing, error: fetchErr } = await supabase
        .from('page_settings').select('page_id,page_type').limit(500);
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

    const existingIds = new Set(existing.map(p => p.page_id));
    const expected = buildExpected();
    const missing = expected.filter(p => !existingIds.has(p.page_id));
    const byType = {};
    for (const p of existing) byType[p.page_type] = (byType[p.page_type] || 0) + 1;
    const extra = [...existingIds].filter(id => !new Set(expected.map(p => p.page_id)).has(id));

    const audit = { expected: expected.length, inDB: existing.length, missing: missing.length, extra: extra.length, extraIds: extra, byType };

    if (auditOnly || missing.length === 0) {
        return NextResponse.json({ ...audit, seeded: 0, message: missing.length === 0 ? 'All pages exist.' : 'Audit only — no changes made.' });
    }

    // Round-trip 2: upsert ALL missing pages in one call
    const { error: upsertErr } = await supabase
        .from('page_settings')
        .upsert(missing, { onConflict: 'page_id' });
    if (upsertErr) return NextResponse.json({ ...audit, error: upsertErr.message }, { status: 500 });

    // Round-trip 3: bulk insert problems (no delete — page_problems may not exist yet)
    const probs = [];
    for (const p of missing) {
        PROBLEMS.forEach((pr, i) => probs.push({
            page_id: p.page_id, problem_title: pr.q,
            problem_description: pr.a, display_order: i
        }));
    }
    const { error: probErr } = await supabase.from('page_problems').insert(probs);

    return NextResponse.json({
        ...audit,
        seeded: missing.length,
        problemsInserted: probErr ? 0 : probs.length,
        message: `Seeded ${missing.length} pages successfully.`
    });
}
