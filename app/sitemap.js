/**
 * Dynamic Sitemap — served at /sitemap.xml by Next.js App Router.
 *
 * Single source of truth: page_settings table (same as Website Page Builder).
 * Every page created/deleted in Page Builder is immediately reflected here.
 *
 * URL derivation uses the same page_id → URL logic as PageBuilderTool.js:
 *   cat-{slug}                  → /services/{slug}
 *   sub-{cat-slug}-{sub-slug}   → /services/{cat-slug}/{sub-slug}
 *   loc-{slug}                  → /location/{slug}
 *   sloc-{loc}-{cat}-{sub}      → /location/{loc}/{cat}-{sub}  (or similar)
 *
 * Submit to Google Search Console: https://sortedsolutions.in/sitemap.xml
 */

import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Regenerate at most once per hour

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://sortedsolutions.in').replace(/\/$/, '');

// Known category slugs — used ONLY to correctly parse page_ids like
// 'sub-water-purifier-repair-domestic-ro-water-purifier' into
// /services/water-purifier-repair/domestic-ro-water-purifier
// Keep in sync with actual rows in booking_categories DB table.
const KNOWN_CATS = [
    'ac-repair',
    'washing-machine-repair',
    'refrigerator-repair',
    'oven-repair',
    'hob-repair',
    'water-purifier-repair',
];

const KNOWN_LOCS = [
    'andheri', 'malad', 'jogeshwari', 'kandivali', 'goregaon',
    'ville-parle', 'santacruz', 'bandra', 'khar', 'mahim',
    'dadar', 'powai', 'saki-naka', 'ghatkopar', 'kurla',
];

/**
 * Derives the live URL from a page_id.
 * Must stay in sync with getPageUrl() in PageBuilderTool.js.
 */
function pageIdToUrl(pageId) {
    if (!pageId) return null;

    // Category: cat-ac-repair → /services/ac-repair
    if (pageId.startsWith('cat-')) {
        return `/services/${pageId.replace('cat-', '')}`;
    }

    // Subcategory: sub-water-purifier-repair-domestic-ro-water-purifier
    //           → /services/water-purifier-repair/domestic-ro-water-purifier
    if (pageId.startsWith('sub-')) {
        const rest = pageId.replace('sub-', '');
        const cat = KNOWN_CATS.find(c => rest.startsWith(c + '-'));
        if (cat) return `/services/${cat}/${rest.slice(cat.length + 1)}`;
        // Fallback: try splitting at midpoint
        const parts = rest.split('-');
        if (parts.length >= 2) {
            const mid = Math.ceil(parts.length / 2);
            return `/services/${parts.slice(0, mid).join('-')}/${parts.slice(mid).join('-')}`;
        }
        return null;
    }

    // Location: loc-andheri → /location/andheri
    if (pageId.startsWith('loc-')) {
        return `/location/${pageId.replace('loc-', '')}`;
    }

    // Sub-location: sloc-andheri-ac-repair → /location/andheri/ac-repair
    if (pageId.startsWith('sloc-')) {
        const rest = pageId.replace('sloc-', '');
        const loc = KNOWN_LOCS.find(l => rest.startsWith(l + '-'));
        if (loc) return `/location/${loc}/${rest.slice(loc.length + 1)}`;
        return null;
    }

    return null;
}

async function fetchAllPages() {
    try {
        const supabase = createServerSupabase();
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('page_settings')
            .select('page_id, page_type, updated_at')
            .order('page_type', { ascending: true })
            .limit(2000);

        if (error) {
            console.error('[sitemap] page_settings fetch error:', error.message);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('[sitemap] fetchAllPages error:', err.message);
        return [];
    }
}

export default async function sitemap() {
    const now = new Date().toISOString();
    const pages = await fetchAllPages();

    // ── 1. Static pages (hardcoded — these never change without a deploy) ──
    const staticPages = [
        { url: `${BASE_URL}/`,              lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
        { url: `${BASE_URL}/booking`,       lastModified: now, changeFrequency: 'weekly',  priority: 0.95 },
        { url: `${BASE_URL}/contact`,       lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${BASE_URL}/terms`,         lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
        { url: `${BASE_URL}/privacy`,       lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
        { url: `${BASE_URL}/accessibility`, lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
    ];

    // Priority map by page type
    const priorityMap = {
        category: 0.9, cat: 0.9,
        subcategory: 0.85, sub: 0.85,
        location: 0.8, loc: 0.8,
        sublocation: 0.75, 'sub-loc': 0.75,
    };

    // ── 2. All dynamic pages from page_settings ────────────────────────────
    const dynamicPages = pages
        .map(page => {
            const url = pageIdToUrl(page.page_id);
            if (!url) return null; // Skip unrecognised page_ids
            return {
                url: `${BASE_URL}${url}`,
                lastModified: page.updated_at || now,
                changeFrequency: 'weekly',
                priority: priorityMap[page.page_type] ?? 0.7,
            };
        })
        .filter(Boolean); // Remove nulls

    return [...staticPages, ...dynamicPages];
}
