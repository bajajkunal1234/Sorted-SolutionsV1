import { getSupabaseServer } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
    const supabase = getSupabaseServer()
    if (!supabase) {
        return NextResponse.json({ success: false, error: 'Database connection not available' }, { status: 503 })
    }

    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type');
    const displayInHeader = searchParams.get('header');
    const displayInFooter = searchParams.get('footer');
    const displayInServiceAreas = searchParams.get('service_areas');

    try {
        let query = supabase.from('website_locations').select('*');

        if (type) {
            query = query.eq('type', type);
        }
        if (displayInHeader === 'true') {
            query = query.eq('display_in_header', true).order('header_order', { ascending: true });
        }
        if (displayInFooter === 'true') {
            query = query.eq('display_in_footer', true).order('footer_order', { ascending: true });
        }
        if (displayInServiceAreas === 'true') {
            query = query.eq('display_in_service_areas', true).order('service_area_order', { ascending: true });
        }

        if (displayInHeader !== 'true' && displayInFooter !== 'true' && displayInServiceAreas !== 'true') {
            query = query.order('created_at', { ascending: false });
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Error fetching locations:', error);
        return NextResponse.json({
            success: true,
            data: [],
            message: `Fallback due to error: ${error.message || error.details || 'Unknown error'}`
        });
    }
}

export async function POST(request) {
    const supabase = getSupabaseServer()
    if (!supabase) return NextResponse.json({ success: false, error: 'Database connection not available' }, { status: 503 })

    try {
        const body = await request.json();
        if (!body.name) return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });

        const { data, error } = await supabase
            .from('website_locations')
            .insert([body])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error creating location:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    const supabase = getSupabaseServer()
    if (!supabase) return NextResponse.json({ success: false, error: 'Database connection not available' }, { status: 503 })

    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

        const { data, error } = await supabase
            .from('website_locations')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error updating location:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    const supabase = getSupabaseServer()
    if (!supabase) return NextResponse.json({ success: false, error: 'Database connection not available' }, { status: 503 })

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

    try {
        const { error } = await supabase
            .from('website_locations')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true, message: 'Location deleted successfully' });
    } catch (error) {
        console.error('Error deleting location:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}