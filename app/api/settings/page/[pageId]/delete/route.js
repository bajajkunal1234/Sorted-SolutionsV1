import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function DELETE(request, { params }) {
    const { pageId } = params;

    if (!pageId) {
        return NextResponse.json({ success: false, error: 'pageId is required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    if (!supabase) {
        return NextResponse.json({ success: false, error: 'Database connection missing' }, { status: 500 });
    }

    try {
        // 1. First verify the page actually exists
        const { data: existing, error: checkError } = await supabase
            .from('page_settings')
            .select('page_id')
            .eq('page_id', pageId)
            .maybeSingle();

        if (checkError) {
            console.error(`[DELETE] Check error for ${pageId}:`, checkError.message);
            return NextResponse.json({ success: false, error: checkError.message }, { status: 500 });
        }

        if (!existing) {
            // Already doesn't exist — treat as success
            return NextResponse.json({ success: true, message: `Page ${pageId} not found (already deleted)` });
        }

        // 2. Delete related data first (ignore errors — tables may be empty)
        await Promise.allSettled([
            supabase.from('page_problems').delete().eq('page_id', pageId),
            supabase.from('page_localities').delete().eq('page_id', pageId),
            supabase.from('page_services').delete().eq('page_id', pageId),
            supabase.from('page_brands_mapping').delete().eq('page_id', pageId),
            supabase.from('page_faqs_mapping').delete().eq('page_id', pageId),
        ]);

        // 3. Delete the page itself — use .select() to confirm rows were actually deleted
        const { data: deleted, error: deleteError } = await supabase
            .from('page_settings')
            .delete()
            .eq('page_id', pageId)
            .select('page_id');

        if (deleteError) {
            console.error(`[DELETE] Delete error for ${pageId}:`, deleteError.message);
            return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
        }

        // 4. Verify deletion actually happened (catches silent RLS blocks)
        if (!deleted || deleted.length === 0) {
            console.error(`[DELETE] Silent failure for ${pageId} — 0 rows deleted. Possible RLS policy blocking delete.`);
            return NextResponse.json({
                success: false,
                error: `Delete was blocked by the database (0 rows affected). This is likely an RLS policy issue on page_settings. Please delete the page directly in Supabase Table Editor.`,
            }, { status: 403 });
        }

        console.log(`[DELETE] Successfully deleted page: ${pageId}`);
        return NextResponse.json({ success: true, message: `Deleted page: ${pageId}` });

    } catch (error) {
        console.error(`[DELETE] Unexpected error for ${pageId}:`, error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
