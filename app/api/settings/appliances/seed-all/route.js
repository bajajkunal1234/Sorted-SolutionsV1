import { getSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const LOCATIONS = [
    "andheri", "malad", "jogeshwari", "kandivali", "goregaon",
    "ville-parle", "santacruz", "bandra", "khar", "mahim",
    "dadar", "powai", "saki-naka", "ghatkopar", "kurla"
];

const CORE_APPLIANCES = [
    {
        id: 'bulk-1', name: 'Air Conditioner', slug: 'ac-repair', icon_name: 'Wind', color: '#3b82f6',
        subcategories: [{ id: 'sub-1', name: 'Split AC', slug: 'split-ac' }, { id: 'sub-2', name: 'Window AC', slug: 'window-ac' }]
    },
    {
        id: 'bulk-2', name: 'Washing Machine', slug: 'washing-machine-repair', icon_name: 'Waves', color: '#10b981',
        subcategories: [{ id: 'sub-3', name: 'Front Load', slug: 'front-load' }, { id: 'sub-4', name: 'Top Load', slug: 'top-load' }]
    },
    {
        id: 'bulk-3', name: 'Refrigerator', slug: 'refrigerator-repair', icon_name: 'Snowflake', color: '#8b5cf6',
        subcategories: [{ id: 'sub-5', name: 'Single Door', slug: 'single-door' }, { id: 'sub-6', name: 'Double Door', slug: 'double-door' }]
    },
    {
        id: 'bulk-4', name: 'Microwave Oven', slug: 'oven-repair', icon_name: 'Flame', color: '#f59e0b',
        subcategories: [{ id: 'sub-7', name: 'Microwave Oven', slug: 'microwave-oven' }, { id: 'sub-8', name: 'OTG Oven', slug: 'otg-oven' }]
    },
    {
        id: 'bulk-5', name: 'Water Purifier', slug: 'water-purifier-repair', icon_name: 'Droplets', color: '#06b6d4',
        subcategories: [{ id: 'sub-9', name: 'RO Purifier', slug: 'ro-purifier' }, { id: 'sub-10', name: 'UV Purifier', slug: 'uv-purifier' }]
    },
    {
        id: 'bulk-6', name: 'Gas Stove / HOB', slug: 'hob-repair', icon_name: 'FlameKindling', color: '#ec4899',
        subcategories: [{ id: 'sub-11', name: 'Gas Stove', slug: 'gas-stove' }, { id: 'sub-12', name: 'Built-in HOB', slug: 'built-in-hob' }]
    }
];

const DEFAULT_PROBLEMS = [
    { question: 'Not working at all', answer: 'Our technicians diagnose and fix all types of complete failures.' },
    { question: 'Making unusual noise', answer: 'We identify the source of abnormal sounds and resolve mechanical issues.' },
    { question: 'Performance issues', answer: 'We restore full performance through comprehensive service and parts replacement.' },
    { question: 'Electrical problems', answer: 'Our certified technicians handle all electrical faults safely.' },
    { question: 'Needs regular maintenance', answer: 'We provide preventive maintenance to extend appliance lifespan.' },
];

/**
 * POST /api/settings/appliances/seed-all
 * Seeds page_settings for ALL core appliances in one request.
 */
export async function POST() {
    const supabase = getSupabaseServer();
    if (!supabase) {
        return NextResponse.json({ success: false, error: 'Database connection missing' }, { status: 500 });
    }

    const results = [];
    let totalSeeded = 0;

    for (const app of CORE_APPLIANCES) {
        try {
            const { slug, subcategories } = app;
            const applianceName = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const pageSettingsToUpsert = [];
            const problemsToInsert = [];
            const localtiesToInsert = [];

            // Category page
            const catPageId = `cat-${slug}`;
            pageSettingsToUpsert.push({
                page_id: catPageId,
                page_type: 'category',
                problems_settings: { title: `${applianceName} Problems We Solve`, subtitle: `Common ${applianceName.toLowerCase()} issues we fix` },
                services_settings: { title: `${applianceName} Services`, subtitle: 'Transparent pricing, no hidden charges' },
                localities_settings: { title: 'We Are Right In Your Neighbourhood', subtitle: 'Find us in your area' },
                brands_settings: { items: [] },
                faqs_settings: { items: [] },
                updated_at: new Date().toISOString()
            });

            DEFAULT_PROBLEMS.forEach((p, i) => problemsToInsert.push({ page_id: catPageId, problem_title: p.question, problem_description: p.answer, display_order: i }));
            LOCATIONS.forEach((loc, i) => localtiesToInsert.push({ page_id: catPageId, locality_name: loc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), display_order: i }));

            // Subcategory pages
            for (const sub of subcategories) {
                const subSlug = sub.slug;
                const subPageId = `sub-${slug}-${subSlug}`;
                pageSettingsToUpsert.push({
                    page_id: subPageId,
                    page_type: 'subcategory',
                    problems_settings: { title: `${sub.name} Problems We Fix`, subtitle: `Common issues with your ${sub.name.toLowerCase()}` },
                    services_settings: { title: `${sub.name} Services & Pricing`, subtitle: 'Starts at competitive prices' },
                    localities_settings: { title: 'Service Available Across Mumbai', subtitle: "We're in your neighbourhood" },
                    brands_settings: { items: [] },
                    faqs_settings: { items: [] },
                    updated_at: new Date().toISOString()
                });
                DEFAULT_PROBLEMS.forEach((p, i) => problemsToInsert.push({ page_id: subPageId, problem_title: p.question, problem_description: p.answer, display_order: i }));
                LOCATIONS.forEach((loc, i) => localtiesToInsert.push({ page_id: subPageId, locality_name: loc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), display_order: i }));
            }

            // Location hub pages (one per city, shared across all appliances — seeded once)
            if (app === CORE_APPLIANCES[0]) {
                for (const loc of LOCATIONS) {
                    const locName = loc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    const locPageId = `loc-${loc}`;
                    pageSettingsToUpsert.push({
                        page_id: locPageId,
                        page_type: 'location',
                        hero_settings: { title: `Appliance Repair Solutions in ${locName}`, subtitle: `Trusted repair services across ${locName}, Mumbai` },
                        problems_settings: { title: `Common Appliance Problems in ${locName}`, subtitle: 'Expert diagnosis and repair for all appliances' },
                        services_settings: { title: `Repair Services in ${locName}`, subtitle: 'Full-range appliance repair at competitive prices' },
                        localities_settings: { title: `Nearby Areas in ${locName}`, subtitle: 'We cover all localities around you' },
                        brands_settings: { items: [] },
                        faqs_settings: { items: [] },
                        updated_at: new Date().toISOString()
                    });
                    DEFAULT_PROBLEMS.forEach((p, i) =>
                        problemsToInsert.push({ page_id: locPageId, problem_title: p.question, problem_description: p.answer, display_order: i })
                    );
                }
            }

            // Sub-location pages
            for (const loc of LOCATIONS) {
                const locName = loc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const slocPageId = `sloc-${loc}-${slug}`;
                pageSettingsToUpsert.push({
                    page_id: slocPageId,
                    page_type: 'sublocation',
                    problems_settings: { title: `${applianceName} Problems We Solve in ${locName}`, subtitle: `Common ${applianceName.toLowerCase()} issues in ${locName}` },
                    services_settings: { title: `Popular ${applianceName} Services in ${locName}`, subtitle: 'Most booked services in your area' },
                    localities_settings: { title: `Nearby Areas in ${locName}`, subtitle: 'Find your specific locality' },
                    brands_settings: { items: [] },
                    faqs_settings: { items: [] },
                    updated_at: new Date().toISOString()
                });
                DEFAULT_PROBLEMS.forEach((p, i) => problemsToInsert.push({ page_id: slocPageId, problem_title: p.question, problem_description: p.answer, display_order: i }));
            }

            const allPageIds = pageSettingsToUpsert.map(p => p.page_id);

            const { error: upsertError } = await supabase.from('page_settings').upsert(pageSettingsToUpsert, { onConflict: 'page_id' });
            if (upsertError) throw upsertError;

            await Promise.all([
                supabase.from('page_problems').delete().in('page_id', allPageIds),
                supabase.from('page_localities').delete().in('page_id', allPageIds),
            ]);

            if (problemsToInsert.length > 0) {
                await supabase.from('page_problems').insert(problemsToInsert);
            }
            if (localtiesToInsert.length > 0) {
                await supabase.from('page_localities').insert(localtiesToInsert);
            }

            totalSeeded += pageSettingsToUpsert.length;
            results.push({ appliance: app.name, seeded: pageSettingsToUpsert.length, success: true });

        } catch (e) {
            console.error(`Seed failed for ${app.name}:`, e);
            results.push({ appliance: app.name, seeded: 0, success: false, error: e.message });
        }
    }

    // Normalize any abbreviated page_type values left by older seed attempts
    try {
        await Promise.all([
            supabase.from('page_settings').update({ page_type: 'location' }).eq('page_type', 'loc'),
            supabase.from('page_settings').update({ page_type: 'category' }).eq('page_type', 'cat'),
            supabase.from('page_settings').update({ page_type: 'subcategory' }).eq('page_type', 'sub'),
            supabase.from('page_settings').update({ page_type: 'sublocation' }).eq('page_type', 'sub-loc'),
        ]);
    } catch (normErr) {
        console.warn('Type normalization warning:', normErr.message);
    }

    return NextResponse.json({ success: true, totalSeeded, results });
}
