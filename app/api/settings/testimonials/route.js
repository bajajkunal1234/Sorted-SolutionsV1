import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const isPublic = searchParams.get('public') === 'true';

        let query = supabase
            .from('website_testimonials')
            .select('*')
            .order('date', { ascending: false });

        if (isPublic) {
            // Website only sees reviews the admin toggled on
            query = query.eq('show_on_website', true);
        }

        const { data, error } = await query;
        if (error) throw error;
        return NextResponse.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Error fetching testimonials:', error);
        return NextResponse.json({ success: true, data: [] });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { data, error } = await supabase
            .from('website_testimonials')
            .insert([body])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error creating testimonial:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;
        const { data, error } = await supabase
            .from('website_testimonials')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error updating testimonial:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    try {
        const { error } = await supabase
            .from('website_testimonials')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting testimonial:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}