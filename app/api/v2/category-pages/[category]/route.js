import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { getCategoryBySlug } from '@/lib/v2/catalogConfig';
import { getCategoryDefaultConfig } from '@/lib/v2/categoryPageDefaults';
import { getDefaultTemplateIdForCategory } from '@/lib/v2/processTemplates';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
    try {
        const { category: categorySlug } = params;
        const catalogInfo = getCategoryBySlug(categorySlug);
        const categoryName = catalogInfo?.name || categorySlug;

        const sectionId = `ecom-v2-cat-${categorySlug}`;
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

        const defaultConfig = getCategoryDefaultConfig(categorySlug, categoryName);

        // Merge saved config over default config
        const defaultTemplateId = getDefaultTemplateIdForCategory(categorySlug);
        const finalConfig = savedConfig ? {
            ...defaultConfig,
            ...savedConfig,
            hero: { ...defaultConfig.hero, ...(savedConfig.hero || {}) },
            servicesSection: { ...defaultConfig.servicesSection, ...(savedConfig.servicesSection || {}) },
            applianceType: { ...defaultConfig.applianceType, ...(savedConfig.applianceType || {}) },
            process: {
                enabled: savedConfig.process?.enabled !== false,
                templateId: savedConfig.process?.templateId || defaultTemplateId
            },
            technicians: { ...defaultConfig.technicians, ...(savedConfig.technicians || {}) },
            brands: { ...defaultConfig.brands, ...(savedConfig.brands || {}) },
            coverPromise: { ...defaultConfig.coverPromise, ...(savedConfig.coverPromise || {}) },
            notIncluded: { ...defaultConfig.notIncluded, ...(savedConfig.notIncluded || {}) },
            faqs: { ...defaultConfig.faqs, ...(savedConfig.faqs || {}) },
            reviews: { ...defaultConfig.reviews, ...(savedConfig.reviews || {}) },
            desktopStickyPromise: { ...defaultConfig.desktopStickyPromise, ...(savedConfig.desktopStickyPromise || {}) },
        } : {
            ...defaultConfig,
            process: {
                enabled: true,
                templateId: defaultTemplateId
            }
        };

        return NextResponse.json({
            success: true,
            isCustomized: Boolean(savedConfig),
            sectionId,
            categorySlug,
            categoryName,
            updatedAt,
            data: finalConfig
        });
    } catch (err) {
        console.error('[API category-page] GET error:', err);
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
        const { category: categorySlug } = params;
        const body = await request.json();
        const catalogInfo = getCategoryBySlug(categorySlug);
        const categoryName = catalogInfo?.name || categorySlug;

        const sectionId = `ecom-v2-cat-${categorySlug}`;
        const supabase = createServerSupabase();

        if (!supabase) {
            return NextResponse.json({ success: false, error: 'Database connection failed' }, { status: 500 });
        }

        const payload = {
            section_id: sectionId,
            page_slug: `v2/services/${categorySlug}`,
            extra_config: {
                ...body,
                categorySlug,
                categoryName
            },
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('website_section_configs')
            .upsert(payload, { onConflict: 'section_id' })
            .select()
            .single();

        if (error) {
            console.error('[API category-page] upsert error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Category page for ${categoryName} saved successfully`,
            sectionId,
            updatedAt: data?.updated_at
        });
    } catch (err) {
        console.error('[API category-page] save error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
