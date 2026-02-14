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

        const { data: customer, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .single()

        if (error) {
            console.error('Error fetching customer profile:', error)
            return NextResponse.json(
                { error: 'Customer not found' },
                { status: 404 }
            )
        }

        // Remove sensitive data if any
        const { password_hash, ...profileData } = customer

        return NextResponse.json({
            success: true,
            customer: profileData
        })

    } catch (error) {
        console.error('Error in profile API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function PATCH(request) {
    try {
        const { customerId, ...updates } = await request.json()

        if (!customerId) {
            return NextResponse.json(
                { error: 'Customer ID is required' },
                { status: 400 }
            )
        }

        // Don't allow updating sensitive fields
        delete updates.password_hash
        delete updates.id

        const { data: customer, error } = await supabase
            .from('customers')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', customerId)
            .select()
            .single()

        if (error) {
            console.error('Error updating profile:', error)
            return NextResponse.json(
                { error: 'Failed to update profile' },
                { status: 500 }
            )
        }

        // Remove sensitive data
        const { password_hash, ...profileData } = customer

        return NextResponse.json({
            success: true,
            customer: profileData,
            message: 'Profile updated successfully'
        })

    } catch (error) {
        console.error('Error in profile update API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
