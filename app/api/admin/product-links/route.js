import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET - fetch all product links with product/service details
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('product_links')
            .select(`
                id,
                auto_add,
                notes,
                created_at,
                product:product_id ( id, name, sku, type ),
                service:service_id ( id, name, sku, sale_price, gst_rate, type )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// POST - create a new link
export async function POST(request) {
    try {
        const body = await request.json();
        const { product_id, service_id, auto_add = true, notes = '' } = body;

        if (!product_id || !service_id) {
            return NextResponse.json({ success: false, error: 'product_id and service_id are required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('product_links')
            .insert([{ product_id, service_id, auto_add, notes }])
            .select(`
                id, auto_add, notes, created_at,
                product:product_id ( id, name, sku, type ),
                service:service_id ( id, name, sku, sale_price, gst_rate, type )
            `)
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// DELETE - remove a link
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });

        const { error } = await supabase.from('product_links').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// PATCH - toggle auto_add
export async function PATCH(request) {
    try {
        const body = await request.json();
        const { id, auto_add } = body;
        if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });

        const { data, error } = await supabase
            .from('product_links')
            .update({ auto_add, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
