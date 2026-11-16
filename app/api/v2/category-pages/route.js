import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { V2_CATEGORIES } from '@/lib/v2/catalogConfig';
import { fetchDynamicCatalogConfig } from '@/lib/v2/serverCatalog';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = createServerSupabase();
        let savedMap = new Map();

        if (supabase) {
            const { data } = await supabase
                .from('website_section_configs')
                .select('section_id, updated_at')
                .like('section_id', 'ecom-v2-cat-%');

            (data || []).forEach(row => {
                const slug = row.section_id.replace('ecom-v2-cat-', '');
                savedMap.set(slug, row.updated_at);
            });
        }

        const dynamicCats = await fetchDynamicCatalogConfig(supabase);

        const pages = dynamicCats.map(cat => {
            const isCustomized = savedMap.has(cat.slug);
            const updatedAt = savedMap.get(cat.slug) || null;

            return {
                id: `ecom-v2-cat-${cat.slug}`,
                sectionId: `ecom-v2-cat-${cat.slug}`,
                categorySlug: cat.slug,
                categoryName: cat.name,
                url: `/v2/services/${cat.slug}`,
                cleanUrl: `/${cat.slug}`,
                icon: cat.icon,
                accent: cat.accent,
                banner: cat.banner,
                subcategoriesCount: (cat.subcategories || []).length,
                isCustomized,
                updatedAt
            };
        });

        return NextResponse.json({
            success: true,
            count: pages.length,
            pages
        });
    } catch (err) {
        console.error('[API category-pages] GET list error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
