/**
 * Dynamic Sitemap — served at /sitemap.xml by Next.js App Router.
 *
 * Fetches live booking categories + subcategories from Supabase so
 * newly added services automatically appear in the sitemap without
 * needing a code deploy. Location pages are enumerated from the
 * static LOCATIONS array (matches WebsiteSettings and appliances API).
 *
 * Submit to Google Search Console: https://sorted.solutions/sitemap.xml
 */

import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Regenerate sitemap at most once per hour

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://sortedsolutions.in').replace(/\/$/, '');

const LOCATIONS = [
    'andheri', 'malad', 'jogeshwari', 'kandivali', 'goregaon',
    'ville-parle', 'santacruz', 'bandra', 'khar', 'mahim',
    'dadar', 'powai', 'saki-naka', 'ghatkopar', 'kurla',
];

// ── Fetch live appliance data from Supabase ────────────────────────────────
async function fetchAppliances() {
    // Hardcoded fallback — used if DB is unreachable or returns empty
    const FALLBACK = [
        { slug: 'ac-repair',              subcategories: [{ slug: 'split-ac' }, { slug: 'window-ac' }, { slug: 'cassette-ac' }] },
        { slug: 'washing-machine-repair', subcategories: [{ slug: 'front-load' }, { slug: 'top-load' }] },
        { slug: 'refrigerator-repair',    subcategories: [{ slug: 'single-door' }, { slug: 'double-door' }] },
        { slug: 'oven-repair',            subcategories: [{ slug: 'microwave-oven' }, { slug: 'otg-oven' }] },
        { slug: 'water-purifier-repair',  subcategories: [{ slug: 'domestic-ro' }, { slug: 'commercial-ro' }] },
        { slug: 'hob-repair',             subcategories: [{ slug: 'gas-stove' }, { slug: 'built-in-hob' }] },
    ];

    try {
        const supabase = createServerSupabase();
        if (!supabase) return FALLBACK;

        // Fetch categories
        const { data: cats } = await supabase
            .from('booking_categories')
            .select('id, name, slug')
            .order('display_order', { ascending: true });

        // If DB returns nothing, use fallback so service pages always appear
        if (!cats || cats.length === 0) return FALLBACK;

        // Fetch subcategories
        const { data: subs } = await supabase
            .from('booking_subcategories')
            .select('id, name, slug, category_id')
            .order('display_order', { ascending: true });

        // Map subcategories to their parent category
        return cats.map(cat => ({
            slug: cat.slug,
            subcategories: (subs || [])
                .filter(s => s.category_id === cat.id)
                .map(s => ({ slug: s.slug || s.name.toLowerCase().replace(/\s+/g, '-') })),
        }));
    } catch (err) {
        console.error('[sitemap] Error fetching appliances:', err.message);
        return FALLBACK;
    }
}

export default async function sitemap() {
    const now = new Date().toISOString();
    const appliances = await fetchAppliances();

    // ── 1. Static pages ────────────────────────────────────────────────────
    // These match the 4 pages managed in Reports > Website Settings > Static Pages Settings
    // plus the Homepage and Booking page.
    const staticPages = [
        { url: `${BASE_URL}/`,               lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
        { url: `${BASE_URL}/booking`,        lastModified: now, changeFrequency: 'weekly',  priority: 0.95 },
        { url: `${BASE_URL}/contact`,        lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${BASE_URL}/terms`,          lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
        { url: `${BASE_URL}/privacy`,        lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
        { url: `${BASE_URL}/accessibility`,  lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
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
    const locationPages = LOCATIONS.map(loc => ({
        url: `${BASE_URL}/location/${loc}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
    }));

    // ── 5. Sublocation pages — /location/[loc]/[service] ─────────────────
    const sublocationPages = LOCATIONS.flatMap(loc =>
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
