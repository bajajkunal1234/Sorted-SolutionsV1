import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFAULT_HERO = {
    title: '',
    subtitle: '',
    bg_type: 'gradient',       // 'gradient' | 'solid' | 'image'
    bg_color_from: '#6366f1',
    bg_color_to: '#4f46e5',
    bg_image_url: '',
    overlay_opacity: 0.85
};

export async function GET(request, { params }) {
    const { pageId } = params;
    console.log('--- GET Page Settings ---');
    console.log('Page ID:', pageId);

    const supabase = createServerSupabase();
    if (!supabase) {
        console.error('[ST-DEBUG] Supabase client is not initialized in GET');
        return NextResponse.json({ success: false, error: 'Database connection missing' }, { status: 500 });
    }

    try {
        // 1. Fetch main page settings
        const { data: pageSettings, error: pageError } = await supabase
            .from('page_settings')
            .select('*')
            .eq('page_id', pageId)
            .single();

        if (pageError && pageError.code !== 'PGRST116') {
            console.error('Page Settings DB Error:', pageError);
            throw pageError;
        }

        // 2. Fetch related data in parallel
        console.log('[ST-DEBUG] Fetching related data for', pageId);
        const [
            probRes,
            servRes,
            localRes,
            brandRes,
            faqRes
        ] = await Promise.all([
            supabase.from('page_problems').select('*').eq('page_id', pageId).order('display_order', { ascending: true }),
            supabase.from('page_services').select('*').eq('page_id', pageId).order('display_order', { ascending: true }),
            supabase.from('page_localities').select('*').eq('page_id', pageId).order('display_order', { ascending: true }),
            supabase.from('page_brands_mapping').select('brand_id').eq('page_id', pageId),
            supabase.from('page_faqs_mapping').select('faq_id').eq('page_id', pageId)
        ]);

        if (probRes.error) console.error('[ST-DEBUG] Problems Error:', probRes.error);
        if (servRes.error) console.error('[ST-DEBUG] Services Error:', servRes.error);

        const problems = probRes.data;
        const services = servRes.data;
        const localities = localRes.data;
        const brandsMapping = brandRes.data;
        const faqsMapping = faqRes.data;

        if (!pageSettings) {
            console.log('No page settings found, returning defaults with fetched items');
            return NextResponse.json({
                success: true,
                data: {
                    page_id: pageId,
                    hero_settings: DEFAULT_HERO,
                    problems_settings: {
                        title: 'Problems We Solve',
                        subtitle: 'Common issues we fix',
                        items: (problems || []).map(p => ({ question: p.problem_title, answer: p.problem_description, id: p.id }))
                    },
                    services_settings: {
                        title: 'Our Services',
                        subtitle: 'Best in class services',
                        items: (services || []).map(s => ({ name: s.service_name, price: s.price_starts_at, id: s.id }))
                    },
                    localities_settings: {
                        title: 'Areas We Serve',
                        subtitle: 'Find us near you',
                        items: (localities || []).map(l => l.locality_name)
                    },
                    subcategories_settings: {
                        title: 'Appliance Types',
                        subtitle: 'Choose your specific appliance',
                        items: []
                    },
                    brands_settings: { items: (brandsMapping || []).map(b => b.brand_id) },
                    faqs_settings: { items: (faqsMapping || []).map(f => f.faq_id) }
                }
            });
        }

        const responseData = {
            ...pageSettings,
            hero_settings: { ...DEFAULT_HERO, ...pageSettings.hero_settings },
            problems_settings: {
                ...pageSettings.problems_settings,
                items: (problems?.length > 0)
                    ? problems.map(p => ({ question: p.problem_title, answer: p.problem_description, id: p.id }))
                    : (pageSettings.problems_settings?.items || [])
            },
            services_settings: {
                ...pageSettings.services_settings,
                title: pageSettings.services_settings?.title || 'Our Services',
                subtitle: pageSettings.services_settings?.subtitle || 'Best in class services',
                items: (services?.length > 0)
                    ? services.map(s => ({ name: s.service_name, price: s.price_starts_at, id: s.id }))
                    : (pageSettings.services_settings?.items || [])
            },
            localities_settings: {
                ...pageSettings.localities_settings,
                title: pageSettings.localities_settings?.title || 'Areas We Serve',
                subtitle: pageSettings.localities_settings?.subtitle || 'Find us near you',
                items: (localities?.length > 0)
                    ? localities.map(l => l.locality_name)
                    : (pageSettings.localities_settings?.items || [])
            },
            subcategories_settings: {
                ...pageSettings.subcategories_settings,
                title: pageSettings.subcategories_settings?.title || 'Appliance Types',
                subtitle: pageSettings.subcategories_settings?.subtitle || 'Choose your specific appliance',
                items: pageSettings.subcategories_settings?.items || []
            },
            brands_settings: {
                items: (brandsMapping || []).map(b => b.brand_id)
            },
            faqs_settings: {
                items: (faqsMapping || []).map(f => f.faq_id)
            }
        };

        return NextResponse.json({ success: true, data: responseData });

    } catch (error) {
        console.error('Error fetching page settings:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    const { pageId } = params;
    const supabase = createServerSupabase();
    if (!supabase) return NextResponse.json({ success: false, error: 'Database connection missing' }, { status: 500 });

    try {
        const body = await request.json();
        console.log(`[ST-DEBUG] PUT /api/settings/page/${pageId}`);
        console.log(`[ST-DEBUG] Payload problems items count:`, body.problems_settings?.items?.length || 0);
        console.log(`[ST-DEBUG] Payload services items count:`, body.services_settings?.items?.length || 0);

        // 1. Upsert main page settings
        const upsertData = {
            page_id: pageId,
            page_type: pageId.split('-')[0],
            hero_settings: body.hero_settings,
            problems_settings: body.problems_settings,
            brands_settings: body.brands_settings,
            localities_settings: body.localities_settings,
            services_settings: body.services_settings,
            subcategories_settings: body.subcategories_settings,
            faqs_settings: body.faqs_settings,
            section_visibility: body.section_visibility ?? null,
            updated_at: new Date().toISOString()
        };

        const { data: upsertedRow, error: mainError } = await supabase
            .from('page_settings')
            .upsert(upsertData, { onConflict: 'page_id' })
            .select()
            .single();

        if (mainError) {
            console.error('[ST-DEBUG] Upsert Error:', mainError);
            return NextResponse.json({ success: false, error: 'Failed to upsert page_settings', details: mainError.message }, { status: 500 });
        }
        console.log('[ST-DEBUG] Upsert Succeeded. Page settings row ID:', upsertedRow.id);

        // 2. Cleanup and Re-insert related naming data into normalized tables
        console.log('[ST-DEBUG] Cleaning up mapping tables...');
        const cleanupResults = await Promise.all([
            supabase.from('page_problems').delete().eq('page_id', pageId),
            supabase.from('page_services').delete().eq('page_id', pageId),
            supabase.from('page_localities').delete().eq('page_id', pageId),
            supabase.from('page_brands_mapping').delete().eq('page_id', pageId),
            supabase.from('page_faqs_mapping').delete().eq('page_id', pageId)
        ]);

        const cleanupErrors = cleanupResults.filter(r => r.error);
        if (cleanupErrors.length > 0) {
            console.error('[ST-DEBUG] Cleanup Errors:', cleanupErrors);
        }

        const inserts = [];

        if (body.problems_settings?.items?.length > 0) {
            console.log(`[ST-DEBUG] Inserting ${body.problems_settings.items.length} problems...`);
            inserts.push(supabase.from('page_problems').insert(
                body.problems_settings.items.map((item, index) => ({
                    page_id: pageId,
                    problem_title: item.question || 'Unnamed Problem',
                    problem_description: item.answer || '',
                    display_order: index
                }))
            ));
        }

        if (body.services_settings?.items?.length > 0) {
            console.log(`[ST-DEBUG] Inserting ${body.services_settings.items.length} services...`);
            inserts.push(supabase.from('page_services').insert(
                body.services_settings.items.map((item, index) => ({
                    page_id: pageId,
                    service_name: item.name || 'Unnamed Service',
                    price_starts_at: item.price || '',
                    display_order: index
                }))
            ));
        }

        if (body.localities_settings?.items?.length > 0) {
            console.log(`[ST-DEBUG] Inserting ${body.localities_settings.items.length} localities...`);
            inserts.push(supabase.from('page_localities').insert(
                body.localities_settings.items.map((item, index) => ({
                    page_id: pageId,
                    locality_name: typeof item === 'string' ? item : (item.name || item.locality_name || 'Unnamed Locality'),
                    display_order: index
                }))
            ));
        }

        if (body.brands_settings?.items?.length > 0) {
            console.log(`[ST-DEBUG] Inserting ${body.brands_settings.items.length} brand mappings...`);
            inserts.push(supabase.from('page_brands_mapping').insert(
                body.brands_settings.items.map(brandId => ({
                    page_id: pageId,
                    brand_id: brandId
                }))
            ));
        }

        if (body.faqs_settings?.items?.length > 0) {
            console.log(`[ST-DEBUG] Inserting ${body.faqs_settings.items.length} FAQ mappings...`);
            inserts.push(supabase.from('page_faqs_mapping').insert(
                body.faqs_settings.items.map((faqId, index) => ({
                    page_id: pageId,
                    faq_id: faqId,
                    display_order: index
                }))
            ));
        }

        const insertResults = await Promise.all(inserts);
        const insertErrors = insertResults.filter(r => r.error);
        if (insertErrors.length > 0) {
            console.error('[ST-DEBUG] Insert Errors:', insertErrors);
            return NextResponse.json({
                success: false,
                error: 'Failed to insert some related items',
                details: insertErrors.map(e => e.error.message).join(', ')
            }, { status: 500 });
        }

        console.log('[ST-DEBUG] All saves completed successfully');
        return NextResponse.json({
            success: true,
            message: 'Settings saved successfully',
            rowId: upsertedRow.id,
            receivedCounts: {
                problems: body.problems_settings?.items?.length || 0,
                services: body.services_settings?.items?.length || 0,
                localities: body.localities_settings?.items?.length || 0
            }
        });

    } catch (error) {
        console.error('[ST-DEBUG] General Catch Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
