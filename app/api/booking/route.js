import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { logInteractionServer } from '@/lib/log-interaction-server'

export async function POST(request) {
    try {
        const body = await request.json()
        const {
            categoryId,
            categoryName,
            subcategoryId,
            subcategoryName,
            issueId,
            issueName,
            brand,
            brandName,
            pincode,
            description,
            customer,
            schedule
        } = body

        // Validate mandatory fields
        if (!customer?.phone || !categoryId || !subcategoryId) {
            return NextResponse.json(
                { success: false, error: 'Missing required booking details' },
                { status: 400 }
            )
        }

        // Generate booking reference number
        const timestamp = Date.now().toString().slice(-6)
        const bookingNumber = `BK-${timestamp}`

        // Create a booking_request job row with all raw customer data stored as JSONB
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .insert({
                job_number: bookingNumber,
                status: 'booking_request',
                priority: 'normal',
                customer_name: customer.name || `${customer.firstName} ${customer.lastName}`.trim(),
                category: categoryName || categoryId,
                subcategory: subcategoryName || subcategoryId,
                issue: issueName || issueId,
                description: description || '',
                scheduled_date: schedule?.date || null,
                scheduled_time: schedule?.slot || null,
                // Store the raw booking data for admin reference
                notes: JSON.stringify({
                    categoryId,
                    categoryName,
                    subcategoryId,
                    subcategoryName,
                    issueId,
                    issueName,
                    brand: brand || '',
                    brandName: brandName || brand || '',
                    pincode,
                    description,
                    schedule,
                    customer: {
                        firstName: customer.firstName,
                        lastName: customer.lastName,
                        name: `${customer.firstName} ${customer.lastName}`.trim(),
                        phone: customer.phone,
                        email: customer.email || '',
                        address: customer.address || {}
                    }
                }),
                created_at: new Date().toISOString()
            })
            .select('id')
            .single()

        if (jobError) throw jobError

        // Log an interaction on the booking
        await supabase.from('job_interactions').insert([{
            job_id: job.id,
            type: 'created',
            message: `Booking request submitted from website by ${customer.firstName} ${customer.lastName} (${customer.phone})`,
            user_name: 'System (Website)'
        }])

        // Log to global interactions table
        logInteractionServer({
            type: 'booking-created-website',
            category: 'job',
            jobId: String(job.id),
            customerName: customer.name || `${customer.firstName} ${customer.lastName}`.trim(),
            description: `Website booking: ${categoryName || categoryId} — ${subcategoryName || subcategoryId} (${bookingNumber})`,
            metadata: { bookingNumber, categoryId, subcategoryId, pincode },
            source: 'Website',
        });

        return NextResponse.json({
            success: true,
            bookingId: job.id,
            bookingNumber,
            message: "Booking request received! We'll call you to confirm."
        })

    } catch (error) {
        console.error('Booking API Error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}

// GET: fetch all booking requests (for admin use)
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('jobs')
            .select('*')
            .eq('status', 'booking_request')
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json({ success: true, data: data || [] })
    } catch (error) {
        console.error('Booking GET Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
