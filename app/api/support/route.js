import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET — fetch all published articles (role-based)
// ?role=admin  → returns both content + admin_content
// ?category=jobs → filter by category
// default     → returns content only (technician-safe)
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const role = searchParams.get('role')
        const category = searchParams.get('category')
        const slug = searchParams.get('slug')

        let query = supabase
            .from('support_articles')
            .select('id, slug, title, icon, category, tags, content, admin_content, is_published, order_index, updated_at, audience')
            .eq('is_published', true)
            .order('order_index', { ascending: true })

        if (category) query = query.eq('category', category)
        if (slug) query = query.eq('slug', slug)
        
        const isAdmin = role === 'admin'
        if (!isAdmin) {
            query = query.neq('audience', 'admin')
        }

        const { data, error } = await query

        if (error) throw error

        // Strip admin_content for non-admin callers
        const articles = (data || []).map(article => {
            if (!isAdmin) {
                const { admin_content, ...safe } = article
                return safe
            }
            return article
        })

        return NextResponse.json({ success: true, articles })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// POST — create new article (admin only)
export async function POST(request) {
    try {
        const body = await request.json()
        const { slug, title, icon, category, tags, content, admin_content, is_published, order_index, audience } = body

        if (!slug || !title || !category || !content) {
            return NextResponse.json({ success: false, error: 'slug, title, category, and content are required' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('support_articles')
            .insert({
                slug,
                title,
                icon: icon || '📄',
                category,
                tags: tags || [],
                content,
                admin_content: admin_content || '',
                is_published: is_published !== false,
                order_index: order_index || 0,
                audience: audience || 'all',
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, article: data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
