import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { getSubcategoryDefaultConfig } from '@/lib/v2/subcategoryPageDefaults';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const supabase = createServerSupabase();
        if (!supabase) {
            return NextResponse.json({ success: false, error: 'Database connection failed' }, { status: 500 });
        }

        const body = await request.json();
        const categorySlug = String(body.categorySlug || '').trim().toLowerCase();
        const categoryName = String(body.categoryName || '').trim() || categorySlug;
        const subcategoryName = String(body.subcategoryName || '').trim();
        let subcategorySlug = String(body.subcategorySlug || '').trim().toLowerCase();

        if (!subcategoryName) {
            return NextResponse.json({ success: false, error: 'Subcategory name is required' }, { status: 400 });
        }

        if (!categorySlug) {
            return NextResponse.json({ success: false, error: 'Category is required' }, { status: 400 });
        }

        if (!subcategorySlug) {
            subcategorySlug = subcategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }

        const sectionId = `ecom-v2-sub-${categorySlug}-${subcategorySlug}`;

        // Get default template
        const defaultConfig = getSubcategoryDefaultConfig(categorySlug, subcategorySlug, categoryName, subcategoryName);
        if (body.heroTitle) defaultConfig.hero.title = body.heroTitle;
        if (body.mediaUrl) defaultConfig.hero.mediaUrl = body.mediaUrl;
        if (body.mediaType) defaultConfig.hero.mediaType = body.mediaType;

        const payload = {
            ...defaultConfig,
            categorySlug,
            categoryName,
            subcategorySlug,
            subcategoryName,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('website_section_configs')
            .upsert({
                section_id: sectionId,
                extra_config: payload,
                updated_at: new Date().toISOString()
            }, { onConflict: 'section_id' })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: `Subcategory page "${subcategoryName}" created successfully!`,
            sectionId,
            pageUrl: `/v2/services/${categorySlug}/${subcategorySlug}`,
            categorySlug,
            subcategorySlug,
            data: payload
        });
    } catch (err) {
        console.error('[API subcategory-pages/create] error:', err);
        return NextResponse.json({ success: false, error: err.message || 'Failed to create subcategory page' }, { status: 500 });
    }
}
