import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Fetch all brand logos
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('brand_logos')
            .select('*')
            .eq('active', true)
            .order('order_index', { ascending: true })

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('Error fetching brand logos:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

// PUT - Update logos
export async function PUT(request) {
    try {
        const { logos } = await request.json()

        const updates = logos.map(logo =>
            supabase
                .from('brand_logos')
                .update({
                    name: logo.name,
                    logo_url: logo.logo_url,
                    size: logo.size,
                    order_index: logo.order_index,
                    active: logo.active
                })
                .eq('id', logo.id)
        )

        await Promise.all(updates)

        return NextResponse.json({ success: true, message: 'Logos updated successfully' })
    } catch (error) {
        console.error('Error updating brand logos:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

// POST - Add new logo
export async function POST(request) {
    try {
        const logo = await request.json()

        const { data, error } = await supabase
            .from('brand_logos')
            .insert([logo])
            .select()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('Error creating brand logo:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

// DELETE - Delete a logo
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        const { error } = await supabase
            .from('brand_logos')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Logo deleted successfully' })
    } catch (error) {
        console.error('Error deleting brand logo:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
