import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Fetch all Why Choose Us features
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('why_choose_us_features')
            .select('*')
            .eq('active', true)
            .order('order_index', { ascending: true })

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('Error fetching Why Choose Us features:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

// PUT - Update features
export async function PUT(request) {
    try {
        const { features } = await request.json()

        const updates = features.map(feature =>
            supabase
                .from('why_choose_us_features')
                .update({
                    title: feature.title,
                    description: feature.description,
                    icon: feature.icon,
                    order_index: feature.order_index,
                    active: feature.active
                })
                .eq('id', feature.id)
        )

        await Promise.all(updates)

        return NextResponse.json({ success: true, message: 'Features updated successfully' })
    } catch (error) {
        console.error('Error updating Why Choose Us features:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

// POST - Add new feature
export async function POST(request) {
    try {
        const feature = await request.json()

        const { data, error } = await supabase
            .from('why_choose_us_features')
            .insert([feature])
            .select()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('Error creating Why Choose Us feature:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

// DELETE - Delete a feature
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        const { error } = await supabase
            .from('why_choose_us_features')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Feature deleted successfully' })
    } catch (error) {
        console.error('Error deleting Why Choose Us feature:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
