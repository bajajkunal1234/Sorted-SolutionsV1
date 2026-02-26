import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = createServerSupabase();
    try {
        const { data, error } = await supabase
            .from('website_faqs')
            .select('*')
            .order('display_order', { ascending: true });

        if (error) throw error;
        return NextResponse.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Error fetching FAQs:', error);
        return NextResponse.json({ success: true, data: [], message: 'Using empty fallback for FAQs' });
    }
}

export async function POST(request) {
    const supabase = createServerSupabase();
    try {
        const body = await request.json();
        const { data, error } = await supabase
            .from('website_faqs')
            .insert([{
                question: body.question,
                answer: body.answer,
                display_order: body.display_order || 0,
                is_active: true,
            }])
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
    const supabase = createServerSupabase();
    try {
        const body = await request.json();
        const { id, ...updates } = body;
        const { data, error } = await supabase
            .from('website_faqs')
            .update({
                question: updates.question,
                answer: updates.answer,
                display_order: updates.display_order,
                updated_at: new Date().toISOString(),
            })
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
    const supabase = createServerSupabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    try {
        const { error } = await supabase
            .from('website_faqs')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[API-DELETE] FAQ deletion failed:', error);
            if (error.code === '23503') {
                return NextResponse.json({
                    success: false,
                    error: 'Cannot delete: This FAQ is still in use on some pages. Please remove it from all pages first or ensure cascading is enabled.',
                    details: error.message
                }, { status: 409 });
            }
            throw error;
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting FAQ:', error);
        return NextResponse.json({ success: false, error: error.message || 'Unknown error occurred during FAQ deletion' }, { status: 500 });
    }
}