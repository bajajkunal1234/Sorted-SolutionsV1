import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('customer_feed_posts')
            .select('*')
            .eq('is_active', true)
            .order('is_pinned', { ascending: false })
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: false })

        if (error) {
            // Table doesn't exist yet — return empty gracefully
            if (error.message.includes('does not exist')) {
                return NextResponse.json({ success: true, posts: [] })
            }
            throw error
        }

        return NextResponse.json({ success: true, posts: data || [] })
    } catch (err) {
        console.error('Feed GET error:', err)
        return NextResponse.json({ success: true, posts: [] })
    }
}

export async function POST(request) {
    try {
        const { postId } = await request.json()
        if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 })

        // Increment likes
        const { data: post } = await supabase
            .from('customer_feed_posts')
            .select('likes_count')
            .eq('id', postId)
            .single()

        const { data, error } = await supabase
            .from('customer_feed_posts')
            .update({ likes_count: (post?.likes_count || 0) + 1 })
            .eq('id', postId)
            .select('likes_count')
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, likes_count: data.likes_count })
    } catch (err) {
        console.error('Feed POST error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
