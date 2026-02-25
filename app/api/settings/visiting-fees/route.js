import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

const SECTION_ID = 'visiting-fees';

export async function GET() {
    try {
        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from('website_section_configs')
            .select('*')
            .eq('section_id', SECTION_ID)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        const fees = data?.config?.fees || [];
        return NextResponse.json({ success: true, data: fees });
    } catch (err) {
        console.error('visiting-fees GET error:', err);
        return NextResponse.json({ success: true, data: [] });
    }
}

export async function PUT(request) {
    try {
        const { fees } = await request.json();
        const supabase = createServerSupabase();
        const { error } = await supabase
            .from('website_section_configs')
            .upsert({
                section_id: SECTION_ID,
                config: { fees },
                updated_at: new Date().toISOString()
            });
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('visiting-fees PUT error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
