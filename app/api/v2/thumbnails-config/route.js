import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { V2_CATEGORIES } from '@/lib/v2/catalogConfig';

export const dynamic = 'force-dynamic';

export const DEFAULT_CATEGORY_THUMBNAILS = {
    'ac-repair': {
        categorySlug: 'ac-repair',
        categoryName: 'Air Conditioner',
        interval: 3500,
        directionStyle: 'multidirectional', // 'multidirectional' | 'vertical' | 'horizontal'
        slides: [
            { id: 'ac-1', url: '/images/services/ac_3d.png', title: 'AC 3D View' },
            { id: 'ac-2', url: '/images/banners/banner_speed_90_mins.png', title: '90-Min Arrival' },
            { id: 'ac-3', url: '/images/banners/banner_expertise_v3.png', title: 'Certified Tech' }
        ]
    },
    'washing-machine-repair': {
        categorySlug: 'washing-machine-repair',
        categoryName: 'Washing Machine',
        interval: 3500,
        directionStyle: 'multidirectional',
        slides: [
            { id: 'wm-1', url: '/images/services/washing_machine_3d.png', title: 'Washing Machine 3D' },
            { id: 'wm-2', url: '/images/banners/banner_expertise_v3.png', title: 'Certified Pros' },
            { id: 'wm-3', url: '/images/banners/banner_30_day_warranty.png', title: '30-Day Warranty' }
        ]
    },
    'refrigerator-repair': {
        categorySlug: 'refrigerator-repair',
        categoryName: 'Refrigerator',
        interval: 3500,
        directionStyle: 'multidirectional',
        slides: [
            { id: 'fr-1', url: '/images/services/fridge_3d.png', title: 'Refrigerator 3D' },
            { id: 'fr-2', url: '/images/banners/banner_problem_solved_expert.png', title: 'Cooling Fix' },
            { id: 'fr-3', url: '/images/banners/banner_location_v3.png', title: 'Across Mumbai' }
        ]
    },
    'oven-repair': {
        categorySlug: 'oven-repair',
        categoryName: 'Microwave & Oven',
        interval: 3500,
        directionStyle: 'multidirectional',
        slides: [
            { id: 'ov-1', url: '/images/services/oven_3d.png', title: 'Microwave 3D' },
            { id: 'ov-2', url: '/images/banners/banner_all_in_one_v3.png', title: 'Heating Specialists' },
            { id: 'ov-3', url: '/images/banners/banner_speed_90_mins.png', title: 'Quick Repair' }
        ]
    },
    'water-purifier-repair': {
        categorySlug: 'water-purifier-repair',
        categoryName: 'Water Purifier',
        interval: 3500,
        directionStyle: 'multidirectional',
        slides: [
            { id: 'wp-1', url: '/images/services/water_purifier_3d.png', title: 'RO Purifier 3D' },
            { id: 'wp-2', url: '/images/banners/banner_location_v3.png', title: 'TDS & Filter Test' },
            { id: 'wp-3', url: '/images/banners/banner_problem_solved_expert.png', title: 'Genuine Parts' }
        ]
    },
    'hob-repair': {
        categorySlug: 'hob-repair',
        categoryName: 'Hob & Gas Stove',
        interval: 3500,
        directionStyle: 'multidirectional',
        slides: [
            { id: 'hb-1', url: '/images/services/hob_3d.png', title: 'Hob & Chimney 3D' },
            { id: 'hb-2', url: '/images/banners/banner_all_in_one.png', title: 'Burner & Chimney Service' },
            { id: 'hb-3', url: '/images/banners/banner_speed_v3.png', title: 'Doorstep Tech' }
        ]
    }
};

export async function GET(request) {
    try {
        const supabase = createServerSupabase();
        if (!supabase) {
            return NextResponse.json({
                success: true,
                data: DEFAULT_CATEGORY_THUMBNAILS,
                isFallback: true
            });
        }

        const { data, error } = await supabase
            .from('website_section_configs')
            .select('*')
            .eq('section_id', 'ecom-v2-thumbnails')
            .maybeSingle();

        if (error) {
            console.error('Error fetching ecom-v2-thumbnails config:', error);
            return NextResponse.json({
                success: true,
                data: DEFAULT_CATEGORY_THUMBNAILS,
                isFallback: true
            });
        }

        const savedCategories = data?.extra_config?.categories || data?.config?.categories || {};

        // Merge saved with defaults for any missing categories
        const merged = { ...DEFAULT_CATEGORY_THUMBNAILS };
        Object.keys(savedCategories).forEach(slug => {
            if (savedCategories[slug]) {
                merged[slug] = {
                    ...merged[slug],
                    ...savedCategories[slug],
                    slides: Array.isArray(savedCategories[slug]?.slides)
                        ? savedCategories[slug].slides
                        : (merged[slug]?.slides || [])
                };
            }
        });

        return NextResponse.json({
            success: true,
            data: merged,
            updatedAt: data?.updated_at || null
        });
    } catch (err) {
        console.error('[API thumbnails-config] GET error:', err);
        return NextResponse.json({
            success: true,
            data: DEFAULT_CATEGORY_THUMBNAILS,
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
        const incomingCategories = body.categories || body.data || body;

        // Clean & sanitize categories
        const sanitizedCategories = {};
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

        const payload = {
            categories: sanitizedCategories,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('website_section_configs')
            .upsert({
                section_id: 'ecom-v2-thumbnails',
                extra_config: payload,
                updated_at: new Date().toISOString()
            }, { onConflict: 'section_id' })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'Services thumbnails configuration saved successfully',
            data: sanitizedCategories,
            updatedAt: data?.updated_at
        });
    } catch (err) {
        console.error('[API thumbnails-config] POST error:', err);
        return NextResponse.json({
            success: false,
            error: err.message || 'Failed to save thumbnails configuration'
        }, { status: 500 });
    }
}
