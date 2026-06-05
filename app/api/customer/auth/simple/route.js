import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request) {
    try {
        const { phoneNumber } = await request.json()

        if (!phoneNumber) {
            return NextResponse.json(
                { error: 'Phone number is required' },
                { status: 400 }
            )
        }

        const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);

        // Check if customer exists with this phone number
        let { data: customer, error: fetchError } = await supabase
            .from('customers')
            .select('*')
            .eq('phone', cleanPhone)
            .single()

        // If customer doesn't exist, create new customer
        if (fetchError || !customer) {
            console.log('Creating new customer for:', cleanPhone)

            const { data: newCustomer, error: createError } = await supabase
                .from('customers')
                .insert({
                    phone: cleanPhone,
                    name: `Customer ${cleanPhone.slice(-4)}` // Default name
                })
                .select()
                .single()

            if (createError) {
                console.error('Error creating customer:', createError)
                return NextResponse.json(
                    { error: 'Failed to create customer: ' + createError.message },
                    { status: 500 }
                )
            }

            customer = newCustomer
        }

        // Remove sensitive data if it exists
        if (customer.password_hash) {
            delete customer.password_hash
        }

        return NextResponse.json({
            success: true,
            customer: customer,
            message: 'Login successful'
        })

    } catch (error) {
        console.error('Error in customer simple auth API:', error)
        return NextResponse.json(
            { error: 'Internal server error: ' + error.message },
            { status: 500 }
        )
    }
}
