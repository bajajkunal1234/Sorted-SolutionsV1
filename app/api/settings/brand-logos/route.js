import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const supabase = createServerSupabase();
    try {
        const { data, error } = await supabase
            .from('website_brands')
            .select('*')
            .order('display_order', { ascending: true });

        if (error) {
            console.warn('Database error in brand-logos:', error.message);
            return NextResponse.json({ success: true, data: [] });
        }
        return NextResponse.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Error fetching brand logos:', error);
        return NextResponse.json({ success: true, data: [] });
    }
}

export async function POST(request) {
    const supabase = createServerSupabase();
    try {
        const body = await request.json();
        const { data, error } = await supabase
            .from('website_brands')
            .insert([{
                name: body.name,
                logo_url: body.logo_url,
                website_url: body.website_url || null,
                display_order: body.display_order || 0,
                is_active: true,
            }])
            .select()
            .single();

        if (error) {
            console.error('[ST-DEBUG] POST /api/settings/brand-logos Error:', error);
            return NextResponse.json({ success: false, error: 'Database error while adding brand', details: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('[ST-DEBUG] Brand Create Catch Error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Server error adding brand' }, { status: 500 });
    }
}

export async function PUT(request) {
    const supabase = createServerSupabase();
    try {
        const body = await request.json();
        const { id, ...updates } = body;
        const { data, error } = await supabase
            .from('website_brands')
            .update({
                name: updates.name,
                logo_url: updates.logo_url,
                website_url: updates.website_url || null,
                display_order: updates.display_order,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error updating brand:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    const supabase = createServerSupabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    try {
        const { error } = await supabase
            .from('website_brands')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting brand:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
