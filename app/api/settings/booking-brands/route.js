import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET — fetch all booking brands ordered by display_order
export async function GET() {
    try {
        const supabase = getSupabaseServer();
        if (!supabase) return NextResponse.json({ success: true, data: [] });

        const { data, error } = await supabase
            .from('booking_brands')
            .select('*')
            .order('display_order', { ascending: true });

        if (error) throw error;
        return NextResponse.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Error fetching booking brands:', error);
        return NextResponse.json({ success: true, data: [], message: error.message });
    }
}

// POST — add a new brand { name }
export async function POST(request) {
    try {
        const supabase = getSupabaseServer();
        if (!supabase) return NextResponse.json({ success: false, error: 'DB unavailable' }, { status: 503 });

        const body = await request.json();
        const { name } = body;
        if (!name?.trim()) {
            return NextResponse.json({ success: false, error: 'Brand name is required' }, { status: 400 });
        }

        // Get the current max display_order
        const { data: existing } = await supabase
            .from('booking_brands')
            .select('display_order')
            .order('display_order', { ascending: false })
            .limit(1);

        const nextOrder = existing?.length ? (existing[0].display_order + 1) : 1;

        const { data, error } = await supabase
            .from('booking_brands')
            .insert({ name: name.trim(), display_order: nextOrder, is_active: true })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error creating booking brand:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// PATCH — toggle is_active { id, is_active }
export async function PATCH(request) {
    try {
        const supabase = getSupabaseServer();
        if (!supabase) return NextResponse.json({ success: false, error: 'DB unavailable' }, { status: 503 });

        const { id, is_active } = await request.json();
        if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

        const { data, error } = await supabase
            .from('booking_brands')
            .update({ is_active })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error updating booking brand:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// DELETE — remove a brand by id
export async function DELETE(request) {
    try {
        const supabase = getSupabaseServer();
        if (!supabase) return NextResponse.json({ success: false, error: 'DB unavailable' }, { status: 503 });

        const { id } = await request.json();
        if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

        const { error } = await supabase
            .from('booking_brands')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true, message: 'Brand deleted' });
    } catch (error) {
        console.error('Error deleting booking brand:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
