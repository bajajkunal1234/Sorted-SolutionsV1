import { createServerSupabase } from '@/lib/supabase-server';
import { invalidateServerCatalogCache } from '@/lib/v2/serverCatalog';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function clampPercent(val, fallback) {
    const n = Number(val);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(100, Math.round(n)));
}

export function normalizeHeroSlide(s = {}, idx = 0) {
    return {
        id: s.id || `slide-${idx + 1}-${Date.now().toString(36)}`,
        mediaType: ['image', 'gif', 'video'].includes(s.mediaType) ? s.mediaType : 'image',
        mediaUrl: String(s.mediaUrl || '').trim(),
        ctaText: String(s.ctaText ?? '').trim(),
        ctaLink: String(s.ctaLink || '/v2/services').trim(),
        profilePos: {
            x: clampPercent(s.profilePos?.x, 98),
            y: clampPercent(s.profilePos?.y, 4),
            visible: s.profilePos?.visible !== false
        },
        ctaPos: {
            x: clampPercent(s.ctaPos?.x, 6),
            y: clampPercent(s.ctaPos?.y, 88)
        },
        active: Boolean(s.active !== false),
        order: typeof s.order === 'number' ? s.order : idx + 1
    };
}

export const DEFAULT_HERO_SLIDES = [
    {
        id: 'slide-1',
        mediaType: 'image',
        mediaUrl: '/images/banners/banner_speed_90_mins.png',
        ctaText: '',
        ctaLink: '/v2/services/ac-repair',
        profilePos: { x: 98, y: 4, visible: true },
        ctaPos: { x: 6, y: 88 },
        active: true,
        order: 1
    },
    {
        id: 'slide-2',
        mediaType: 'image',
        mediaUrl: '/images/banners/banner_30_day_warranty.png',
        ctaText: '',
        ctaLink: '/v2/services/washing-machine-repair',
        profilePos: { x: 98, y: 4, visible: true },
        ctaPos: { x: 6, y: 88 },
        active: true,
        order: 2
    },
    {
        id: 'slide-3',
        mediaType: 'image',
        mediaUrl: '/images/banners/banner_pan_mumbai.png',
        ctaText: '',
        ctaLink: '/v2/services/water-purifier-repair',
        profilePos: { x: 98, y: 4, visible: true },
        ctaPos: { x: 6, y: 88 },
        active: true,
        order: 3
    }
];

export async function GET() {
    try {
        const supabase = createServerSupabase();
        if (!supabase) {
            return NextResponse.json({
                success: true,
                data: { slides: DEFAULT_HERO_SLIDES, isFallback: true }
            });
        }

        const { data, error } = await supabase
            .from('website_section_configs')
            .select('*')
            .eq('section_id', 'ecom-v2-hero')
            .maybeSingle();

        if (error) {
            console.error('Error fetching ecom-v2-hero config:', error);
            return NextResponse.json({
                success: true,
                data: { slides: DEFAULT_HERO_SLIDES, isFallback: true }
            });
        }

        const config = data?.extra_config || data?.config;
        const slides = Array.isArray(config?.slides) && config.slides.length > 0
            ? config.slides.map((s, idx) => normalizeHeroSlide(s, idx))
            : DEFAULT_HERO_SLIDES;

        return NextResponse.json({
            success: true,
            data: {
                slides,
                autoSlideSeconds: config?.autoSlideSeconds || 7,
                enableVideoAdvance: config?.enableVideoAdvance ?? true,
                updatedAt: data?.updated_at || null
            }
        });
    } catch (err) {
        console.error('Unhandled hero-config GET error:', err);
        return NextResponse.json({
            success: true,
            data: { slides: DEFAULT_HERO_SLIDES, isFallback: true }
        });
    }
}

export async function POST(request) {
    return handleSave(request);
}

export async function PUT(request) {
    return handleSave(request);
}

async function handleSave(request) {
    try {
        const supabase = createServerSupabase();
        if (!supabase) {
            return NextResponse.json({ success: false, error: 'Database connection failed' }, { status: 500 });
        }

        const body = await request.json();
        const slides = Array.isArray(body.slides) ? body.slides : [];

        if (slides.length === 0) {
            return NextResponse.json({ success: false, error: 'At least one slide is required' }, { status: 400 });
        }

        const sanitizedSlides = slides.map((s, idx) => normalizeHeroSlide(s, idx));

        const extra_config = {
            slides: sanitizedSlides,
            autoSlideSeconds: Math.max(3, Math.min(30, Number(body.autoSlideSeconds) || 7)),
            enableVideoAdvance: Boolean(body.enableVideoAdvance !== false),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('website_section_configs')
            .upsert({
                section_id: 'ecom-v2-hero',
                extra_config,
                updated_at: new Date().toISOString()
            }, { onConflict: 'section_id' })
            .select()
            .single();

        if (error) throw error;

        invalidateServerCatalogCache();

        return NextResponse.json({
            success: true,
            message: 'Hero carousel settings saved successfully',
            data: {
                slides: sanitizedSlides,
                autoSlideSeconds: extra_config.autoSlideSeconds,
                enableVideoAdvance: extra_config.enableVideoAdvance,
                updatedAt: data?.updated_at
            }
        });
    } catch (err) {
        console.error('Error saving hero-config:', err);
        return NextResponse.json({ success: false, error: err.message || 'Failed to save settings' }, { status: 500 });
    }
}
