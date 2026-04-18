/**
 * Dynamic Sitemap — served at /sitemap.xml by Next.js App Router.
 *
 * All page types are read from Supabase so the sitemap stays in sync
 * with the Website Page Builder automatically:
 *
 * - Categories    → booking_categories table
 * - Subcategories → booking_subcategories table
 * - Locations     → page_settings WHERE page_type = 'location'
 * - Sub-locations → derived: locations × categories
 * - Static pages  → hardcoded (never change without a deploy)
 *
 * Creating or deleting a page in Reports > Website Settings > Page Builder
 * is immediately reflected in the sitemap on the next request (revalidate=3600).
 *
 * Submit to Google Search Console: https://sortedsolutions.in/sitemap.xml
 */

import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Regenerate at most once per hour

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://sortedsolutions.in').replace(/\/$/, '');

// Fallbacks used if DB is unreachable
const FALLBACK_LOCATIONS = [
    'andheri', 'malad', 'jogeshwari', 'kandivali', 'goregaon',
    'ville-parle', 'santacruz', 'bandra', 'khar', 'mahim',
    'dadar', 'powai', 'saki-naka', 'ghatkopar', 'kurla',
];

const FALLBACK_APPLIANCES = [
    { slug: 'ac-repair',              subcategories: [{ slug: 'split-ac' }, { slug: 'window-ac' }, { slug: 'cassette-ac' }] },
    { slug: 'washing-machine-repair', subcategories: [{ slug: 'front-load' }, { slug: 'top-load' }] },
    { slug: 'refrigerator-repair',    subcategories: [{ slug: 'single-door' }, { slug: 'double-door' }] },
    { slug: 'oven-repair',            subcategories: [{ slug: 'microwave-oven' }, { slug: 'otg-oven' }] },
    { slug: 'water-purifier-repair',  subcategories: [{ slug: 'domestic-ro' }, { slug: 'commercial-ro' }] },
    { slug: 'hob-repair',             subcategories: [{ slug: 'gas-stove' }, { slug: 'built-in-hob' }] },
];

async function fetchSitemapData() {
    try {
        const supabase = createServerSupabase();
        if (!supabase) return { appliances: FALLBACK_APPLIANCES, locations: FALLBACK_LOCATIONS };

        // Fetch all three sources in parallel
        const [catsRes, subsRes, pagesRes] = await Promise.all([
            supabase
                .from('booking_categories')
                .select('id, name, slug')
                .order('display_order', { ascending: true }),
            supabase
                .from('booking_subcategories')
                .select('id, name, slug, category_id')
                .order('display_order', { ascending: true }),
            // Locations come from page_settings — the same table Page Builder writes to
            // page_id format: 'loc-andheri', 'loc-bandra', etc.
            supabase
                .from('page_settings')
                .select('page_id')
                .eq('page_type', 'location'),
        ]);

        // ── Categories + Subcategories ────────────────────────────────────
        const cats = catsRes.data || [];
        const subs = subsRes.data || [];
        const appliances = cats.length > 0
            ? cats.map(cat => ({
                slug: cat.slug,
                subcategories: subs
                    .filter(s => s.category_id === cat.id)
                    .map(s => ({ slug: s.slug || s.name.toLowerCase().replace(/\s+/g, '-') })),
            }))
            : FALLBACK_APPLIANCES;

        // ── Locations from page_settings ──────────────────────────────────
        // Strip the 'loc-' prefix to get the raw slug: 'loc-andheri' -> 'andheri'
        const locationRows = pagesRes.data || [];
        const locations = locationRows.length > 0
            ? locationRows.map(p => p.page_id.replace(/^loc-/, ''))
            : FALLBACK_LOCATIONS;

        return { appliances, locations };

    } catch (err) {
        console.error('[sitemap] DB fetch error:', err.message);
        return { appliances: FALLBACK_APPLIANCES, locations: FALLBACK_LOCATIONS };
    }
}

export default async function sitemap() {
    const now = new Date().toISOString();
    const { appliances, locations } = await fetchSitemapData();

    // ── 1. Static pages (only change with a code deploy) ──────────────────
    const staticPages = [
        { url: `${BASE_URL}/`,              lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
        { url: `${BASE_URL}/booking`,       lastModified: now, changeFrequency: 'weekly',  priority: 0.95 },
        { url: `${BASE_URL}/contact`,       lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${BASE_URL}/terms`,         lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
        { url: `${BASE_URL}/privacy`,       lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
        { url: `${BASE_URL}/accessibility`, lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
    ];

    // ── 2. Category pages — /services/[category] ──────────────────────────
    const categoryPages = appliances.map(({ slug }) => ({
        url: `${BASE_URL}/services/${slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.9,
    }));

    // ── 3. Subcategory pages — /services/[category]/[subcategory] ─────────
    const subcategoryPages = appliances.flatMap(({ slug, subcategories }) =>
        subcategories.map(sub => ({
            url: `${BASE_URL}/services/${slug}/${sub.slug}`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.85,
        }))
    );

    // ── 4. Location pages — /location/[loc] ───────────────────────────────
    // Source: page_settings WHERE page_type='location' — updated by Page Builder
    const locationPages = locations.map(loc => ({
        url: `${BASE_URL}/location/${loc}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
    }));

    // ── 5. Sub-location pages — /location/[loc]/[service] ────────────────
    // Auto-derived: every active location × every active service category
    const sublocationPages = locations.flatMap(loc =>
        appliances.map(({ slug }) => ({
            url: `${BASE_URL}/location/${loc}/${slug}`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.75,
        }))
    );

    return [
        ...staticPages,
        ...categoryPages,
        ...subcategoryPages,
        ...locationPages,
        ...sublocationPages,
    ];
}
