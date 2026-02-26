import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = createServerSupabase();
    const { data, error } = await supabase.from('page_settings').select('page_id, other_locations_settings').neq('other_locations_settings::text', '{}');

    // also specifically get the newest udpates to see what they saved recently
    const { data: recent } = await supabase.from('page_settings').select('page_id, updated_at, other_locations_settings').order('updated_at', { ascending: false }).limit(5);

    return NextResponse.json({ neq_empty: data, recent });
}
