import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Fetch all How It Works stages
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('how_it_works_stages')
            .select('*')
            .eq('active', true)
            .order('order_index', { ascending: true })

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('Error fetching How It Works stages:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

// PUT - Update all stages
export async function PUT(request) {
    try {
        const { stages } = await request.json()

        // Update each stage
        const updates = stages.map(stage =>
            supabase
                .from('how_it_works_stages')
                .update({
                    title: stage.title,
                    description: stage.description,
                    icon: stage.icon,
                    order_index: stage.order_index,
                    active: stage.active
                })
                .eq('id', stage.id)
        )

        await Promise.all(updates)

        return NextResponse.json({ success: true, message: 'Stages updated successfully' })
    } catch (error) {
        console.error('Error updating How It Works stages:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

// POST - Create new stage
export async function POST(request) {
    try {
        const stage = await request.json()

        const { data, error } = await supabase
            .from('how_it_works_stages')
            .insert([stage])
            .select()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('Error creating How It Works stage:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

// DELETE - Delete a stage
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        const { error } = await supabase
            .from('how_it_works_stages')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Stage deleted successfully' })
    } catch (error) {
        console.error('Error deleting How It Works stage:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
