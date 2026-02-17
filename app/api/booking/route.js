import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request) {
    try {
        const body = await request.json()
        const {
            categoryId,
            subcategoryId,
            issueId,
            pincode,
            description,
            customer,
            schedule
        } = body

        // 1. Validate mandatory fields
        if (!customer?.phone || !categoryId || !subcategoryId) {
            return NextResponse.json(
                { success: false, error: 'Missing required booking details' },
                { status: 400 }
            )
        }

        // 2. Find or Create Customer
        let finalCustomerId
        const { data: existingCustomer, error: customerSearchError } = await supabase
            .from('customers')
            .select('id')
            .eq('mobile', customer.phone)
            .single()

        if (customerSearchError && customerSearchError.code !== 'PGRST116') {
            throw customerSearchError
        }

        if (existingCustomer) {
            finalCustomerId = existingCustomer.id
        } else {
            // Create new customer
            const { data: newCustomer, error: createCustomerError } = await supabase
                .from('customers')
                .insert({
                    name: `${customer.firstName} ${customer.lastName}`,
                    mobile: customer.phone,
                    email: customer.email,
                    created_at: new Date().toISOString()
                })
                .select('id')
                .single()

            if (createCustomerError) throw createCustomerError
            finalCustomerId = newCustomer.id
        }

        // 3. Create/Update Property
        const { data: property, error: propertyError } = await supabase
            .from('properties')
            .insert({
                customer_id: finalCustomerId,
                address: customer.address.street,
                apartment: customer.address.apartment,
                city: customer.address.city,
                state: customer.address.state,
                pincode: customer.address.zip,
                created_at: new Date().toISOString()
            })
            .select('id')
            .single()

        if (propertyError) throw propertyError

        // Create Job
        const timestamp = Date.now().toString().slice(-6)
        const jobNumber = `JS-${timestamp}`

        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .insert({
                job_number: jobNumber,
                customer_id: finalCustomerId,
                customer_name: `${customer.firstName} ${customer.lastName}`,
                property_id: property.id,
                category: categoryId, // We should ideally resolve these to names
                subcategory: subcategoryId,
                issue: issueId,
                status: 'pending',
                stage: 'new',
                priority: 'normal',
                scheduled_date: schedule.date || new Date().toISOString().split('T')[0],
                scheduled_time: schedule.slot,
                description: description,
                created_at: new Date().toISOString()
            })
            .select('id')
            .single()

        if (jobError) throw jobError

        // 5. Log Interaction
        await supabase
            .from('interactions')
            .insert({
                job_id: job.id,
                customer_id: finalCustomerId,
                type: 'job_created',
                description: 'Service request created via Web Booking Wizard',
                created_by: finalCustomerId // For guest, they "create" it themselves
            })

        return NextResponse.json({
            success: true,
            jobId: job.id,
            message: 'Booking completed successfully'
        })

    } catch (error) {
        console.error('Booking API Error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
