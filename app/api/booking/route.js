import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { logInteractionServer } from '@/lib/log-interaction-server'
import { fireNotification } from '@/lib/fire-notification'
import { generateJobNumber } from '@/lib/generateJobNumber'
import { generateAccountSKU } from '@/lib/generateAccountSKU'

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
                // Create a lightweight account under Customers group (with SKU)
                const newSKU = await generateAccountSKU('customer', 'sundry-debtors');
                const { data: newAccount, error: accError } = await supabase
                    .from('accounts')
                    .insert({
                        name: customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || normalizedPhone,
                        mobile: normalizedPhone,
                        email: customer.email || null,
                        type: 'customer',
                        under: 'sundry-debtors',
                        sku: newSKU,
                        source: 'Website Booking',
                        opening_balance: 0,
                        balance_type: 'debit',
                        status: 'active',
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

        // -- Ensure a customers row exists so the visitor can access the Customer App later --
        // This also sets the ledger_id link so customer/jobs API can find their bookings.
        if (customerId) {
            const customerFullName = customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || normalizedPhone;
            const { data: existingCx } = await supabase
                .from('customers')
                .select('id, ledger_id')
                .or(`phone.eq.${normalizedPhone},phone.eq.+91${normalizedPhone}`)
                .maybeSingle();

            if (!existingCx) {
                // Create a minimal customers row (no password — they haven't signed up yet)
                await supabase.from('customers').insert({
                    name: customerFullName,
                    full_name: customerFullName,
                    phone: normalizedPhone,
                    email: customer.email || null,
                    ledger_id: customerId,
                    customer_type: 'one_time',
                    profile_complete: false,
                }).catch(err => console.warn('[booking] Could not create customers row:', err.message));
            } else if (!existingCx.ledger_id) {
                // Existing customers row missing ledger_id — link it now
                await supabase.from('customers')
                    .update({ ledger_id: customerId })
                    .eq('id', existingCx.id)
                    .catch(err => console.warn('[booking] Could not update ledger_id:', err.message));
            }
        }

        // ── Fix 4: Property Creation & Linking ─────────────────────────────────
        let propertyId = null
        if (pincode && customer.address?.street) {
            const { data: existingProperties } = await supabase
                .from('properties')
                .select('id, address, flat_number, building_name')
                .eq('pincode', pincode)
            
            // Smart matching: Check if flat, building, and street match
            const streetLower = customer.address.street.toLowerCase().trim()
            const flatLower = (customer.address.flat_number || '').toLowerCase().trim()
            const buildingLower = (customer.address.building_name || '').toLowerCase().trim()

            const match = existingProperties?.find(p => {
                const pStreet = (p.address || '').toLowerCase().trim()
                const pFlat = (p.flat_number || '').toLowerCase().trim()
                const pBuilding = (p.building_name || '').toLowerCase().trim()
                return pStreet === streetLower && pFlat === flatLower && pBuilding === buildingLower
            })

            if (match) {
                propertyId = match.id
            } else {
                // Create new property
                const { data: newProp, error: propErr } = await supabase
                    .from('properties')
                    .insert({
                        flat_number: customer.address.flat_number || null,
                        building_name: customer.address.building_name || null,
                        address: customer.address.street,
                        locality: customer.address.locality || '',
                        city: customer.address.city || 'Mumbai',
                        pincode: pincode,
                        property_type: 'apartment', // Default
                        latitude: customer.address.latitude || null,
                        longitude: customer.address.longitude || null,
                    })
                    .select('id')
                    .single()
                
                if (!propErr && newProp) {
                    propertyId = newProp.id
                }
            }

            // Link customer to property if both exist
            if (customerId && propertyId) {
                // Check if link already exists
                const { data: linkExist } = await supabase
                    .from('customer_properties')
                    .select('id, is_active')
                    .eq('customer_id', customerId)
                    .eq('property_id', propertyId)
                    .maybeSingle()
                
                if (!linkExist) {
                    await supabase.from('customer_properties').insert({
                        customer_id: customerId,
                        property_id: propertyId,
                        is_active: true
                    })
                } else if (!linkExist.is_active) {
                    await supabase.from('customer_properties').update({
                        is_active: true,
                        unlinked_at: null
                    }).eq('id', linkExist.id)
                }
            }
        }

        // ── Generate booking reference number ──────────────────────────────────
        const bookingNumber = await generateJobNumber()

        // ── Create the booking_request job ─────────────────────────────────────
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .insert({
                job_number: bookingNumber,
                status: 'booking_request',
                priority: 'normal',
                customer_id: customerId,               // ← now linked (Fix 2)
                property_id: propertyId,               // ← now linked (Fix 4)
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

        // Fire notification trigger (direct module call — no HTTP self-fetch)
        await fireNotification('booking_created_website', {
            job_id: String(job.id),
            job_number: job.job_number,
            customer_id: customerId ? String(customerId) : undefined,
            customer_name: customer.name || `${customer.firstName} ${customer.lastName}`.trim(),
        }).catch(err => console.error('[booking/fireNotification] Error:', err.message));

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
