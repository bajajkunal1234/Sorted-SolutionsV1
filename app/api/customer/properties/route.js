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

        const { data: properties, error } = await supabase
            .from('properties')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching properties:', error)
            return NextResponse.json(
                { error: 'Failed to fetch properties' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            properties,
            count: properties.length
        })

    } catch (error) {
        console.error('Error in properties API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function POST(request) {
    try {
        const propertyData = await request.json()

        // Validate required fields
        if (!propertyData.customer_id || !propertyData.address) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Insert property
        const { data: property, error } = await supabase
            .from('properties')
            .insert({
                customer_id: propertyData.customer_id,
                address: propertyData.address,
                locality: propertyData.locality,
                city: propertyData.city,
                pincode: propertyData.pincode,
                latitude: propertyData.latitude,
                longitude: propertyData.longitude,
                property_type: propertyData.property_type || 'residential',
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating property:', error)
            return NextResponse.json(
                { error: 'Failed to create property' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            property,
            message: 'Property added successfully'
        })

    } catch (error) {
        console.error('Error in property creation API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
