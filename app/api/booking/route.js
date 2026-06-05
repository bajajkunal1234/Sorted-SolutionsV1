import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { logInteractionServer } from '@/lib/log-interaction-server'
import { fireNotification } from '@/lib/fire-notification'
import { generateJobNumber } from '@/lib/generateJobNumber'
import { generateAccountSKU } from '@/lib/generateAccountSKU'
import { trackLeadAttribution } from '@/lib/lead-tracker'

export async function POST(request) {
    const supabase = createServerSupabase()
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
            enquiryId,
            session_id
        } = body

        // ── Validate mandatory fields ──────────────────────────────────────────
        if (!customer?.phone || !categoryId || !subcategoryId) {
            return NextResponse.json(
                { success: false, error: 'Missing required booking details' },
                { status: 400 }
            )
        }

        // Normalise phone number
        const rawPhone10 = customer.phone.replace(/\D/g, '').slice(-10);
        if (rawPhone10.length === 10) {
            customer.phone = `+91-${rawPhone10.slice(0, 5)} ${rawPhone10.slice(5)}`;
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
                    .not('status', 'in', '("cancelled","closed")')

                if (existingCount >= matchedSlot.maxBookings) {
                    return NextResponse.json(
                        { success: false, error: 'This time slot is fully booked. Please choose a different date or time.' },
                        { status: 409 }
                    )
                }
            }
        }

        let customerId = null;    // accounts.id  — stored on jobs.customer_id
        let customerAuthId = null; // customers.id — stored in localStorage for auth
        let propertyId = null;

        // ── Look up OR create customer (idempotent — safe to run on every booking) ─
        // Priority chain:
        //   1. customers table (exact phone match) — fastest, preserves existing session
        //   2. accounts table  (exact mobile match) — for cases where customers row is missing
        //   3. Create new accounts + customers rows via upsert (conflict-safe)
        try {
            const customerName = customer.name ||
                `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
                `Customer ${rawPhone10.slice(-4)}`;

            // ── Stage 1: Look up in customers table ─────────────────────────────
            const loosePattern = '%' + rawPhone10.split('').join('%') + '%';
            const { data: candidates } = await supabase
                .from('customers')
                .select('id, phone, name, ledger_id')
                .ilike('phone', loosePattern)
                .limit(20);

            const existingCustomer = (candidates || []).find(
                c => c.phone && c.phone.replace(/\D/g, '').slice(-10) === rawPhone10
            ) || null;

            if (existingCustomer) {
                customerAuthId = existingCustomer.id;
                customerId = existingCustomer.ledger_id || existingCustomer.id;

                // If the customer row lacks a ledger_id, check accounts table by mobile
                if (!existingCustomer.ledger_id) {
                    const { data: acct } = await supabase
                        .from('accounts')
                        .select('id')
                        .or(`mobile.eq.${rawPhone10},mobile.eq.+91${rawPhone10}`)
                        .maybeSingle();
                    if (acct?.id) {
                        customerId = acct.id;
                        // Back-fill ledger_id on the customers row
                        await supabase.from('customers').update({ ledger_id: acct.id }).eq('id', existingCustomer.id);
                    }
                }

                console.log('[booking] existing customer found:', { customerId, customerAuthId });
            } else {
                // ── Stage 2: Look up in accounts table by mobile ────────────────
                const { data: existingAccount } = await supabase
                    .from('accounts')
                    .select('id, name, mobile')
                    .or(`mobile.eq.${rawPhone10},mobile.eq.+91${rawPhone10}`)
                    .maybeSingle();

                let ledgerId = existingAccount?.id || null;

                if (!ledgerId) {
                    // ── Stage 3: Create accounts entry (upsert by mobile) ───────
                    let newSKU = null;
                    try { newSKU = await generateAccountSKU('customer', 'sundry-debtors'); } catch (_) {}

                    const accountPayload = {
                        name: customerName,
                        mobile: rawPhone10,
                        type: 'customer',
                        under: 'sundry-debtors',
                        acquisition_source: 'Website Booking',
                        opening_balance: 0,
                        balance_type: 'debit',
                        status: 'active',
                    };
                    if (newSKU) accountPayload.sku = newSKU;

                    const { data: newAccount, error: accountErr } = await supabase
                        .from('accounts')
                        .insert(accountPayload)
                        .select('id')
                        .single();

                    if (accountErr) {
                        console.error('[booking] accounts insert error:', accountErr.message, accountErr.code);
                        // On duplicate — try fetching again (race condition / previous failed booking)
                        if (accountErr.code === '23505') {
                            const { data: racedAcct } = await supabase
                                .from('accounts')
                                .select('id')
                                .or(`mobile.eq.${rawPhone10},mobile.eq.+91${rawPhone10}`)
                                .maybeSingle();
                            ledgerId = racedAcct?.id || null;
                        }
                    } else {
                        ledgerId = newAccount?.id || null;
                    }
                }

                // ── Create / upsert the customers row ───────────────────────────
                // Use upsert on username so a second booking never fails
                const autoUsername = `customer_${rawPhone10}`;
                const { data: newCustomer, error: customerCreateErr } = await supabase
                    .from('customers')
                    .upsert({
                        phone: rawPhone10,
                        name: customerName,
                        full_name: customerName,
                        username: autoUsername,
                        customer_type: 'one_time',
                        profile_complete: false,
                        ledger_id: ledgerId,
                    }, { onConflict: 'username', ignoreDuplicates: false })
                    .select('id')
                    .single();

                if (customerCreateErr) {
                    console.error('[booking] customers upsert error:', customerCreateErr.message);
                    // Try fetching the existing row instead
                    const { data: fallbackCx } = await supabase
                        .from('customers')
                        .select('id')
                        .eq('username', autoUsername)
                        .maybeSingle();
                    if (fallbackCx?.id) {
                        customerAuthId = fallbackCx.id;
                    }
                } else if (newCustomer?.id) {
                    customerAuthId = newCustomer.id;
                }

                customerId = ledgerId || customerAuthId;
                console.log('[booking] new/upserted customer:', { customerAuthId, customerId, ledgerId });
            }
        } catch (customerErr) {
            console.error('[booking] customer lookup/create EXCEPTION:', customerErr.message);
        }

        // ── Generate booking reference number ──────────────────────────────────
        let bookingNumber = await generateJobNumber()

        // ── Create or Update the booking_request job ───────────────────────────
        let job = null;
        // Build standardized job name: "New [Appliance Type] [Issue] [Locality]"
        // Website bookings are always "New" — warranty is assessed by admin later
        const bookingLocality =
            customer?.address?.locality ||
            customer?.address?.area ||
            customer?.address?.neighbourhood ||
            customer?.address?.suburb ||
            customer?.address?.district ||
            pincode ||
            '';
        const autoDescription = ['New', subcategoryName || categoryName || '', issueName || '', bookingLocality.trim()]
            .map(s => (s || '').trim())
            .filter(Boolean)
            .join(' ');

        const jobData = {
            job_number: bookingNumber,
            status: 'new_job_request',
            priority: 'normal',
            customer_id: customerId,
            property_id: propertyId,
            customer_name: customer.name || `${customer.firstName} ${customer.lastName}`.trim(),
            category: categoryName || categoryId,
            subcategory: subcategoryName || subcategoryId,
            issue: issueName || issueId,
            description: autoDescription || description || '',
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

        await trackLeadAttribution(supabase, {
            phone: customer.phone,
            session_id,
            conversion_type: 'web_booking',
            name: customer.name || `${customer.firstName} ${customer.lastName}`.trim(),
            status: 'converted'
        }).catch(err => console.error('[booking] trackLeadAttribution error:', err));

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
    const supabase = createServerSupabase()
    try {
        const { data, error } = await supabase
            .from('jobs')
            .select('*')
            .eq('status', 'new_job_request')
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json({ success: true, data: data || [] })
    } catch (error) {
        console.error('Booking GET Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
