import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - List all triggers
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('interaction_triggers')
            .select('*')
            .order('category', { ascending: true })

        if (error) throw error
        return NextResponse.json({ success: true, data: data || [] })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// POST - Create a new custom trigger
export async function POST(request) {
    try {
        const body = await request.json()
        const { type, category, source, description, is_enabled, webhook_url, css_selector, page_pattern } = body

        const { data, error } = await supabase
            .from('interaction_triggers')
            .insert([{
                type,
                category: category || 'other',
                source: source || 'System',
                description: description || '',
                is_enabled: is_enabled !== false,
                webhook_url: webhook_url || null,
                css_selector: css_selector || null,
                page_pattern: page_pattern || null,
                fire_count: 0,
            }])
            .select()
            .single()

        if (error) throw error
        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PUT - Update a trigger (toggle, edit)
export async function PUT(request) {
    try {
        const body = await request.json()
        const { id, type, source, ...updates } = body

        let query = supabase.from('interaction_triggers')

        if (id) {
            // Update by ID (for custom triggers)
            const { data, error } = await query
                .upsert({ id, type, source, ...updates }, { onConflict: 'id' })
                .select()
                .single()
            if (error) throw error
            return NextResponse.json({ success: true, data })
        } else {
            // Upsert by type + source (for built-in triggers that may not have a DB row yet)
            const { data, error } = await supabase
                .from('interaction_triggers')
                .upsert({ type, source, ...updates }, { onConflict: 'type,source' })
                .select()
                .single()
            if (error) throw error
            return NextResponse.json({ success: true, data })
        }
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// DELETE - Delete a custom trigger
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        const { error } = await supabase
            .from('interaction_triggers')
            .delete()
            .eq('id', id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
