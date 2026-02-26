import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/settings/faqs/by-ids
 * Body: { ids: string[] }
 * Returns FAQ content for the given IDs.
 */
export async function POST(req) {
    const { ids } = await req.json();
    if (!ids?.length) return NextResponse.json({ success: true, faqs: [] });

    const supabase = createServerSupabase();
    if (!supabase) return NextResponse.json({ success: false, faqs: [] }, { status: 500 });

    const { data, error } = await supabase
        .from('website_faqs')
        .select('id, question, answer')
        .in('id', ids);

    if (error) return NextResponse.json({ success: false, faqs: [], error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, faqs: data || [] });
}

/**
 * GET /api/settings/faqs/by-ids?limit=5
 * Returns top global FAQs (for fallback).
 */
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '5', 10);

    const supabase = createServerSupabase();
    if (!supabase) return NextResponse.json({ success: false, faqs: [] }, { status: 500 });

    const { data, error } = await supabase
        .from('website_faqs')
        .select('id, question, answer')
        .order('display_order', { ascending: true })
        .limit(limit);

    if (error) return NextResponse.json({ success: false, faqs: [], error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, faqs: data || [] });
}
