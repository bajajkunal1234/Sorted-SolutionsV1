import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

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
    console.log('--- GET Page Settings (using lib/supabase) ---');
    console.log('Page ID:', pageId);

    if (!supabase) {
        console.error('Supabase client is not initialized');
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
        const [
            { data: problems },
            { data: services },
            { data: localities },
            { data: brandsMapping },
            { data: faqsMapping }
        ] = await Promise.all([
            supabase.from('page_problems').select('*').eq('page_id', pageId).order('display_order', { ascending: true }),
            supabase.from('page_services').select('*').eq('page_id', pageId).order('display_order', { ascending: true }),
            supabase.from('page_localities').select('*').eq('page_id', pageId).order('display_order', { ascending: true }),
            supabase.from('page_brands_mapping').select('brand_id').eq('page_id', pageId),
            supabase.from('page_faqs_mapping').select('faq_id').eq('page_id', pageId)
        ]);

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
                title: pageSettings.problems_settings?.title || 'Problems We Solve',
                subtitle: pageSettings.problems_settings?.subtitle || 'Common issues we fix',
                items: (problems || []).map(p => ({
                    question: p.problem_title,
                    answer: p.problem_description,
                    id: p.id
                }))
            },
            services_settings: {
                ...pageSettings.services_settings,
                title: pageSettings.services_settings?.title || 'Our Services',
                subtitle: pageSettings.services_settings?.subtitle || 'Best in class services',
                items: (services || []).map(s => ({
                    name: s.service_name,
                    price: s.price_starts_at,
                    id: s.id
                }))
            },
            localities_settings: {
                ...pageSettings.localities_settings,
                title: pageSettings.localities_settings?.title || 'Areas We Serve',
                subtitle: pageSettings.localities_settings?.subtitle || 'Find us near you',
                items: (localities || []).map(l => l.locality_name)
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
    if (!supabase) return NextResponse.json({ success: false, error: 'Database connection missing' }, { status: 500 });

    try {
        const body = await request.json();

        // 1. Upsert main page settings (including JSONB titles/subtitles and hero_settings)
        const { error: mainError } = await supabase
            .from('page_settings')
            .upsert({
                page_id: pageId,
                page_type: pageId.split('-')[0],
                hero_settings: body.hero_settings,
                problems_settings: body.problems_settings,
                brands_settings: body.brands_settings,
                localities_settings: body.localities_settings,
                services_settings: body.services_settings,
                subcategories_settings: body.subcategories_settings,
                faqs_settings: body.faqs_settings,
                updated_at: new Date().toISOString()
            }, { onConflict: 'page_id' });

        if (mainError) throw mainError;

        // 2. Cleanup and Re-insert related naming data into normalized tables
        await Promise.all([
            supabase.from('page_problems').delete().eq('page_id', pageId),
            supabase.from('page_services').delete().eq('page_id', pageId),
            supabase.from('page_localities').delete().eq('page_id', pageId),
            supabase.from('page_brands_mapping').delete().eq('page_id', pageId),
            supabase.from('page_faqs_mapping').delete().eq('page_id', pageId)
        ]);

        const inserts = [];

        if (body.problems_settings?.items?.length > 0) {
            inserts.push(supabase.from('page_problems').insert(
                body.problems_settings.items.map((item, index) => ({
                    page_id: pageId,
                    problem_title: item.question,
                    problem_description: item.answer,
                    display_order: index
                }))
            ));
        }

        if (body.services_settings?.items?.length > 0) {
            inserts.push(supabase.from('page_services').insert(
                body.services_settings.items.map((item, index) => ({
                    page_id: pageId,
                    service_name: item.name,
                    price_starts_at: item.price,
                    display_order: index
                }))
            ));
        }

        if (body.localities_settings?.items?.length > 0) {
            inserts.push(supabase.from('page_localities').insert(
                body.localities_settings.items.map((item, index) => ({
                    page_id: pageId,
                    locality_name: typeof item === 'string' ? item : item.name,
                    display_order: index
                }))
            ));
        }

        if (body.brands_settings?.items?.length > 0) {
            inserts.push(supabase.from('page_brands_mapping').insert(
                body.brands_settings.items.map(brandId => ({
                    page_id: pageId,
                    brand_id: brandId
                }))
            ));
        }

        if (body.faqs_settings?.items?.length > 0) {
            inserts.push(supabase.from('page_faqs_mapping').insert(
                body.faqs_settings.items.map((faqId, index) => ({
                    page_id: pageId,
                    faq_id: faqId,
                    display_order: index
                }))
            ));
        }

        await Promise.all(inserts);

        return NextResponse.json({ success: true, message: 'Settings saved successfully' });

    } catch (error) {
        console.error('Error saving page settings:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
