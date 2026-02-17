import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('website_faqs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Error fetching FAQs:', error);
        return NextResponse.json({ success: true, data: [], message: 'Using empty fallback for FAQs' });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { data, error } = await supabase
            .from('website_faqs')
            .insert([body])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error creating FAQ:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;
        const { data, error } = await supabase
            .from('website_faqs')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error updating FAQ:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    try {
        const { error } = await supabase
            .from('website_faqs')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting FAQ:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}