import { getSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

/**
 * POST /api/settings/appliances/seed-locations
 * Seeds only the 15 location hub pages (loc-*) quickly.
 */
export async function POST() {
    const supabase = getSupabaseServer();
    if (!supabase) {
        return NextResponse.json({ success: false, error: 'Database connection missing' }, { status: 500 });
    }

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
            problems_settings: {
                title: `Common Appliance Problems in ${locName}`,
                subtitle: 'Expert diagnosis and repair for all appliances'
            },
            services_settings: {
                title: `Repair Services in ${locName}`,
                subtitle: 'Full-range appliance repair at competitive prices'
            },
            localities_settings: {
                title: `Nearby Areas in ${locName}`,
                subtitle: 'We cover all localities around you'
            },
            brands_settings: { items: [] },
            faqs_settings: { items: [] },
            updated_at: new Date().toISOString()
        });

        DEFAULT_PROBLEMS.forEach((p, i) =>
            problemsToInsert.push({
                page_id: pageId,
                problem_title: p.question,
                problem_description: p.answer,
                display_order: i
            })
        );
    }

    const allPageIds = pagesToUpsert.map(p => p.page_id);

    // Upsert all 15 location pages
    const { error: upsertError } = await supabase
        .from('page_settings')
        .upsert(pagesToUpsert, { onConflict: 'page_id' });

    if (upsertError) {
        return NextResponse.json({ success: false, error: upsertError.message }, { status: 500 });
    }

    // Clear and re-insert problems
    await supabase.from('page_problems').delete().in('page_id', allPageIds);
    if (problemsToInsert.length > 0) {
        await supabase.from('page_problems').insert(problemsToInsert);
    }

    // Also normalize any abbreviated page_types in DB
    await Promise.all([
        supabase.from('page_settings').update({ page_type: 'location' }).eq('page_type', 'loc'),
        supabase.from('page_settings').update({ page_type: 'category' }).eq('page_type', 'cat'),
        supabase.from('page_settings').update({ page_type: 'subcategory' }).eq('page_type', 'sub'),
        supabase.from('page_settings').update({ page_type: 'sublocation' }).eq('page_type', 'sub-loc'),
    ]);

    return NextResponse.json({
        success: true,
        seeded: pagesToUpsert.length,
        locations: LOCATIONS,
        message: `Successfully seeded ${pagesToUpsert.length} location hub pages`
    });
}
