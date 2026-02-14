import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const customerId = searchParams.get('customerId')

        if (!customerId) {
            return NextResponse.json(
                { error: 'Customer ID is required' },
                { status: 400 }
            )
        }

        const { data: appliances, error } = await supabase
            .from('customer_appliances')
            .select('*')
            .eq('customer_id', customerId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching appliances:', error)
            return NextResponse.json(
                { error: 'Failed to fetch appliances' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            appliances
        })

    } catch (error) {
        console.error('Error in appliances API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function POST(request) {
    try {
        const data = await request.json()
        const { customer_id, type, brand, model, serial_number, purchase_date, warranty_expiry } = data

        if (!customer_id || !type || !brand) {
            return NextResponse.json(
                { error: 'Customer ID, Type, and Brand are required' },
                { status: 400 }
            )
        }

        const { data: appliance, error } = await supabase
            .from('customer_appliances')
            .insert({
                customer_id,
                type,
                brand,
                model,
                serial_number,
                purchase_date,
                warranty_expiry,
                status: 'active'
            })
            .select()
            .single()

        if (error) {
            console.error('Error adding appliance:', error)
            return NextResponse.json(
                { error: 'Failed to add appliance' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            appliance,
            message: 'Appliance added successfully'
        })

    } catch (error) {
        console.error('Error in adding appliance:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const customerId = searchParams.get('customerId')

        if (!id || !customerId) {
            return NextResponse.json(
                { error: 'Appliance ID and Customer ID are required' },
                { status: 400 }
            )
        }

        // Soft delete
        const { error } = await supabase
            .from('customer_appliances')
            .update({ status: 'removed' })
            .eq('id', id)
            .eq('customer_id', customerId)

        if (error) {
            console.error('Error deleting appliance:', error)
            return NextResponse.json(
                { error: 'Failed to delete appliance' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Appliance removed successfully'
        })

    } catch (error) {
        console.error('Error in deleting appliance:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
