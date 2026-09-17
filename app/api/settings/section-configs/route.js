import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('id');

    try {
        let query = supabase.from('website_section_configs').select('*');
        if (sectionId) {
            query = query.eq('section_id', sectionId).single();
        }

        const { data, error } = await query;
        // If error is PGRST116 (no rows found for .single()), we treat it as no data,
        // and the data will be null. We want to return an empty object in this case.
        // For other errors, we throw to catch block.
        if (error && error.code !== 'PGRST116') throw error;
        const result = data ? { ...data, config: data.config || data.extra_config } : {};
        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error('Error fetching section configs:', error);
        return NextResponse.json({ success: true, data: {}, message: 'Using empty fallback for section configs' });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const section_id = body.section_id || body.id;
        const extra_config = body.extra_config || body.config || {};

        const { data, error } = await supabase
            .from('website_section_configs')
            .upsert({
                section_id,
                extra_config,
                updated_at: new Date().toISOString()
            }, { onConflict: 'section_id' })
            .select()
            .single();

        if (error) throw error;
        const result = data ? { ...data, config: data.config || data.extra_config } : data;
        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error('Error saving section config:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}