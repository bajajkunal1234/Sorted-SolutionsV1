import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { DEFAULT_CATEGORY_THUMBNAILS } from '../thumbnails-config/route';

export const dynamic = 'force-dynamic';

export const DEFAULT_LOGOS = {
    dayModeLogo: '/logo.jpg',
    darkModeLogo: '/logo.jpg',
    altText: 'Sorted Solutions'
};

export async function GET(request) {
    try {
        const supabase = createServerSupabase();
        if (!supabase) {
            return NextResponse.json({
                success: true,
                data: {
                    logos: DEFAULT_LOGOS,
                    categories: DEFAULT_CATEGORY_THUMBNAILS
                },
                isFallback: true
            });
        }

        // Fetch homepage config and thumbnails config
        const { data: rows, error } = await supabase
            .from('website_section_configs')
            .select('*')
            .in('section_id', ['ecom-v2-homepage', 'ecom-v2-thumbnails']);

        if (error) {
            console.error('Error fetching homepage config:', error);
            return NextResponse.json({
                success: true,
                data: {
                    logos: DEFAULT_LOGOS,
                    categories: DEFAULT_CATEGORY_THUMBNAILS
                },
                isFallback: true
            });
        }

        const homepageRow = rows?.find(r => r.section_id === 'ecom-v2-homepage');
        const thumbnailsRow = rows?.find(r => r.section_id === 'ecom-v2-thumbnails');

        const savedLogos = homepageRow?.extra_config?.logos || DEFAULT_LOGOS;
        const savedCategories = homepageRow?.extra_config?.categories || thumbnailsRow?.extra_config?.categories || {};

        // Merge saved categories with defaults
        const mergedCategories = { ...DEFAULT_CATEGORY_THUMBNAILS };
        Object.keys(savedCategories).forEach(slug => {
            if (savedCategories[slug]) {
                mergedCategories[slug] = {
                    ...mergedCategories[slug],
                    ...savedCategories[slug],
                    slides: Array.isArray(savedCategories[slug]?.slides)
                        ? savedCategories[slug].slides
                        : (mergedCategories[slug]?.slides || [])
                };
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                logos: {
                    dayModeLogo: savedLogos.dayModeLogo || DEFAULT_LOGOS.dayModeLogo,
                    darkModeLogo: savedLogos.darkModeLogo || savedLogos.dayModeLogo || DEFAULT_LOGOS.darkModeLogo,
                    altText: savedLogos.altText || DEFAULT_LOGOS.altText
                },
                categories: mergedCategories
            },
            updatedAt: homepageRow?.updated_at || thumbnailsRow?.updated_at || null
        });
    } catch (err) {
        console.error('[API homepage-config] GET error:', err);
        return NextResponse.json({
            success: true,
            data: {
                logos: DEFAULT_LOGOS,
                categories: DEFAULT_CATEGORY_THUMBNAILS
            },
            isFallback: true
        });
    }
}

export async function POST(request) {
    try {
        const supabase = createServerSupabase();
        if (!supabase) {
            return NextResponse.json({ success: false, error: 'Database connection failed' }, { status: 500 });
        }

        const body = await request.json();
        const incomingLogos = body.logos || {};
        const incomingCategories = body.categories || {};

        // Clean & sanitize logos
        const sanitizedLogos = {
            dayModeLogo: String(incomingLogos.dayModeLogo || DEFAULT_LOGOS.dayModeLogo).trim(),
            darkModeLogo: String(incomingLogos.darkModeLogo || incomingLogos.dayModeLogo || DEFAULT_LOGOS.darkModeLogo).trim(),
            altText: String(incomingLogos.altText || DEFAULT_LOGOS.altText).trim()
        };

        // Clean & sanitize categories if passed
        let sanitizedCategories = null;
        if (incomingCategories && Object.keys(incomingCategories).length > 0) {
            sanitizedCategories = {};
            Object.keys(incomingCategories).forEach(slug => {
                const cat = incomingCategories[slug];
                if (!cat) return;

                const rawSlides = Array.isArray(cat.slides) ? cat.slides : [];
                const cleanSlides = rawSlides.map((s, idx) => ({
                    id: String(s.id || `slide-${idx + 1}`),
                    url: String(s.url || s.mediaUrl || '').trim(),
                    title: String(s.title || '').trim()
                })).filter(s => s.url);

                sanitizedCategories[slug] = {
                    categorySlug: slug,
                    categoryName: String(cat.categoryName || slug).trim(),
                    interval: Math.max(1500, Math.min(15000, Number(cat.interval) || 3500)),
                    directionStyle: ['multidirectional', 'vertical', 'horizontal', 'top-only', 'bottom-only', 'left-only', 'right-only'].includes(cat.directionStyle)
                        ? cat.directionStyle
                        : 'multidirectional',
                    enabled: cat.enabled !== false,
                    slides: cleanSlides
                };
            });
        }

        // Fetch existing homepage config so we preserve existing sections
        const { data: existingRow } = await supabase
            .from('website_section_configs')
            .select('*')
            .eq('section_id', 'ecom-v2-homepage')
            .maybeSingle();

        const currentConfig = existingRow?.extra_config || {};

        const payload = {
            ...currentConfig,
            logos: sanitizedLogos,
            ...(sanitizedCategories ? { categories: sanitizedCategories } : {}),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('website_section_configs')
            .upsert({
                section_id: 'ecom-v2-homepage',
                extra_config: payload,
                updated_at: new Date().toISOString()
            }, { onConflict: 'section_id' })
            .select()
            .single();

        if (error) throw error;

        // Also sync categories to ecom-v2-thumbnails if categories were provided
        if (sanitizedCategories) {
            await supabase
                .from('website_section_configs')
                .upsert({
                    section_id: 'ecom-v2-thumbnails',
                    extra_config: { categories: sanitizedCategories, updated_at: new Date().toISOString() },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'section_id' });
        }

        return NextResponse.json({
            success: true,
            message: 'Homepage settings saved successfully',
            data: {
                logos: sanitizedLogos,
                categories: sanitizedCategories || currentConfig.categories || DEFAULT_CATEGORY_THUMBNAILS
            },
            updatedAt: data?.updated_at
        });
    } catch (err) {
        console.error('[API homepage-config] POST error:', err);
        return NextResponse.json({
            success: false,
            error: err.message || 'Failed to save homepage settings'
        }, { status: 500 });
    }
}
