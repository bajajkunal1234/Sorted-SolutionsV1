import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const KNOWN_CATS = [
    'water-purifier-repairs',
    'washing-machine-repair',
    'water-purifier-repair',
    'refrigerator-repair',
    'hob-repair',
    'oven-repair',
    'ac-repair'
];

function formatPageMetadata(pageId, pageType, heroSettings = null) {
    if (pageId === 'homepage') {
        return {
            id: 'homepage',
            name: 'Homepage',
            url: '/',
            type: 'homepage',
            group: 'Homepage'
        };
    }

    if (pageId.startsWith('cat-')) {
        const cat = pageId.replace('cat-', '');
        const defaultName = cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' Page';
        return {
            id: pageId,
            name: heroSettings?.title ? `${heroSettings.title} (Category)` : defaultName,
            url: `/services/${cat}`,
            type: 'category',
            group: 'Main Category Pages'
        };
    }

    if (pageId.startsWith('sub-')) {
        const raw = pageId.replace('sub-', '');
        let matchedCat = null;
        let subSlug = raw;
        for (const cat of KNOWN_CATS) {
            if (raw.startsWith(cat + '-')) {
                matchedCat = cat;
                subSlug = raw.substring(cat.length + 1);
                break;
            }
        }
        const catName = matchedCat ? matchedCat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Service';
        const subName = subSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return {
            id: pageId,
            name: heroSettings?.title || `${catName} › ${subName}`,
            url: matchedCat ? `/services/${matchedCat}/${subSlug}` : '#',
            type: 'subcategory',
            group: 'Subcategory Pages'
        };
    }

    if (pageId.startsWith('loc-')) {
        const loc = pageId.replace('loc-', '');
        const name = loc.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return {
            id: pageId,
            name: heroSettings?.title ? `${heroSettings.title} (Area)` : `${name} Area Page`,
            url: `/location/${loc}`,
            type: 'location',
            group: 'Location Pages (Mumbai)'
        };
    }

    if (pageId.startsWith('sloc-')) {
        const raw = pageId.replace('sloc-', '');
        let matchedCat = null;
        let locSlug = raw;
        for (const cat of KNOWN_CATS) {
            if (raw.endsWith('-' + cat)) {
                matchedCat = cat;
                locSlug = raw.substring(0, raw.length - cat.length - 1);
                break;
            }
        }
        const locName = locSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const catName = matchedCat ? matchedCat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Service';
        return {
            id: pageId,
            name: heroSettings?.title || `${locName} › ${catName}`,
            url: matchedCat ? `/location/${locSlug}/${matchedCat}` : `/location/${raw}`,
            type: 'sublocation',
            group: 'Sublocation Pages'
        };
    }

    return {
        id: pageId,
        name: heroSettings?.title || pageId,
        url: '#',
        type: pageType || 'other',
        group: 'Other Pages'
    };
}

export async function GET() {
    try {
        const supabase = createServerSupabase();
        if (!supabase) throw new Error('Database connection missing');

        const [pagesRes, hpRes] = await Promise.all([
            supabase
                .from('page_settings')
                .select('page_id, page_type, section_visibility, hero_settings')
                .order('page_type'),
            supabase
                .from('website_section_configs')
                .select('*')
                .eq('section_id', 'homepage-brand-logos')
                .maybeSingle()
        ]);

        if (pagesRes.error) throw pagesRes.error;

        const hpConfig = hpRes.data?.config || hpRes.data?.extra_config || hpRes.data || {};
        const hpVisible = hpConfig.visible !== false && hpConfig.enabled !== false;

        const results = [
            {
                ...formatPageMetadata('homepage', 'homepage'),
                visible: hpVisible
            }
        ];

        (pagesRes.data || []).forEach(page => {
            const meta = formatPageMetadata(page.page_id, page.page_type, page.hero_settings);
            const sv = page.section_visibility || {};
            const isVisible = sv.brands !== false;
            results.push({
                ...meta,
                visible: isVisible
            });
        });

        return NextResponse.json({ success: true, pages: results });
    } catch (error) {
        console.error('Error in brands-visibility GET:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const supabase = createServerSupabase();
        if (!supabase) throw new Error('Database connection missing');

        const body = await request.json();
        const { pageId, pageType, visible } = body;

        // Bulk toggle
        if (pageType) {
            if (pageType === 'all' || pageType === 'homepage') {
                const { data: hpExisting } = await supabase
                    .from('website_section_configs')
                    .select('*')
                    .eq('section_id', 'homepage-brand-logos')
                    .maybeSingle();

                const existingCfg = hpExisting?.config || hpExisting?.extra_config || {};
                await supabase
                    .from('website_section_configs')
                    .upsert({
                        section_id: 'homepage-brand-logos',
                        extra_config: {
                            ...existingCfg,
                            visible: !!visible,
                            enabled: !!visible
                        },
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'section_id' });
            }

            if (pageType !== 'homepage') {
                let query = supabase.from('page_settings').select('page_id, section_visibility');
                if (pageType !== 'all') {
                    query = query.eq('page_type', pageType);
                }
                const { data: matchedPages, error: matchErr } = await query;
                if (matchErr) throw matchErr;

                const pagesToUpdate = matchedPages || [];
                const batchSize = 10;
                for (let i = 0; i < pagesToUpdate.length; i += batchSize) {
                    const chunk = pagesToUpdate.slice(i, i + batchSize);
                    await Promise.all(chunk.map(p => {
                        const newSv = { ...(p.section_visibility || {}), brands: !!visible };
                        return supabase
                            .from('page_settings')
                            .update({ section_visibility: newSv, updated_at: new Date().toISOString() })
                            .eq('page_id', p.page_id);
                    }));
                }
            }

            try {
                revalidatePath('/', 'layout');
            } catch (revErr) {
                console.warn('[brands-visibility] revalidatePath error:', revErr.message);
            }

            return NextResponse.json({ success: true, message: `Updated visibility for ${pageType} to ${visible}` });
        }

        if (!pageId) {
            return NextResponse.json({ success: false, error: 'pageId or pageType required' }, { status: 400 });
        }

        if (pageId === 'homepage') {
            const { data: hpExisting } = await supabase
                .from('website_section_configs')
                .select('*')
                .eq('section_id', 'homepage-brand-logos')
                .maybeSingle();

            const existingCfg = hpExisting?.config || hpExisting?.extra_config || {};
            const { error: hpErr } = await supabase
                .from('website_section_configs')
                .upsert({
                    section_id: 'homepage-brand-logos',
                    extra_config: {
                        ...existingCfg,
                        visible: !!visible,
                        enabled: !!visible
                    },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'section_id' });

            if (hpErr) throw hpErr;

            try {
                revalidatePath('/', 'layout');
            } catch (revErr) {
                console.warn('[brands-visibility] revalidatePath error:', revErr.message);
            }

            return NextResponse.json({ success: true, pageId, visible: !!visible });
        }

        const { data: pageRow, error: fetchErr } = await supabase
            .from('page_settings')
            .select('page_id, section_visibility')
            .eq('page_id', pageId)
            .single();

        if (fetchErr) throw fetchErr;

        const updatedVisibility = {
            ...(pageRow.section_visibility || {}),
            brands: !!visible
        };

        const { error: updateErr } = await supabase
            .from('page_settings')
            .update({ section_visibility: updatedVisibility, updated_at: new Date().toISOString() })
            .eq('page_id', pageId);

        if (updateErr) throw updateErr;

        try {
            revalidatePath('/', 'layout');
        } catch (revErr) {
            console.warn('[brands-visibility] revalidatePath error:', revErr.message);
        }

        return NextResponse.json({ success: true, pageId, visible: !!visible });
    } catch (error) {
        console.error('Error in brands-visibility POST:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
