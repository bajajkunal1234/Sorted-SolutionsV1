import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/settings/page/create
 * Body: { page_id, page_type, hero_title }
 * Creates a blank page_settings record for the given page ID.
 */
export async function POST(req) {
    const supabase = createServerSupabase();

    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const { page_id, page_type, hero_title, page_url } = body || {};

    if (!page_id || !page_type) {
        return NextResponse.json({ success: false, error: 'page_id and page_type are required' }, { status: 400 });
    }

    // Validate page type
    const validTypes = ['category', 'subcategory', 'location', 'sublocation'];
    if (!validTypes.includes(page_type)) {
        return NextResponse.json({ success: false, error: `Invalid page_type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 });
    }

    // Validate page_id format based on type
    const prefixMap = {
        category: 'cat-',
        subcategory: 'sub-',
        location: 'loc-',
        sublocation: 'sloc-',
    };
    if (!page_id.startsWith(prefixMap[page_type])) {
        return NextResponse.json({
            success: false,
            error: `page_id for type "${page_type}" must start with "${prefixMap[page_type]}"`,
        }, { status: 400 });
    }

    // Check that the page doesn't already exist
    const { data: existing, error: checkError } = await supabase
        .from('page_settings')
        .select('page_id')
        .eq('page_id', page_id)
        .maybeSingle();

    if (checkError) {
        console.error('[create-page] Check error:', checkError.message);
        return NextResponse.json({ success: false, error: checkError.message }, { status: 500 });
    }

    if (existing) {
        return NextResponse.json({ success: false, error: `A page with ID "${page_id}" already exists.` }, { status: 409 });
    }

    // Create the new page with minimal default structure
    const defaultTitle = hero_title || page_id.replace(/^(cat|sub|loc|sloc)-/, '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    // 'issues' section only exists on subcategory pages
    const sectionOrder = page_type === 'subcategory'
        ? ['hero', 'booking', 'issues', 'subcategories', 'problems', 'how_it_works', 'why_us', 'brands', 'localities', 'services', 'other_locations', 'faqs']
        : ['hero', 'booking', 'subcategories', 'problems', 'how_it_works', 'why_us', 'brands', 'localities', 'services', 'other_locations', 'faqs'];

    const { error: insertError } = await supabase.from('page_settings').insert({
        page_id,
        page_type,
        hero_settings: {
            title: defaultTitle,
            subtitle: '',
        },
        section_visibility: {
            hero: true,
            booking: true,
            issues: true,
            subcategories: true,
            problems: true,
            services: true,
            brands: true,
            faqs: true,
            how_it_works: true,
            why_us: true,
            localities: true,
            other_locations: true,
        },
        section_order: sectionOrder,
        // Seed empty JSONB sections so all editors appear in Admin immediately
        problems_settings: { title: '', subtitle: '', items: [] },
        localities_settings: { title: '', subtitle: '', items: [] },
        brands_settings: { title: '', subtitle: '', items: [] },
        faqs_settings: { title: '', subtitle: '', items: [] },
        services_settings: { title: '', subtitle: '', items: [] },
        subcategories_settings: { title: '', subtitle: '', items: [] },
        other_locations_settings: { title: '', subtitle: '', items: [] },
        how_it_works_settings: { title: '', subtitle: '' },
        why_us_settings: { title: '', subtitle: '' },
        updated_at: new Date().toISOString(),
    });

    if (insertError) {
        console.error('[create-page] Insert error:', insertError.message);
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, page_id, page_type });
}
