import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('website_brands')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.warn('Database error in brand-logos, might be missing table:', error.message);
            return NextResponse.json({ success: true, data: [] });
        }
        return NextResponse.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Error fetching brand logos:', error);
        return NextResponse.json({ success: true, data: [] });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { data, error } = await supabase
            .from('website_brands')
            .insert([body])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error creating brand:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;
        const { data, error } = await supabase
            .from('website_brands')
            .update(updates)
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
