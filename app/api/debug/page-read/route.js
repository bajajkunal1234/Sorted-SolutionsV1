import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug/page-read?pageId=sub-hob-repair-2br-hob
 * Tests whether a server-side Supabase read works for a given page_id,
 * using the same logic as the live page components.
 */
export async function GET(request) {
    noStore();
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('pageId') || 'sub-hob-repair-2br-hob';

    const supabase = createServerSupabase();
    if (!supabase) {
        return NextResponse.json({ error: 'Supabase client not initialized — check env vars' }, { status: 500 });
    }

    // Test 1: maybeSingle
    const { data: pageMaybe, error: maybeError } = await supabase
        .from('page_settings')
        .select('page_id, hero_settings, section_visibility, updated_at')
        .eq('page_id', pageId)
        .maybeSingle();

    // Test 2: count
    const { count, error: countError } = await supabase
        .from('page_settings')
        .select('*', { count: 'exact', head: true })
        .eq('page_id', pageId);

    // Test 3: FAQ mappings
    const { data: faqMappings, error: faqError } = await supabase
        .from('page_faqs_mapping')
        .select('faq_id')
        .eq('page_id', pageId);

    return NextResponse.json({
        pageId,
        maybeResult: {
            found: !!pageMaybe,
            data: pageMaybe,
            error: maybeError?.message || null
        },
        countResult: {
            count,
            error: countError?.message || null
        },
        faqMappings: {
            count: faqMappings?.length || 0,
            ids: faqMappings?.map(f => f.faq_id) || [],
            error: faqError?.message || null
        }
    });
}
