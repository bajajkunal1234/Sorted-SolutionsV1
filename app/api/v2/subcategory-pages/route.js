import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { V2_CATEGORIES } from '@/lib/v2/catalogConfig';
import { getSubcategoryDefaultConfig } from '@/lib/v2/subcategoryPageDefaults';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const supabase = createServerSupabase();

        // 1. Collect all standard catalog subcategories
        const allPages = [];
        const seenSlugs = new Set();

        V2_CATEGORIES.forEach(cat => {
            (cat.subcategories || []).forEach(sub => {
                const pageKey = `${cat.slug}/${sub.slug}`;
                seenSlugs.add(pageKey);
                allPages.push({
                    categorySlug: cat.slug,
                    categoryName: cat.name,
                    categoryIcon: cat.icon,
                    subcategorySlug: sub.slug,
                    subcategoryName: sub.name,
                    headline: sub.headline || `${sub.name} Repair & Service`,
                    pageUrl: `/v2/services/${cat.slug}/${sub.slug}`,
                    sectionId: `ecom-v2-sub-${cat.slug}-${sub.slug}`,
                    isCustomized: false,
                    mediaType: 'image',
                    mediaUrl: sub.icon || cat.banner,
                    updatedAt: null
                });
            });
        });

        // 2. Fetch saved subcategory configs from DB
        if (supabase) {
            const { data: dbRows, error } = await supabase
                .from('website_section_configs')
                .select('section_id, extra_config, updated_at')
                .like('section_id', 'ecom-v2-sub-%');

            if (!error && Array.isArray(dbRows)) {
                const configMap = new Map();
                dbRows.forEach(row => {
                    configMap.set(row.section_id, row);
                });

                // Update standard pages if customized
                allPages.forEach(p => {
                    const row = configMap.get(p.sectionId);
                    if (row) {
                        p.isCustomized = true;
                        p.updatedAt = row.updated_at;
                        if (row.extra_config?.hero?.mediaType) p.mediaType = row.extra_config.hero.mediaType;
                        if (row.extra_config?.hero?.mediaUrl) p.mediaUrl = row.extra_config.hero.mediaUrl;
                        if (row.extra_config?.hero?.title) p.headline = row.extra_config.hero.title;
                    }
                });

                // Add any custom subcategories created by admin that aren't in V2_CATEGORIES
                dbRows.forEach(row => {
                    const parts = row.section_id.replace('ecom-v2-sub-', '').split('-');
                    // Check if already in allPages
                    const exists = allPages.some(p => p.sectionId === row.section_id);
                    if (!exists && row.extra_config) {
                        const cfg = row.extra_config;
                        const catSlug = cfg.categorySlug || parts[0] || 'custom';
                        const subSlug = cfg.subcategorySlug || parts.slice(1).join('-') || 'custom-page';
                        allPages.push({
                            categorySlug: catSlug,
                            categoryName: cfg.categoryName || catSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                            categoryIcon: '/images/services/ac_3d.png',
                            subcategorySlug: subSlug,
                            subcategoryName: cfg.subcategoryName || subSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                            headline: cfg.hero?.title || `${subSlug} Service`,
                            pageUrl: `/v2/services/${catSlug}/${subSlug}`,
                            sectionId: row.section_id,
                            isCustomized: true,
                            mediaType: cfg.hero?.mediaType || 'image',
                            mediaUrl: cfg.hero?.mediaUrl || '/images/banners/banner_speed_90_mins.png',
                            updatedAt: row.updated_at,
                            isCustomCreated: true
                        });
                    }
                });
            }
        }

        return NextResponse.json({
            success: true,
            data: allPages,
            totalCount: allPages.length
        });
    } catch (err) {
        console.error('[API subcategory-pages] GET error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
