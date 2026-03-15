import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Public endpoint — returns all enabled triggers that have a css_selector.
 * Used by the website's global ClickTracker to automatically attach listeners.
 * No auth required because this only exposes trigger metadata, not user data.
 */
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('interaction_triggers')
            .select('type, category, source, description, css_selector, page_pattern')
            .eq('is_enabled', true)
            .not('css_selector', 'is', null)
            .neq('css_selector', '')

        if (error) throw error

        return NextResponse.json({ success: true, data: data || [] }, {
            headers: {
                // Cache for 60s so every page load doesn't hit DB
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            }
        })
    } catch (error) {
        return NextResponse.json({ success: false, data: [] }, { status: 500 })
    }
}
