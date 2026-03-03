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

        // ── Validate mandatory fields ──────────────────────────────────────────
        if (!customer?.phone || !categoryId || !subcategoryId) {
            return NextResponse.json(
                { success: false, error: 'Missing required booking details' },
                { status: 400 }
            )
        }

        // ── Fix 3: Slot capacity check ─────────────────────────────────────────
        if (schedule?.date && schedule?.slot) {
            // Fetch slot config to get maxBookings
            const { data: slotsConfig } = await supabase
                .from('website_section_configs')
                .select('config')
                .eq('section_id', 'booking-slots')
                .single()

            const allSlots = slotsConfig?.config?.slots || []
            const matchedSlot = allSlots.find(s =>
                (s.label || `${s.startTime}–${s.endTime}`) === schedule.slot && s.active !== false
            )

            if (matchedSlot?.maxBookings) {
                const { count: existingCount } = await supabase
                    .from('jobs')
                    .select('id', { count: 'exact', head: true })
                    .eq('scheduled_date', schedule.date)
                    .eq('scheduled_time', schedule.slot)
                    .not('status', 'in', '("cancelled","rejected","booking_request")')

                if (existingCount >= matchedSlot.maxBookings) {
                    return NextResponse.json(
                        { success: false, error: 'This time slot is fully booked. Please choose a different date or time.' },
                        { status: 409 }
                    )
                }
            }
        }

        // ── Fix 2: Auto-upsert customer record ────────────────────────────────
        // Normalise phone: strip spaces/dashes, strip leading +91 / 0
        const rawPhone = (customer.phone || '').replace(/[\s\-]/g, '')
        const normalizedPhone = rawPhone.replace(/^(\+91|91|0)/, '')

        let customerId = null
        {
            // Look up existing customer by phone (try common normalised formats)
            const { data: existingCustomers } = await supabase
                .from('customers')
                .select('id')
                .or(`phone.eq.${normalizedPhone},phone.eq.+91${normalizedPhone},phone.eq.91${normalizedPhone}`)
                .limit(1)

            if (existingCustomers && existingCustomers.length > 0) {
                // Reuse existing customer
                customerId = existingCustomers[0].id
            } else {
                // Create a new lightweight customer record
                const { data: newCustomer, error: custError } = await supabase
                    .from('customers')
                    .insert({
                        phone: normalizedPhone,
                        full_name: customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || null,
                        email: customer.email || null,
                        source: 'website_booking',
                        customer_type: 'one_time',
                        created_at: new Date().toISOString()
                    })
                    .select('id')
                    .single()

                if (custError) {
                    // Non-fatal: log but continue — the booking still goes through
                    console.warn('Could not create customer record:', custError.message)
                } else {
                    customerId = newCustomer.id
                }
            }
        }

        // ── Generate booking reference number ──────────────────────────────────
        const timestamp = Date.now().toString().slice(-6)
        const bookingNumber = `BK-${timestamp}`

        // ── Create the booking_request job ─────────────────────────────────────
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .insert({
                job_number: bookingNumber,
                status: 'booking_request',
                priority: 'normal',
                customer_id: customerId,               // ← now linked (Fix 2)
                customer_name: customer.name || `${customer.firstName} ${customer.lastName}`.trim(),
                category: categoryName || categoryId,
                subcategory: subcategoryName || subcategoryId,
                issue: issueName || issueId,
                description: description || '',
                scheduled_date: schedule?.date || null,
                scheduled_time: schedule?.slot || null,
                source: 'website',
                // Store full raw booking data for admin reference
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

        // ── Log interactions ───────────────────────────────────────────────────
        await supabase.from('job_interactions').insert([{
            job_id: job.id,
            type: 'created',
            message: `Booking request submitted from website by ${customer.firstName} ${customer.lastName} (${customer.phone})${customerId ? ` — customer linked (ID: ${customerId})` : ''}`,
            user_name: 'System (Website)'
        }])

        logInteractionServer({
            type: 'booking-created-website',
            category: 'job',
            jobId: String(job.id),
            customerName: customer.name || `${customer.firstName} ${customer.lastName}`.trim(),
            description: `Website booking: ${categoryName || categoryId} — ${subcategoryName || subcategoryId} (${bookingNumber})`,
            metadata: { bookingNumber, categoryId, subcategoryId, pincode, customerId },
            source: 'Website',
        });

        return NextResponse.json({
            success: true,
            bookingId: job.id,
            bookingNumber,
            customerId,
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
