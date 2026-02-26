import { getSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/settings/active-pages
 * Returns all rows from page_settings, representing pages that have been 
 * customized in the Page Builder.
 */
export async function GET() {
    const supabase = getSupabaseServer();
    if (!supabase) {
        return NextResponse.json({ success: false, error: 'Database connection missing' }, { status: 500 });
    }

    try {
        const { data, error, count } = await supabase
            .from('page_settings')
            .select('page_id, page_type, updated_at, hero_settings', { count: 'exact' })
            .order('updated_at', { ascending: false })
            .limit(1000);

        if (error) {
            console.error('[API-active-pages] Select error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: data || [],
            totalCount: count
        });
    } catch (error) {
        console.error('[API-active-pages] Critical error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
