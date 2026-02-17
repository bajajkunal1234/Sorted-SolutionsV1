import { NextResponse } from 'next/server';
import { createServerSupabase as createClient } from '@/lib/supabase-server';

export async function GET() {
    try {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('website_brands')
            .select('*')
            .order('display_order');

        if (error) throw error;
        return NextResponse.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Error fetching website brands:', error);
        return NextResponse.json({ success: true, data: [], message: 'Using empty fallback for brands' });
    }
}

export async function POST(request) {
    const supabase = createClient();
    const brands = await request.json();

    // Reset and bulk insert for ordering
    const { error: delError } = await supabase
        .from('website_brands')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (delError) return NextResponse.json({ success: false, error: delError.message }, { status: 500 });

    const toInsert = brands.map((b, index) => ({
        name: b.name,
        logo_url: b.logoUrl,
        website_url: b.websiteUrl,
        display_order: index + 1,
        is_active: true
    }));

    const { data, error } = await supabase
        .from('website_brands')
        .insert(toInsert)
        .select();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
}
