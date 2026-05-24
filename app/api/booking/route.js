import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { logInteractionServer } from '@/lib/log-interaction-server'
import { fireNotification } from '@/lib/fire-notification'
import { generateJobNumber } from '@/lib/generateJobNumber'
import { generateAccountSKU } from '@/lib/generateAccountSKU'

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
            enquiryId
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

        let customerId = null;
        let customerAuthId = null;
        let propertyId = null;

        // ── Look up or create customer for auto-login ─────────────────────────
        // Uses the same fuzzy phone-matching as the auth API to handle all
        // stored formats (+91-XXXXX XXXXX, 10-digit, etc.).
        // Non-fatal: booking still succeeds even if this step errors.
        try {
            const loosePattern = '%' + rawPhone10.split('').join('%') + '%';
            const { data: candidates, error: lookupErr } = await supabase
                .from('customers')
                .select('id, phone, name, profile_complete, ledger_id')
                .ilike('phone', loosePattern)
                .limit(20);

            if (lookupErr) console.error('[booking] customer lookup error:', lookupErr.message);

            let existingCustomer = null;
            if (candidates && candidates.length > 0) {
                existingCustomer = candidates.find(
                    c => c.phone && c.phone.replace(/\D/g, '').slice(-10) === rawPhone10
                ) || null;
            }

            console.log('[booking] customer lookup:', { rawPhone10, found: !!existingCustomer, candidates: candidates?.length });

            if (existingCustomer) {
                // Customer already has an account — reuse their ID for auto-login
                customerAuthId = existingCustomer.id;
                customerId = existingCustomer.id;
            } else {
                // No record yet — create a passwordless customer so auto-login works.
                // The OnboardingWizard will prompt them to set a password on first visit.
                const customerName = customer.name ||
                    `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
                    `Customer ${rawPhone10.slice(-4)}`;

                // Create accounts ledger entry
                let ledgerId = null;
                let newSKU = null;
                try { newSKU = await generateAccountSKU('customer', 'sundry-debtors'); } catch (skuErr) {
                    console.error('[booking] generateAccountSKU failed:', skuErr.message);
                }

                const accountInsert = {
                    name: customerName,
                    mobile: rawPhone10,
                    type: 'customer',
                    under: 'sundry-debtors',
                    source: 'Website Booking',
                    opening_balance: 0,
                    balance_type: 'debit',
                    status: 'active',
                    created_at: new Date().toISOString(),
                };
                if (newSKU) accountInsert.sku = newSKU;

                const { data: accountEntry, error: accountErr } = await supabase
                    .from('accounts')
                    .insert(accountInsert)
                    .select('id')
                    .single();
                if (accountErr) console.error('[booking] accounts insert error:', accountErr.message);
                if (accountEntry?.id) ledgerId = accountEntry.id;

                // Create the customers row (no password_hash — OTP-verified booking)
                const { data: newCustomer, error: customerCreateErr } = await supabase
                    .from('customers')
                    .insert({
                        phone: rawPhone10,
                        name: customerName,
                        full_name: customerName,
                        customer_type: 'one_time',
                        profile_complete: false,
                        ledger_id: ledgerId,
                        created_at: new Date().toISOString(),
                    })
                    .select('id')
                    .single();

                if (customerCreateErr) console.error('[booking] customers insert error:', customerCreateErr.message);
                console.log('[booking] new customer created:', newCustomer?.id || 'FAILED');

                if (newCustomer?.id) {
                    customerAuthId = newCustomer.id;
                    customerId = newCustomer.id;
                }
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
