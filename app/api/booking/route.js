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

        // ── Fix 2: Auto-upsert customer account ───────────────────────────────
        // Normalise phone: strip spaces/dashes, strip leading +91 / 0
        const rawPhone = (customer.phone || '').replace(/[\s\-]/g, '')
        const normalizedPhone = rawPhone.replace(/^(\+91|91|0)/, '')

        let customerId = null
        {
            // Look up existing account by phone
            const { data: existingAccounts } = await supabase
                .from('accounts')
                .select('id')
                .or(`phone.eq.${normalizedPhone},phone.eq.+91${normalizedPhone},phone.eq.91${normalizedPhone}`)
                .limit(1)

            if (existingAccounts && existingAccounts.length > 0) {
                // Reuse existing account
                customerId = existingAccounts[0].id
            } else {
                // Create a lightweight account under Customers group
                const { data: newAccount, error: accError } = await supabase
                    .from('accounts')
                    .insert({
                        name: customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || normalizedPhone,
                        phone: normalizedPhone,
                        email: customer.email || null,
                        type: 'asset',
                        under: 'customer-accounts',
                        opening_balance: 0,
                        created_at: new Date().toISOString()
                    })
                    .select('id')
                    .single()

                if (accError) {
                    // Non-fatal: log but continue — booking still goes through
                    console.warn('Could not create account record:', accError.message)
                } else {
                    customerId = newAccount.id
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
