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

async function fetchCategorySectionRow(supabase, slug) {
    if (!supabase) return null;
    try {
        const { data } = await supabase
            .from('website_section_configs')
            .select('extra_config')
            .eq('section_id', `ecom-v2-cat-${slug}`)
            .maybeSingle();
        return data || null;
    } catch (_) {
        return null;
    }
}

export default async function V2CategoryPage({ params, searchParams }) {
    const slug = params.category || params.slug;
    const supabase = createServerSupabase();

    // ── Ultra-Fast Single Parallel Fetch ─────────────────────────────────────
    const [dynamicCats, data, catRow, tplConfig] = await Promise.all([
        fetchDynamicCatalogConfig(supabase),
        fetchPublishedWebServices({ categorySlug: slug, supabaseClient: supabase }).catch(err => {
            console.error('[V2CategoryPage] failed to fetch web services:', err?.message);
            return { services: [], categoryCounts: {} };
        }),
        fetchCategorySectionRow(supabase, slug),
        fetchProcessTemplatesConfig(supabase).catch(() => null)
    ]);

    const category = (dynamicCats || []).find(c => c.slug === slug) || getCategoryBySlug(slug);

    if (!category) {
        notFound();
    }

    // Fetch saved category page config & Our Process templates
    const defaultConfig = getCategoryDefaultConfig(category.slug, category.name);
    let finalPageConfig = defaultConfig;
    const processTemplatesConfig = tplConfig;
    const row = catRow;

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
