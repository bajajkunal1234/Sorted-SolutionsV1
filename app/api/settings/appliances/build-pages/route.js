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
 * POST /api/settings/appliances/build-pages
 * Seeds page_settings rows for a category + all its subcategories + sub-location pages.
 *
 * Body: {
 *   categoryId: string,      // DB id of the booking_category
 *   slug: string,            // URL slug e.g. "dishwasher-repair"
 *   color: string,           // hex color for admin UI
 *   icon_name: string,       // lucide icon name
 *   subcategories: [{ id, name, slug }]
 * }
 */
export async function POST(request) {
    const supabase = getSupabaseServer();
    if (!supabase) {
        return NextResponse.json({ success: false, error: 'Database connection missing' }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { categoryId, slug, color, icon_name, subcategories = [] } = body;

        if (!slug) {
            return NextResponse.json({ success: false, error: 'slug is required' }, { status: 400 });
        }

        const applianceName = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const pageSettingsToUpsert = [];
        const problemsToInsert = [];
        const localtiesToInsert = [];

        // ── 1. Category page ──────────────────────────────────────────
        const catPageId = `cat-${slug}`;
        pageSettingsToUpsert.push({
            page_id: catPageId,
            page_type: 'category',
            problems_settings: {
                title: `${applianceName} Problems We Solve`,
                subtitle: `Common ${applianceName.toLowerCase()} issues we fix`
            },
            services_settings: {
                title: `${applianceName} Services`,
                subtitle: 'Transparent pricing, no hidden charges'
            },
            localities_settings: {
                title: 'We Are Right In Your Neighbourhood',
                subtitle: 'Find us in your area'
            },
            brands_settings: { items: [] },
            faqs_settings: { items: [] },
            updated_at: new Date().toISOString()
        });

        DEFAULT_PROBLEMS.forEach((p, i) => {
            problemsToInsert.push({
                page_id: catPageId,
                problem_title: p.question,
                problem_description: p.answer,
                display_order: i
            });
        });

        LOCATIONS.forEach((loc, i) => {
            const locName = loc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            localtiesToInsert.push({
                page_id: catPageId,
                locality_name: locName,
                display_order: i
            });
        });

        // ── 2. Subcategory pages ──────────────────────────────────────
        for (const sub of subcategories) {
            const subSlug = sub.slug || sub.name.toLowerCase().replace(/\s+/g, '-');
            const subPageId = `sub-${slug}-${subSlug}`;
            const subName = sub.name;

            pageSettingsToUpsert.push({
                page_id: subPageId,
                page_type: 'subcategory',
                problems_settings: {
                    title: `${subName} Problems We Fix`,
                    subtitle: `Common issues with your ${subName.toLowerCase()}`
                },
                services_settings: {
                    title: `${subName} Services & Pricing`,
                    subtitle: 'Starts at competitive prices'
                },
                localities_settings: {
                    title: 'Service Available Across Mumbai',
                    subtitle: "We're in your neighbourhood"
                },
                brands_settings: { items: [] },
                faqs_settings: { items: [] },
                updated_at: new Date().toISOString()
            });

            DEFAULT_PROBLEMS.forEach((p, i) => {
                problemsToInsert.push({
                    page_id: subPageId,
                    problem_title: p.question,
                    problem_description: p.answer,
                    display_order: i
                });
            });

            LOCATIONS.forEach((loc, i) => {
                const locName = loc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                localtiesToInsert.push({
                    page_id: subPageId,
                    locality_name: locName,
                    display_order: i
                });
            });
        }

        // ── 3. Sub-location pages (loc × appliance) ───────────────────
        for (const loc of LOCATIONS) {
            const locName = loc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const slocPageId = `sloc-${loc}-${slug}`;

            pageSettingsToUpsert.push({
                page_id: slocPageId,
                page_type: 'sublocation',
                problems_settings: {
                    title: `${applianceName} Problems We Solve in ${locName}`,
                    subtitle: `Common ${applianceName.toLowerCase()} issues in ${locName}`
                },
                services_settings: {
                    title: `Popular ${applianceName} Services in ${locName}`,
                    subtitle: 'Most booked services in your area'
                },
                localities_settings: {
                    title: `Nearby Areas in ${locName}`,
                    subtitle: 'Find your specific locality'
                },
                brands_settings: { items: [] },
                faqs_settings: { items: [] },
                updated_at: new Date().toISOString()
            });

            DEFAULT_PROBLEMS.forEach((p, i) => {
                problemsToInsert.push({
                    page_id: slocPageId,
                    problem_title: p.question,
                    problem_description: p.answer,
                    display_order: i
                });
            });
        }

        // ── 4. Persist to Supabase ────────────────────────────────────
        // Collect all page_ids we're about to upsert so we can clean old relational data
        const allPageIds = pageSettingsToUpsert.map(p => p.page_id);

        // Upsert page_settings
        const { error: upsertError } = await supabase
            .from('page_settings')
            .upsert(pageSettingsToUpsert, { onConflict: 'page_id' });

        if (upsertError) throw upsertError;

        // Delete old relational rows then re-insert
        await Promise.all([
            supabase.from('page_problems').delete().in('page_id', allPageIds),
            supabase.from('page_localities').delete().in('page_id', allPageIds),
        ]);

        if (problemsToInsert.length > 0) {
            const { error: probError } = await supabase.from('page_problems').insert(problemsToInsert);
            if (probError) console.error('Problems insert error:', probError);
        }

        if (localtiesToInsert.length > 0) {
            const { error: locError } = await supabase.from('page_localities').insert(localtiesToInsert);
            if (locError) console.error('Localities insert error:', locError);
        }

        // ── 5. Update the booking_category with slug/color/icon if changed ──
        if (categoryId) {
            await supabase
                .from('booking_categories')
                .update({ slug, color, icon_name, updated_at: new Date().toISOString() })
                .eq('id', categoryId);
        }

        return NextResponse.json({
            success: true,
            message: `Successfully built ${pageSettingsToUpsert.length} page settings`,
            pageIds: allPageIds
        });

    } catch (error) {
        console.error('Error building pages:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
