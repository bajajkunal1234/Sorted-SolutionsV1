import { createServerSupabase } from '@/lib/supabase-server';
import {
    V2_CATEGORIES,
    getCategoryBySlug,
    normalizeWebServiceItem,
} from '@/lib/v2/catalogConfig';

export const WEB_SERVICE_SELECT_FIELDS =
    'id, name, category, subcategory, sku, description, type, subtype, status, sale_price, selling_price, retail_price, gst_applicable, gst_rate, sac_code, hsn_code, images, terms_conditions, service_terms_template, job_type, web_details';

// ── In-Memory Server Cache (15-second TTL with Stale-While-Revalidate) ──────
const CACHE_TTL_MS = 15 * 1000;
let homepageBrandLogosCache = { data: null, timestamp: 0 };
let dynamicCatalogCache = { data: null, timestamp: 0 };
let publishedServicesCache = { data: null, timestamp: 0 };

export function invalidateServerCatalogCache() {
    homepageBrandLogosCache = { data: null, timestamp: 0 };
    dynamicCatalogCache = { data: null, timestamp: 0 };
    publishedServicesCache = { data: null, timestamp: 0 };
}

export async function fetchHomepageBrandLogos(supabaseClient = null) {
    const now = Date.now();
    if (homepageBrandLogosCache.data && (now - homepageBrandLogosCache.timestamp < CACHE_TTL_MS)) {
        return homepageBrandLogosCache.data;
    }

    const supabase = supabaseClient || createServerSupabase();
    if (!supabase) return { dayModeLogo: '/images/logos/logo-day.png', darkModeLogo: '/images/logos/logo-dark.png', altText: 'Sorted Solutions' };

    try {
        const { data } = await supabase
            .from('website_section_configs')
            .select('extra_config')
            .eq('section_id', 'ecom-v2-homepage')
            .maybeSingle();

        const logos = data?.extra_config?.logos;
        const result = {
            dayModeLogo: logos?.dayModeLogo || '/images/logos/logo-day.png',
            darkModeLogo: logos?.darkModeLogo || logos?.dayModeLogo || '/images/logos/logo-dark.png',
            altText: logos?.altText || 'Sorted Solutions'
        };
        homepageBrandLogosCache = { data: result, timestamp: now };
        return result;
    } catch (_) {
        return { dayModeLogo: '/images/logos/logo-day.png', darkModeLogo: '/images/logos/logo-dark.png', altText: 'Sorted Solutions' };
    }
}

/**
 * Fetches dynamic category & subcategory configurations from Supabase `website_section_configs`.
 * Overlays:
 * - 3-image sliding thumbnails for categories (`ecom-v2-homepage` / `ecom-v2-thumbnails`)
 * - Subcategory custom names, custom thumbnails/slides, and excluded/deleted subcategories (`ecom-v2-sub-%`)
 */
export async function fetchDynamicCatalogConfig(supabaseClient = null) {
    const now = Date.now();
    if (dynamicCatalogCache.data && (now - dynamicCatalogCache.timestamp < CACHE_TTL_MS)) {
        return dynamicCatalogCache.data;
    }

    const supabase = supabaseClient || createServerSupabase();
    if (!supabase) return V2_CATEGORIES;

    try {
        const [homepageRes, subcatRes, catPagesRes] = await Promise.all([
            supabase.from('website_section_configs').select('*').in('section_id', ['ecom-v2-homepage', 'ecom-v2-thumbnails']),
            supabase.from('website_section_configs').select('section_id, extra_config').like('section_id', 'ecom-v2-sub-%'),
            supabase.from('website_section_configs').select('section_id, extra_config').like('section_id', 'ecom-v2-cat-%')
        ]);

        const rows = Array.isArray(homepageRes.data) ? homepageRes.data : [];
        const hpRow = rows.find(r => r.section_id === 'ecom-v2-homepage');
        const thumbRow = rows.find(r => r.section_id === 'ecom-v2-thumbnails');

        const savedThumbnails = hpRow?.extra_config?.categories || thumbRow?.extra_config?.categories || {};
        const subcatRows = Array.isArray(subcatRes.data) ? subcatRes.data : [];
        const catPageRows = Array.isArray(catPagesRes.data) ? catPagesRes.data : [];

        const subConfigMap = new Map();
        const customSubcategoriesByCat = {};
        const categoryPageSubcatsMap = new Map();

        // Index category pages subcategories
        catPageRows.forEach(row => {
            const catSlug = row.section_id.replace('ecom-v2-cat-', '');
            if (Array.isArray(row.extra_config?.subcategories)) {
                categoryPageSubcatsMap.set(catSlug, row.extra_config.subcategories);
            }
        });

        subcatRows.forEach(row => {
            const cfg = row.extra_config;
            if (!cfg) return;

            const sectionKey = row.section_id.replace('ecom-v2-sub-', '');
            const catSlug = cfg.categorySlug || sectionKey.split('-')[0];
            const subSlug = cfg.subcategorySlug || sectionKey.substring(catSlug.length + 1);
            const fullKey = `${catSlug}/${subSlug}`;

            subConfigMap.set(fullKey, {
                ...cfg,
                sectionId: row.section_id,
                catSlug,
                subSlug
            });

            if (cfg.isCustomCreated) {
                if (!customSubcategoriesByCat[catSlug]) customSubcategoriesByCat[catSlug] = [];
                customSubcategoriesByCat[catSlug].push({
                    slug: subSlug,
                    name: cfg.subcategoryName || subSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    headline: cfg.hero?.title || `${cfg.subcategoryName || subSlug} Service`,
                    shortDesc: cfg.hero?.subtitle || '',
                    icon: cfg.thumbnailUrl || cfg.hero?.mediaUrl || '/images/services/ac_3d.png',
                    thumbnailSlides: Array.isArray(cfg.thumbnailSlides) ? cfg.thumbnailSlides : [],
                    isDeleted: Boolean(cfg.isDeleted)
                });
            }
        });

        const dynamicCats = V2_CATEGORIES.map(cat => {
            const thumbCfg = savedThumbnails[cat.slug] || {};
            const categorySlides = Array.isArray(thumbCfg.slides) && thumbCfg.slides.length > 0
                ? thumbCfg.slides
                : [
                    { id: `${cat.slug}-1`, url: cat.icon, title: cat.name },
                    { id: `${cat.slug}-2`, url: cat.banner, title: 'Doorstep Care' }
                ];

            let resolvedSubcategories = [];

            if (categoryPageSubcatsMap.has(cat.slug)) {
                const pageSubcats = categoryPageSubcatsMap.get(cat.slug) || [];
                resolvedSubcategories = pageSubcats
                    .filter(s => !s.isDeleted && s.enabled !== false)
                    .map(s => {
                        const subSlides = Array.isArray(s.thumbnailSlides) && s.thumbnailSlides.length > 0
                            ? s.thumbnailSlides
                            : (s.icon ? [{ id: '1', url: s.icon, title: s.name }] : []);
                        return {
                            ...s,
                            slug: s.slug,
                            name: s.name,
                            shortDesc: s.shortDesc || '',
                            icon: s.icon || cat.icon || '/images/services/ac_3d.png',
                            thumbnailSlides: subSlides,
                            isCustomized: true
                        };
                    });
            } else {
                (cat.subcategories || []).forEach(sub => {
                    const override = subConfigMap.get(`${cat.slug}/${sub.slug}`);
                    if (override?.isDeleted) {
                        return; // Exclude deleted subcategory
                    }

                    const subSlides = Array.isArray(override?.thumbnailSlides) && override.thumbnailSlides.length > 0
                        ? override.thumbnailSlides
                        : (override?.thumbnailUrl ? [{ id: 'sub-1', url: override.thumbnailUrl }] : []);

                    resolvedSubcategories.push({
                        ...sub,
                        name: override?.subcategoryName || sub.name,
                        icon: override?.thumbnailUrl || sub.icon,
                        thumbnailSlides: subSlides,
                        headline: override?.hero?.title || sub.headline,
                        shortDesc: override?.hero?.subtitle || sub.shortDesc,
                        isCustomized: Boolean(override)
                    });
                });

                const customForCat = customSubcategoriesByCat[cat.slug] || [];
                customForCat.forEach(cSub => {
                    if (!cSub.isDeleted && !resolvedSubcategories.some(s => s.slug === cSub.slug)) {
                        resolvedSubcategories.push(cSub);
                    }
                });
            }

            return {
                ...cat,
                thumbnailSlides: categorySlides,
                thumbnailInterval: thumbCfg.interval || 3500,
                thumbnailDirection: thumbCfg.directionStyle || 'multidirectional',
                subcategories: resolvedSubcategories
            };
        });

        dynamicCatalogCache = { data: dynamicCats, timestamp: now };
        return dynamicCats;
    } catch (err) {
        console.error('[fetchDynamicCatalogConfig] Error:', err);
        return V2_CATEGORIES;
    }
}

/**
 * Fetches all active website-published inventory items (strictly subtype = 'web').
 */
export async function fetchPublishedWebServices({ categorySlug = null, query = null, supabaseClient = null } = {}) {
    const now = Date.now();
    let allServices, categoryCounts, dynamicCategories, logos;

    if (publishedServicesCache.data && (now - publishedServicesCache.timestamp < CACHE_TTL_MS)) {
        ({ allServices, categoryCounts, dynamicCategories, logos } = publishedServicesCache.data);
    } else {
        const supabase = supabaseClient || createServerSupabase();
        const [invRes, dynamicCats, hpLogos] = await Promise.all([
            supabase
                .from('inventory')
                .select(WEB_SERVICE_SELECT_FIELDS)
                .eq('subtype', 'web')
                .eq('status', 'active')
                .order('name', { ascending: true }),
            fetchDynamicCatalogConfig(supabase),
            fetchHomepageBrandLogos(supabase)
        ]);

        if (invRes.error) throw invRes.error;

        allServices = (invRes.data || []).map(normalizeWebServiceItem);
        categoryCounts = {};
        allServices.forEach(item => {
            categoryCounts[item.categorySlug] = (categoryCounts[item.categorySlug] || 0) + 1;
        });

        dynamicCategories = dynamicCats;
        logos = hpLogos;

        publishedServicesCache = {
            data: { allServices, categoryCounts, dynamicCategories, logos },
            timestamp: now
        };
    }

    const categories = (dynamicCategories || []).map(cat => ({
        ...cat,
        count: categoryCounts[cat.slug] || 0,
    }));

    let services = allServices;
    const catParam = (categorySlug || '').trim().toLowerCase();
    if (catParam && catParam !== 'all') {
        const matched = getCategoryBySlug(catParam);
        if (matched) {
            services = services.filter(item => item.categorySlug === matched.slug);
        } else {
            services = services.filter(
                item =>
                    item.categorySlug === catParam ||
                    item.dbCategory.toLowerCase() === catParam
            );
        }
    }

    const q = (query || '').trim().toLowerCase();
    if (q) {
        services = services.filter(
            item =>
                item.name.toLowerCase().includes(q) ||
                item.categoryName.toLowerCase().includes(q) ||
                item.subgroup.toLowerCase().includes(q) ||
                item.description.toLowerCase().includes(q)
        );
    }

    return {
        categories,
        services,
        categoryCounts,
        totalPublished: allServices.length,
        logos
    };
}
