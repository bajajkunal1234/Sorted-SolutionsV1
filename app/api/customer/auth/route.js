import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request) {
    try {
        const { firebaseUid, phoneNumber } = await request.json()

        if (!firebaseUid || !phoneNumber) {
            return NextResponse.json(
                { error: 'Firebase UID and phone number are required' },
                { status: 400 }
            )
        }

        // Check if customer exists with this Firebase UID
        let { data: customer, error: fetchError } = await supabase
            .from('customers')
            .select('*')
            .eq('firebase_uid', firebaseUid)
            .single()

        // If customer doesn't exist, create new customer
        if (fetchError || !customer) {
            // Check if customer exists with this phone number
            const { data: existingCustomer } = await supabase
                .from('customers')
                .select('*')
                .eq('phone', phoneNumber)
                .single()

            if (existingCustomer) {
                // Update existing customer with Firebase UID
                const { data: updatedCustomer, error: updateError } = await supabase
                    .from('customers')
                    .update({
                        firebase_uid: firebaseUid,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingCustomer.id)
                    .select()
                    .single()

                if (updateError) {
                    console.error('Error updating customer:', updateError)
                    return NextResponse.json(
                        { error: 'Failed to update customer' },
                        { status: 500 }
                    )
                }

                customer = updatedCustomer
            } else {
                // Create new customer
                const { data: newCustomer, error: createError } = await supabase
                    .from('customers')
                    .insert({
                        firebase_uid: firebaseUid,
                        phone: phoneNumber,
                        name: `Customer ${phoneNumber.slice(-4)}`, // Default name
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .single()

                if (createError) {
                    console.error('Error creating customer:', createError)
                    return NextResponse.json(
                        { error: 'Failed to create customer' },
                        { status: 500 }
                    )
                }

                customer = newCustomer
            }
        }

        // Remove sensitive data
        const { password_hash, ...customerData } = customer

        return NextResponse.json({
            success: true,
            customer: customerData,
            message: 'Authentication successful'
        })

    } catch (error) {
        console.error('Error in customer auth API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
