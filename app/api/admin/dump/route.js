import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = createServerSupabase();
    const { data, error } = await supabase.from('page_settings').select('page_id, other_locations_settings').eq('page_id', 'cat-ac-repair').single();
    return NextResponse.json({ data, error });
}
