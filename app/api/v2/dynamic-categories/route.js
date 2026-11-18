import { NextResponse } from 'next/server';
import { fetchDynamicCatalogConfig } from '@/lib/v2/serverCatalog';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const categories = await fetchDynamicCatalogConfig();
        return NextResponse.json({
            success: true,
            categories
        });
    } catch (err) {
        console.error('[API dynamic-categories] GET error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
