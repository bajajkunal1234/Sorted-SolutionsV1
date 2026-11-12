import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const DEFAULT_HERO_SLIDES = [
    {
        id: 'slide-1',
        kicker: 'AC Foam-Jet Deep Clean',
        headline: 'Beat the Mumbai Heat with 25% Off',
        subline: 'Starts at ₹599 • 90-min doorstep arrival',
        ctaText: 'Book now',
        ctaLink: '/v2/services/ac-repair',
        bgColor: '#311b6b',
        bgGradient: 'linear-gradient(135deg, #1d1042 0%, #47288f 100%)',
        mediaType: 'image',
        mediaUrl: '/images/banners/banner_speed_90_mins.png',
        badge: '25% OFF',
        active: true,
        order: 1
    },
    {
        id: 'slide-2',
        kicker: 'Certified Pros & Genuine Parts',
        headline: 'Expert Washing Machine & Fridge Care',
        subline: '30-Day post-repair warranty included',
        ctaText: 'Explore services',
        ctaLink: '/v2/services/washing-machine-repair',
        bgColor: '#3e2723',
        bgGradient: 'linear-gradient(135deg, #2b170c 0%, #5d3a1a 100%)',
        mediaType: 'image',
        mediaUrl: '/images/banners/banner_30_day_warranty.png',
        badge: '30-DAY WARRANTY',
        active: true,
        order: 2
    },
    {
        id: 'slide-3',
        kicker: 'Mumbai Hyper-Local Dispatch',
        headline: 'Water Purifier & Chimney Servicing',
        subline: 'Powai to Colaba • Upfront fixed pricing',
        ctaText: 'Book service',
        ctaLink: '/v2/services/water-purifier-repair',
        bgColor: '#0277bd',
        bgGradient: 'linear-gradient(135deg, #01416e 0%, #0288d1 100%)',
        mediaType: 'image',
        mediaUrl: '/images/banners/banner_pan_mumbai.png',
        badge: 'ALL MUMBAI',
        active: true,
        order: 3
    }
];

export async function GET(request) {
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
            ? config.slides
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

        // Clean & sanitize slides
        const sanitizedSlides = slides.map((s, idx) => ({
            id: s.id || `slide-${idx + 1}-${Date.now().toString(36)}`,
            kicker: String(s.kicker || '').trim(),
            headline: String(s.headline || '').trim(),
            subline: String(s.subline || '').trim(),
            ctaText: String(s.ctaText || 'Book now').trim(),
            ctaLink: String(s.ctaLink || '/v2/services').trim(),
            bgColor: s.bgColor || '#311b6b',
            bgGradient: s.bgGradient || 'linear-gradient(135deg, #1d1042 0%, #47288f 100%)',
            mediaType: ['image', 'gif', 'video'].includes(s.mediaType) ? s.mediaType : 'image',
            mediaUrl: String(s.mediaUrl || '').trim(),
            badge: String(s.badge || '').trim(),
            active: Boolean(s.active !== false),
            order: typeof s.order === 'number' ? s.order : idx + 1
        }));

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
