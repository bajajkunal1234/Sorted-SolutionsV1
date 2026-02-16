import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Fetch settings for a specific page
export async function GET(request, { params }) {
    try {
        const { pageId } = params

        const { data, error } = await supabase
            .from('page_settings')
            .select('*')
            .eq('page_id', pageId)
            .single()

        // If not found, return empty settings template instead of 404
        if (error && error.code === 'PGRST116') {
            return NextResponse.json({
                success: true,
                data: {
                    page_id: pageId,
                    problems_settings: { title: "Problems We Solve", subtitle: "Expert solutions for all your appliance troubles", items: [] },
                    brands_settings: { items: [] },
                    localities_settings: { title: "We're in your neighbourhood", subtitle: "Quick doorstep service across Mumbai", items: [] },
                    services_settings: { title: "Popular in your area", subtitle: "Quality repairs at honest prices", items: [] },
                    faqs_settings: { items: [] }
                }
            })
        }

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('Error fetching page settings:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

// PUT - Update settings for a specific page
export async function PUT(request, { params }) {
    try {
        const { pageId } = params
        const body = await request.json()

        // Remove system fields if present
        const { id, created_at, updated_at, ...updateData } = body

        const { data, error } = await supabase
            .from('page_settings')
            .upsert({
                ...updateData,
                page_id: pageId,
                updated_at: new Date().toISOString()
            }, { onConflict: 'page_id' })
            .select()

        if (error) throw error

        return NextResponse.json({ success: true, data: data[0] })
    } catch (error) {
        console.error('Error updating page settings:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
