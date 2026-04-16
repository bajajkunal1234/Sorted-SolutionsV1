import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET — single article by slug
// ?role=admin → include admin_content
export async function GET(request, { params }) {
    try {
        const { slug } = params
        const { searchParams } = new URL(request.url)
        const role = searchParams.get('role')

        const { data, error } = await supabase
            .from('support_articles')
            .select('*')
            .eq('slug', slug)
            .eq('is_published', true)
            .single()

        if (error || !data) {
            return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 })
        }

        if (role !== 'admin') {
            const { admin_content, ...safe } = data
            return NextResponse.json({ success: true, article: safe })
        }

        return NextResponse.json({ success: true, article: data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PUT — update article (admin only)
export async function PUT(request, { params }) {
    try {
        const { slug } = params
        const body = await request.json()

        const { data, error } = await supabase
            .from('support_articles')
            .update({
                ...body,
                updated_at: new Date().toISOString(),
            })
            .eq('slug', slug)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, article: data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
