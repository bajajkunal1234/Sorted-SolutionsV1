import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
        .from('notification_triggers')
        .select('*, notification_templates(id, name, channel, type, content)')
        .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data: data || [] });
}

export async function POST(request) {
    const supabase = createServerSupabase();
    const body = await request.json();
    const { event_type, channel, template_id, audience, delay_minutes, is_active } = body;

    if (!event_type || !channel || !template_id) {
        return NextResponse.json({ success: false, error: 'event_type, channel and template_id are required' }, { status: 400 });
    }

    const { data, error } = await supabase.from('notification_triggers').insert({
        event_type, channel, template_id,
        audience: audience || [],
        delay_minutes: delay_minutes || 0,
        is_active: is_active !== false,
    }).select().single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
}

export async function PUT(request) {
    const supabase = createServerSupabase();
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const { data, error } = await supabase.from('notification_triggers')
        .update(updates).eq('id', id).select().single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
}

export async function DELETE(request) {
    const supabase = createServerSupabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const { error } = await supabase.from('notification_triggers').delete().eq('id', id);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
