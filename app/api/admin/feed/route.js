import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('customer_feed_posts')
            .select('*')
            .order('is_pinned', { ascending: false })
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: false })

        if (error) {
            if (error.message.includes('does not exist')) {
                return NextResponse.json({ success: true, posts: [] })
            }
            throw error
        }

        return NextResponse.json({ success: true, posts: data || [] })
    } catch (err) {
        return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }
}

export async function POST(request) {
    try {
        const body = await request.json()
        const { data, error } = await supabase
            .from('customer_feed_posts')
            .insert({
                title: body.title,
                body: body.body || null,
                image_url: body.image_url || null,
                post_type: body.post_type || 'tip',
                cta_text: body.cta_text || null,
                cta_url: body.cta_url || null,
                is_active: body.is_active ?? true,
                is_pinned: body.is_pinned ?? false,
                display_order: body.display_order || 0,
            })
            .select()
            .single()

        if (error) throw error
        return NextResponse.json({ success: true, post: data })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function PUT(request) {
    try {
        const body = await request.json()
        const { id, ...updates } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

        const { data, error } = await supabase
            .from('customer_feed_posts')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return NextResponse.json({ success: true, post: data })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

        const { error } = await supabase.from('customer_feed_posts').delete().eq('id', id)
        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
