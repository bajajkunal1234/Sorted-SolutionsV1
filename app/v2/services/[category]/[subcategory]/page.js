import { notFound } from 'next/navigation';
import { getSubcategoryBySlug } from '@/lib/v2/catalogConfig';
import { fetchPublishedWebServices } from '@/lib/v2/serverCatalog';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSubcategoryDefaultConfig } from '@/lib/v2/subcategoryPageDefaults';
import SubcategoryStorefront from '@/components/v2/SubcategoryStorefront';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
    const { category, subcategory } = getSubcategoryBySlug(params.category, params.subcategory) || {};
    if (!category || !subcategory) {
        return { title: 'Appliance Services | Sorted Doorstep Care' };
    }
    return {
        title: `${subcategory.headline || subcategory.name} in Mumbai | Sorted Doorstep Care`,
        description: subcategory.shortDesc || category.tagline,
        robots: { index: false, follow: false }
    };
}

export default async function V2SubcategoryPage({ params, searchParams }) {
    const result = getSubcategoryBySlug(params.category, params.subcategory);
    if (!result || !result.category || !result.subcategory) {
        notFound();
    }

    const { category, subcategory } = result;

    let data = { services: [], categoryCounts: {} };
    try {
        data = await fetchPublishedWebServices({ categorySlug: category.slug });
    } catch (err) {
        console.error('[V2SubcategoryPage] error:', err?.message);
    }

    // Fetch custom subcategory page configuration saved by Admin
    let savedConfig = null;
    try {
        const supabase = createServerSupabase();
        if (supabase) {
            const { data: configRow } = await supabase
                .from('website_section_configs')
                .select('extra_config')
                .eq('section_id', `ecom-v2-sub-${category.slug}-${subcategory.slug}`)
                .maybeSingle();

            if (configRow?.extra_config) {
                savedConfig = configRow.extra_config;
            }
        }
    } catch (err) {
        console.error('[V2SubcategoryPage] pageConfig error:', err?.message);
    }

    const defaultConfig = getSubcategoryDefaultConfig(category.slug, subcategory.slug, category.name, subcategory.name);
    const finalPageConfig = savedConfig ? {
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

    return (
        <SubcategoryStorefront
            category={category}
            subcategory={subcategory}
            services={data.services}
            categoryCounts={data.categoryCounts}
            highlightId={searchParams?.highlight || null}
            initialQuery={searchParams?.q || ''}
            pageConfig={finalPageConfig}
        />
    );
}
