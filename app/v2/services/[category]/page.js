import { notFound } from 'next/navigation';
import { getCategoryBySlug } from '@/lib/v2/catalogConfig';
import { fetchPublishedWebServices, fetchDynamicCatalogConfig } from '@/lib/v2/serverCatalog';
import { getCategoryDefaultConfig } from '@/lib/v2/categoryPageDefaults';
import { fetchProcessTemplatesConfig } from '@/lib/v2/processTemplatesServer';
import { resolveProcessForCategory } from '@/lib/v2/processTemplates';
import { createServerSupabase } from '@/lib/supabase-server';
import CategoryStorefront from '@/components/v2/CategoryStorefront';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
    const slug = params.category || params.slug;
    const category = getCategoryBySlug(slug);
    if (!category) {
        return { title: 'Appliance Repair | Sorted Solutions' };
    }
    return {
        title: `${category.name} Service & Repair in Mumbai | Sorted Solutions`,
        description: category.tagline || `Expert ${category.name} repair and servicing across Mumbai. Upfront pricing, genuine spares & 30-day warranty.`
    };
}

export default async function V2CategoryPage({ params, searchParams }) {
    const slug = params.category || params.slug;

    // Load category from dynamic catalog (with custom subcategories & thumbnails)
    const dynamicCats = await fetchDynamicCatalogConfig();
    const category = dynamicCats.find(c => c.slug === slug) || getCategoryBySlug(slug);

    if (!category) {
        notFound();
    }

    // Fetch published web services for this category
    let data = { services: [], categoryCounts: {} };
    try {
        data = await fetchPublishedWebServices({ categorySlug: category.slug });
    } catch (err) {
        console.error('[V2CategoryPage] failed to fetch web services:', err?.message);
    }

    // Fetch saved category page config & Our Process templates from Supabase
    const defaultConfig = getCategoryDefaultConfig(category.slug, category.name);
    let finalPageConfig = defaultConfig;
    let processTemplatesConfig = null;

    try {
        const supabase = createServerSupabase();
        if (supabase) {
            const [catRes, tplConfig] = await Promise.all([
                supabase
                    .from('website_section_configs')
                    .select('extra_config')
                    .eq('section_id', `ecom-v2-cat-${category.slug}`)
                    .maybeSingle(),
                fetchProcessTemplatesConfig(supabase)
            ]);

            processTemplatesConfig = tplConfig;
            const row = catRes?.data;

            if (row?.extra_config) {
                finalPageConfig = {
                    ...defaultConfig,
                    ...row.extra_config,
                    subcategories: Array.isArray(row.extra_config.subcategories) ? row.extra_config.subcategories : (category.subcategories || []),
                    hero: { ...defaultConfig.hero, ...(row.extra_config.hero || {}) },
                    servicesSection: { ...defaultConfig.servicesSection, ...(row.extra_config.servicesSection || {}) },
                    applianceType: { ...defaultConfig.applianceType, ...(row.extra_config.applianceType || {}) },
                    process: { ...defaultConfig.process, ...(row.extra_config.process || {}) },
                    technicians: { ...defaultConfig.technicians, ...(row.extra_config.technicians || {}) },
                    brands: { ...defaultConfig.brands, ...(row.extra_config.brands || {}) },
                    coverPromise: { ...defaultConfig.coverPromise, ...(row.extra_config.coverPromise || {}) },
                    notIncluded: { ...defaultConfig.notIncluded, ...(row.extra_config.notIncluded || {}) },
                    faqs: { ...defaultConfig.faqs, ...(row.extra_config.faqs || {}) },
                    reviews: { ...defaultConfig.reviews, ...(row.extra_config.reviews || {}) },
                    desktopStickyPromise: { ...defaultConfig.desktopStickyPromise, ...(row.extra_config.desktopStickyPromise || {}) },
                };
            }
        }
    } catch (err) {
        console.error('[V2CategoryPage] error loading category config:', err?.message);
    }

    // Resolve Our Process from the linked template
    finalPageConfig = {
        ...finalPageConfig,
        process: resolveProcessForCategory(finalPageConfig.process, processTemplatesConfig, category.slug)
    };

    const finalSubcategories = (finalPageConfig.subcategories?.length > 0
        ? finalPageConfig.subcategories
        : (category.subcategories || [])).filter(s => !s.isDeleted && s.enabled !== false);

    return (
        <CategoryStorefront
            category={category}
            subcategories={finalSubcategories}
            services={data.services || []}
            categoryCounts={data.categoryCounts || {}}
            highlightId={searchParams?.highlight || null}
            initialQuery={searchParams?.q || ''}
            initialType={searchParams?.type || null}
            pageConfig={finalPageConfig}
        />
    );
}
