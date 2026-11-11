import { NextResponse } from 'next/server';
import { fetchPublishedWebServices } from '@/lib/v2/serverCatalog';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v2/services
 * Public /v2 storefront catalog API strictly filtered to subtype='web' & status='active'.
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const categorySlug = searchParams.get('category');
        const query = searchParams.get('q');

        const result = await fetchPublishedWebServices({ categorySlug, query });

        return NextResponse.json({
            success: true,
            categories: result.categories,
            services: result.services,
            totalPublished: result.totalPublished,
        });
    } catch (err) {
        console.error('[/api/v2/services] GET error:', err);
        return NextResponse.json(
            { success: false, error: err.message || 'Failed to load services' },
            { status: 500 }
        );
    }
}
