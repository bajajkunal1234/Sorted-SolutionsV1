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
            schedule,
            enquiryId
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
        const last10 = rawPhone.slice(-10);

        let customerId = null
        {
            // Look up existing account by phone using flexible pattern matching
            const loosePattern = '%' + last10.split('').join('%') + '%';
            const { data: candidates } = await supabase
                .from('accounts')
                .select('id, mobile')
                .ilike('mobile', loosePattern)
                .limit(20)

            let existingAccount = null;
            if (candidates && candidates.length > 0) {
                existingAccount = candidates.find(c => c.mobile && c.mobile.replace(/\D/g, '').slice(-10) === last10);
            }

            if (existingAccount) {
                // Reuse existing account
                customerId = existingAccount.id
            } else {
                const formattedMobile = `+91-${last10.slice(0, 5)} ${last10.slice(5)}`;
                const newSKU = await generateAccountSKU('customer', 'sundry-debtors');
                const { data: newAccount, error: accError } = await supabase
                    .from('accounts')
                    .insert({
                        name: customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || formattedMobile,
                        mobile: formattedMobile,
                        email: customer.email || null,
                        type: 'customer',
                        under: 'customers',
                        sku: newSKU,
                        acquisition_source: 'Website Organic',
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
                    logInteractionServer({
                        type: 'account-created-website',
                        category: 'account',
                        customerId: customerId,
                        customerName: customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || formattedMobile,
                        description: `New ledger account created via Website Booking (${formattedMobile})`,
                        source: 'Website',
                    });
                }
            }
        }

        // -- Ensure a customers row exists so the visitor can access the Customer App later --
        // This also sets the ledger_id link so customer/jobs API can find their bookings.
        if (customerId) {
            const formattedMobile = `+91-${last10.slice(0, 5)} ${last10.slice(5)}`;
            const customerFullName = customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || formattedMobile;
            
            const loosePattern = '%' + last10.split('').join('%') + '%';
            const { data: cxCandidates } = await supabase
                .from('customers')
                .select('id, ledger_id, phone')
                .ilike('phone', loosePattern)
                .limit(20);

            let existingCx = null;
            if (cxCandidates && cxCandidates.length > 0) {
                existingCx = cxCandidates.find(c => c.phone && c.phone.replace(/\D/g, '').slice(-10) === last10);
            }

            let customerAuthId = null;

            if (!existingCx) {
                // Create a minimal customers row (no password — they haven't signed up yet)
                const { data: newCx, error: cxInsertErr } = await supabase.from('customers').insert({
                    name: customerFullName,
                    full_name: customerFullName,
                    phone: formattedMobile,
                    email: customer.email || null,
                    ledger_id: customerId,
                    customer_type: 'one_time',
                    profile_complete: false,
                }).select('id').single();
                if (cxInsertErr) console.warn('[booking] Could not create customers row:', cxInsertErr.message);
                if (newCx) customerAuthId = newCx.id;
            } else {
                customerAuthId = existingCx.id;
                if (!existingCx.ledger_id) {
                    // Existing customers row missing ledger_id — link it now
                    const { error: updateLedgerErr } = await supabase.from('customers')
                        .update({ ledger_id: customerId })
                        .eq('id', existingCx.id);
                    if (updateLedgerErr) console.warn('[booking] Could not update ledger_id:', updateLedgerErr.message);
                }
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
            // customerId here is the accounts.id (ledger account), so store in account_id
            // to avoid FK constraint on customers table and match admin lookup patterns.
            if (customerId && propertyId) {
                // Check if link already exists (check both account_id and customer_id columns)
                const { data: linkExistByAccount } = await supabase
                    .from('customer_properties')
                    .select('id, is_active')
                    .eq('account_id', customerId)
                    .eq('property_id', propertyId)
                    .maybeSingle()

                const { data: linkExistByCustomer } = await supabase
                    .from('customer_properties')
                    .select('id, is_active')
                    .eq('customer_id', customerId)
                    .eq('property_id', propertyId)
                    .maybeSingle()

                const linkExist = linkExistByAccount || linkExistByCustomer
                
                if (!linkExist) {
                    // Use account_id to avoid FK constraint on customers table
                    const insertResult = await supabase.from('customer_properties').insert({
                        account_id: customerId,
                        customer_id: customerAuthId || customerId,
                        property_id: propertyId,
                        is_active: true,
                        linked_at: new Date().toISOString(),
                    })
                    if (insertResult.error) {
                        // Fallback: try storing in both columns (some schemas may need this)
                        const { error: fallbackErr } = await supabase.from('customer_properties').insert({
                            account_id: customerId,
                            customer_id: customerAuthId || customerId,
                            property_id: propertyId,
                            is_active: true,
                            linked_at: new Date().toISOString(),
                        });
                        if (fallbackErr) console.warn('[booking] property link fallback failed:', fallbackErr.message);
                    }
                } else if (!linkExist.is_active) {
                    await supabase.from('customer_properties').update({
                        is_active: true,
                        unlinked_at: null
                    }).eq('id', linkExist.id)
                }
            }
        }

        // ── Generate booking reference number ──────────────────────────────────
        let bookingNumber = await generateJobNumber()

        // ── Create or Update the booking_request job ───────────────────────────
        let job = null;
        const jobData = {
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
            })
        };

        if (enquiryId) {
            // Read existing enquiry to keep its original job_number if needed
            const { data: existingEnquiry } = await supabase.from('jobs').select('job_number').eq('id', enquiryId).single();
            if (existingEnquiry && existingEnquiry.job_number) {
                jobData.job_number = existingEnquiry.job_number;
                bookingNumber = existingEnquiry.job_number;
            }

            const { data: updatedJob, error: jobError } = await supabase
                .from('jobs')
                .update(jobData)
                .eq('id', enquiryId)
                .select('id')
                .single();
            
            if (jobError) throw jobError;
            job = updatedJob;
        } else {
            jobData.created_at = new Date().toISOString();
            const { data: newJob, error: jobError } = await supabase
                .from('jobs')
                .insert(jobData)
                .select('id')
                .single();
            
            if (jobError) throw jobError;
            job = newJob;
        }

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
            customerId: customerId,
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
            customerAuthId,
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
