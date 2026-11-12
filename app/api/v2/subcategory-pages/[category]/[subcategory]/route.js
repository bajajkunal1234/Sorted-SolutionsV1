import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { getSubcategoryBySlug } from '@/lib/v2/catalogConfig';
import { getSubcategoryDefaultConfig } from '@/lib/v2/subcategoryPageDefaults';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
    try {
        const { category: categorySlug, subcategory: subcategorySlug } = params;
        const catalogInfo = getSubcategoryBySlug(categorySlug, subcategorySlug);
        const categoryName = catalogInfo?.category?.name || categorySlug;
        const subcategoryName = catalogInfo?.subcategory?.name || subcategorySlug;

        const sectionId = `ecom-v2-sub-${categorySlug}-${subcategorySlug}`;
        const supabase = createServerSupabase();

        let savedConfig = null;
        let updatedAt = null;

        if (supabase) {
            const { data, error } = await supabase
                .from('website_section_configs')
                .select('*')
                .eq('section_id', sectionId)
                .maybeSingle();

            if (!error && data?.extra_config) {
                savedConfig = data.extra_config;
                updatedAt = data.updated_at;
            }
        }

        const defaultConfig = getSubcategoryDefaultConfig(categorySlug, subcategorySlug, categoryName, subcategoryName);

        // Merge saved config over default config so newly added fields always have fallback
        const finalConfig = savedConfig ? {
            ...defaultConfig,
            ...savedConfig,
            hero: { ...defaultConfig.hero, ...(savedConfig.hero || {}) },
            servicesSection: { ...defaultConfig.servicesSection, ...(savedConfig.servicesSection || {}) },
            process: { ...defaultConfig.process, ...(savedConfig.process || {}) },
            technicians: { ...defaultConfig.technicians, ...(savedConfig.technicians || {}) },
            brands: { ...defaultConfig.brands, ...(savedConfig.brands || {}) },
            coverPromise: { ...defaultConfig.coverPromise, ...(savedConfig.coverPromise || {}) },
            notIncluded: { ...defaultConfig.notIncluded, ...(savedConfig.notIncluded || {}) },
            faqs: { ...defaultConfig.faqs, ...(savedConfig.faqs || {}) },
            reviews: { ...defaultConfig.reviews, ...(savedConfig.reviews || {}) },
            desktopStickyPromise: { ...defaultConfig.desktopStickyPromise, ...(savedConfig.desktopStickyPromise || {}) },
            sectionOrder: Array.isArray(savedConfig.sectionOrder) ? savedConfig.sectionOrder : defaultConfig.sectionOrder
        } : defaultConfig;

        return NextResponse.json({
            success: true,
            isCustomized: Boolean(savedConfig),
            sectionId,
            categorySlug,
            subcategorySlug,
            categoryName,
            subcategoryName,
            updatedAt,
            data: finalConfig
        });
    } catch (err) {
        console.error('[API subcategory-page] GET error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    return handleSave(request, params);
}

export async function PUT(request, { params }) {
    return handleSave(request, params);
}

async function handleSave(request, params) {
    try {
        const { category: categorySlug, subcategory: subcategorySlug } = params;
        const sectionId = `ecom-v2-sub-${categorySlug}-${subcategorySlug}`;
        const supabase = createServerSupabase();

        if (!supabase) {
            return NextResponse.json({ success: false, error: 'Database connection failed' }, { status: 500 });
        }

        const body = await request.json();
        const configData = body.data || body;

        // Clean & sanitize config fields
        const sanitizedConfig = {
            categorySlug,
            subcategorySlug,
            categoryName: body.categoryName || categorySlug,
            subcategoryName: body.subcategoryName || subcategorySlug,
            hero: {
                mediaType: ['image', 'gif', 'video'].includes(configData.hero?.mediaType) ? configData.hero.mediaType : 'image',
                mediaUrl: String(configData.hero?.mediaUrl || '').trim(),
                title: String(configData.hero?.title || '').trim(),
                subtitle: String(configData.hero?.subtitle || '').trim(),
                rating: String(configData.hero?.rating || '4.8').trim(),
                reviewsCount: String(configData.hero?.reviewsCount || '10K').trim(),
                rateCardText: String(configData.hero?.rateCardText || 'Standard rate card').trim(),
                rateCardBadge: String(configData.hero?.rateCardBadge || 'sorted cover').trim(),
                enabled: configData.hero?.enabled !== false
            },
            servicesSection: {
                title: String(configData.servicesSection?.title || 'Select a Service').trim(),
                subtitle: String(configData.servicesSection?.subtitle || '').trim(),
                enabled: configData.servicesSection?.enabled !== false
            },
            process: {
                title: String(configData.process?.title || 'Our process').trim(),
                enabled: configData.process?.enabled !== false,
                steps: Array.isArray(configData.process?.steps) ? configData.process.steps.map((st, i) => ({
                    number: i + 1,
                    title: String(st.title || '').trim(),
                    description: String(st.description || '').trim(),
                    imageUrl: String(st.imageUrl || '').trim()
                })) : []
            },
            technicians: {
                title: String(configData.technicians?.title || 'Top technicians').trim(),
                photoUrl: String(configData.technicians?.photoUrl || '').trim(),
                enabled: configData.technicians?.enabled !== false,
                points: Array.isArray(configData.technicians?.points) ? configData.technicians.points.map(p => String(p).trim()).filter(Boolean) : []
            },
            brands: {
                title: String(configData.brands?.title || 'We service all brands').trim(),
                disclaimer: String(configData.brands?.disclaimer || '').trim(),
                enabled: configData.brands?.enabled !== false,
                items: Array.isArray(configData.brands?.items) ? configData.brands.items.map(b => String(b).trim()).filter(Boolean) : []
            },
            coverPromise: {
                title: String(configData.coverPromise?.title || 'Sorted Cover Promise').trim(),
                badge: String(configData.coverPromise?.badge || 'sorted cover').trim(),
                enabled: configData.coverPromise?.enabled !== false,
                points: Array.isArray(configData.coverPromise?.points) ? configData.coverPromise.points.map(p => ({
                    icon: p.icon || 'shield',
                    text: String(p.text || '').trim()
                })).filter(p => p.text) : []
            },
            notIncluded: {
                title: String(configData.notIncluded?.title || 'What is not included').trim(),
                enabled: configData.notIncluded?.enabled !== false,
                items: Array.isArray(configData.notIncluded?.items) ? configData.notIncluded.items.map(it => String(it).trim()).filter(Boolean) : []
            },
            faqs: {
                title: String(configData.faqs?.title || 'Frequently asked questions').trim(),
                enabled: configData.faqs?.enabled !== false,
                items: Array.isArray(configData.faqs?.items) ? configData.faqs.items.map(faq => ({
                    question: String(faq.question || '').trim(),
                    answer: String(faq.answer || '').trim()
                })).filter(faq => faq.question) : []
            },
            reviews: {
                title: String(configData.reviews?.title || 'Customer Reviews').trim(),
                enabled: configData.reviews?.enabled !== false,
                rating: String(configData.reviews?.rating || '4.83').trim(),
                totalCount: String(configData.reviews?.totalCount || '50K reviews').trim(),
                distribution: configData.reviews?.distribution || { star5: '88%', star4: '8%', star3: '2%', star2: '1%', star1: '1%' },
                items: Array.isArray(configData.reviews?.items) ? configData.reviews.items.map((rev, idx) => ({
                    id: rev.id || `rev-${idx + 1}-${Date.now().toString(36)}`,
                    name: String(rev.name || '').trim(),
                    rating: Number(rev.rating) || 5,
                    date: String(rev.date || '').trim(),
                    tag: String(rev.tag || '').trim(),
                    comment: String(rev.comment || '').trim()
                })).filter(rev => rev.name && rev.comment) : []
            },
            desktopStickyPromise: {
                title: String(configData.desktopStickyPromise?.title || 'Sorted Promise').trim(),
                badgeText: String(configData.desktopStickyPromise?.badgeText || 'QUALITY ASSURED').trim(),
                points: Array.isArray(configData.desktopStickyPromise?.points) ? configData.desktopStickyPromise.points.map(p => String(p).trim()).filter(Boolean) : []
            },
            sectionOrder: Array.isArray(configData.sectionOrder) ? configData.sectionOrder : [
                'hero', 'services', 'process', 'technicians', 'brands', 'coverPromise', 'notIncluded', 'faqs', 'reviews'
            ],
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('website_section_configs')
            .upsert({
                section_id: sectionId,
                extra_config: sanitizedConfig,
                updated_at: new Date().toISOString()
            }, { onConflict: 'section_id' })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'Subcategory page settings saved successfully',
            sectionId,
            updatedAt: data?.updated_at,
            data: sanitizedConfig
        });
    } catch (err) {
        console.error('[API subcategory-page] SAVE error:', err);
        return NextResponse.json({ success: false, error: err.message || 'Failed to save page settings' }, { status: 500 });
    }
}
