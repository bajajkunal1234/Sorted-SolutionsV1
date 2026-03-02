import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data: data || [] });
}

export async function POST(request) {
    const supabase = createServerSupabase();
    const body = await request.json();
    const { name, channel, type, content, variables, is_default } = body;

    if (!name || !channel || !type || !content) {
        return NextResponse.json({ success: false, error: 'name, channel, type and content are required' }, { status: 400 });
    }

    // If setting as default, unset others of same type+channel
    if (is_default) {
        await supabase.from('notification_templates')
            .update({ is_default: false })
            .eq('type', type)
            .eq('channel', channel);
    }

    const { data, error } = await supabase.from('notification_templates').insert({
        name, channel, type, content,
        variables: variables || [],
        is_default: is_default || false,
    }).select().single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
}

export async function PUT(request) {
    const supabase = createServerSupabase();
    const body = await request.json();
    const { id, is_default, type, channel, ...updates } = body;

    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    if (is_default) {
        await supabase.from('notification_templates')
            .update({ is_default: false })
            .eq('type', type)
            .eq('channel', channel);
    }

    const { data, error } = await supabase.from('notification_templates')
        .update({ ...updates, type, channel, is_default: is_default || false })
        .eq('id', id).select().single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
}

export async function DELETE(request) {
    const supabase = createServerSupabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const { error } = await supabase.from('notification_templates').delete().eq('id', id);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
