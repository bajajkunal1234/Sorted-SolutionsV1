import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Fetch all frequently booked services
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('frequently_booked_services')
            .select('*')
            .eq('active', true)
            .order('order_index', { ascending: true })

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('Error fetching frequently booked services:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

// PUT - Update services
export async function PUT(request) {
    try {
        const { services } = await request.json()

        const updates = services.map(service =>
            supabase
                .from('frequently_booked_services')
                .update({
                    title: service.title,
                    description: service.description,
                    price: service.price,
                    category: service.category,
                    order_index: service.order_index,
                    active: service.active
                })
                .eq('id', service.id)
        )

        await Promise.all(updates)

        return NextResponse.json({ success: true, message: 'Services updated successfully' })
    } catch (error) {
        console.error('Error updating frequently booked services:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

// POST - Add new service
export async function POST(request) {
    try {
        const service = await request.json()

        const { data, error } = await supabase
            .from('frequently_booked_services')
            .insert([service])
            .select()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('Error creating frequently booked service:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

// DELETE - Delete a service
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        const { error } = await supabase
            .from('frequently_booked_services')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Service deleted successfully' })
    } catch (error) {
        console.error('Error deleting frequently booked service:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
