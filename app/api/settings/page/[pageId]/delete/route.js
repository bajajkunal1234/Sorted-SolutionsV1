import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function DELETE(request, { params }) {
    const { pageId } = params;
    const supabase = createServerSupabase();
    if (!supabase) {
        return NextResponse.json({ success: false, error: 'Database connection missing' }, { status: 500 });
    }

    try {
        // Delete related data first
        await Promise.all([
            supabase.from('page_problems').delete().eq('page_id', pageId),
            supabase.from('page_localities').delete().eq('page_id', pageId),
            supabase.from('page_services').delete().eq('page_id', pageId),
            supabase.from('page_brands_mapping').delete().eq('page_id', pageId),
            supabase.from('page_faqs_mapping').delete().eq('page_id', pageId),
        ]);

        // Delete the page itself
        const { error } = await supabase
            .from('page_settings')
            .delete()
            .eq('page_id', pageId);

        if (error) throw error;

        return NextResponse.json({ success: true, message: `Deleted page: ${pageId}` });
    } catch (error) {
        console.error(`[API-DELETE] Error deleting ${pageId}:`, error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
