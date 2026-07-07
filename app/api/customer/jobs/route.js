import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { fireNotification } from '@/lib/fire-notification'
import { generateJobNumber } from '@/lib/generateJobNumber'
import { logInteractionServer } from '@/lib/log-interaction-server'

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const customerId = searchParams.get('customerId')
        const status = searchParams.get('status')

        if (!customerId) {
            return NextResponse.json(
                { error: 'Customer ID is required' },
                { status: 400 }
            )
        }

        // Guard: jobs.customer_id is a UUID column — if the stored ID isn't
        // a valid UUID (e.g. demo accounts or old plain-text IDs), skip the query
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!UUID_RE.test(customerId)) {
            return NextResponse.json({ success: true, jobs: [], count: 0 })
        }

        // Fetch customer's phone + ledger_id — used for both UUID and phone-based lookups
        const { data: cx } = await supabase.from('customers').select('ledger_id, phone').eq('id', customerId).single()
        const accountId = cx?.ledger_id || customerId

        // Build query — jobs stores appliance/brand/issue as plain text + JSONB notes,
        // so we select all columns directly (no invalid FK joins)
        let query = supabase
            .from('jobs')
            .select('*')
            .or(`customer_id.eq.${customerId},customer_id.eq.${accountId}`)
            .order('created_at', { ascending: false })

        // Filter by status if provided
        if (status && status !== 'all') {
            query = query.eq('status', status)
        }

        let { data: jobs, error } = await query

        if (error) {
            console.error('Error fetching customer jobs:', error)
            return NextResponse.json(
                { error: 'Failed to fetch jobs', detail: error.message, code: error.code, hint: error.hint },
                { status: 500 }
            )
        }

        // ── Phone-based fallback ──────────────────────────────────────────────────
        // If UUID lookup returned nothing, the job might have been created with
        // customers.id or an old format. Try matching by phone in customer_name
        // or the notes JSONB customer phone field.
        if ((!jobs || jobs.length === 0) && cx?.phone) {
            const phone10 = cx.phone.replace(/\D/g, '').slice(-10);
            // Jobs created by website booking store phone in notes JSON
            const { data: phoneJobs, error: phoneError } = await supabase
                .from('jobs')
                .select('*')
                .ilike('notes', `%${phone10}%`)
                .order('created_at', { ascending: false });

            if (!phoneError && phoneJobs && phoneJobs.length > 0) {
                // Filter strictly by phone to avoid false positives
                jobs = phoneJobs.filter(j => {
                    try {
                        const n = typeof j.notes === 'string' ? JSON.parse(j.notes) : (j.notes || {});
                        const storedPhone = (n?.customer?.phone || '').replace(/\D/g, '').slice(-10);
                        return storedPhone === phone10;
                    } catch { return false; }
                });

                // Also back-fill the customer_id on these jobs so future queries work
                if (jobs.length > 0 && accountId !== customerId) {
                    const jobIds = jobs.map(j => j.id);
                    supabase.from('jobs').update({ customer_id: accountId }).in('id', jobIds)
                        .then(() => console.log(`[customer/jobs] back-filled customer_id for ${jobIds.length} jobs`))
                        .catch(e => console.warn('[customer/jobs] back-fill failed:', e.message));
                }
            }
        }

        // job.property is a JSONB blob stored on the job row
        const resolveAddr = (prop) => {
            if (!prop) return {};
            if (prop.address && typeof prop.address === 'object')
                return { address: prop.address.line1 || '', locality: prop.address.locality || '', city: prop.address.city || '' };
            return { address: typeof prop.address === 'string' ? prop.address : '', locality: prop.locality || '', city: prop.city || '' };
        };

        // Transform data — support both FK-joined product and plain text category columns
        const transformedJobs = jobs.map(job => {
            const addr = resolveAddr(job.property);
            // Parse notes JSONB for extra fields if present
            let notesData = {};
            if (job.notes && typeof job.notes === 'string') {
                try { notesData = JSON.parse(job.notes); } catch (_) { notesData = {}; }
            } else if (job.notes && typeof job.notes === 'object') {
                notesData = job.notes;
            }

            return {
                id: job.id,
                jobNumber: job.job_number,
                propertyId: job.property_id,
                address: addr.address,
                locality: addr.locality,
                city: addr.city,
                product: {
                    type: job.product?.category || job.category || notesData.categoryName,
                    name: job.product?.name,
                    brand: job.brand?.name || notesData.brandName
                },
                issue: job.issue?.title || job.issue || notesData.issueName,
                issueCategory: job.issue?.category,
                priority: job.priority,
                status: job.status,
                assignedTechnician: job.assigned_technician?.name,
                technicianMobile: job.assigned_technician?.mobile,
                dueDate: job.scheduled_date || job.due_date,
                confirmedVisitTime: job.scheduled_time || job.confirmed_visit_time,
                completedAt: job.completed_at,
                createdAt: job.created_at,
                notes: job.description || '',   // show description as user-facing notes
                customer_rating: job.customer_rating || null,
                rating_note: job.rating_note || null,
                rated_at: job.rated_at || null,
                arrived_at: job.arrived_at || null,
                amcId: job.amc_id || notesData.amcId || null,
                rentalId: job.rental_id || notesData.rentalId || null,
                serviceCoverage: notesData.serviceCoverage || (job.amc_id ? 'amc' : job.rental_id ? 'rental' : job.warranty ? 'warranty' : 'standard'),
                warrantyInfo: job.warranty_proof || notesData.warrantyInfo || null,
            };
        })

        return NextResponse.json({
            success: true,
            jobs: transformedJobs,
            count: transformedJobs.length
        })

    } catch (error) {
        console.error('Error in customer jobs API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function POST(request) {
    try {
        const jobData = await request.json()

        // ── Validate required fields ──────────────────────────────────────────
        // Accept the flexible payload from BookServiceModal:
        //   { customer_id, property_id, appliance_type, brand, issue_type, issue_id,
        //     description, preferred_date, preferred_time_slot, image_url }
        const {
            customer_id,
            property_id,
            appliance_type,
            subcategory,
            brand,
            issue_type,
            description,
            preferred_date,
            preferred_time_slot,
            image_url,
            service_coverage,
            amc_id,
            rental_id,
            warranty_info
        } = jobData

        if (!customer_id) {
            return NextResponse.json({ success: false, error: 'customer_id is required' }, { status: 400 })
        }
        if (!appliance_type) {
            return NextResponse.json({ success: false, error: 'Please select an appliance type' }, { status: 400 })
        }
        if (!preferred_date || !preferred_time_slot) {
            return NextResponse.json({ success: false, error: 'Preferred date and time slot are required' }, { status: 400 })
        }

        // ── Fix 3: Slot capacity check ────────────────────────────────────────
        // Fetch the slot maxBookings from booking_slots settings
        const { data: slotsConfig } = await supabase
            .from('website_section_configs')
            .select('config')
            .eq('section_id', 'booking-slots')
            .single()

        const allSlots = slotsConfig?.config?.slots || []
        const matchedSlot = allSlots.find(s =>
            (s.label || `${s.startTime}–${s.endTime}`) === preferred_time_slot && s.active !== false
        )

        if (matchedSlot?.maxBookings) {
            // Count existing active bookings for same date + slot
            const { count: existingCount } = await supabase
                .from('jobs')
                .select('id', { count: 'exact', head: true })
                .eq('scheduled_date', preferred_date)
                .eq('scheduled_time', preferred_time_slot)
                .not('status', 'in', '("cancelled","closed")')

            if (existingCount >= matchedSlot.maxBookings) {
                return NextResponse.json(
                    { success: false, error: 'This time slot is fully booked. Please choose a different date or time.' },
                    { status: 409 }
                )
            }
        }

        // ── Fetch property details to store as JSONB ──────────────────────────
        let propertyBlob = null
        if (property_id) {
            const { data: prop } = await supabase
                .from('properties')
                .select('*')
                .eq('id', property_id)
                .single()
            if (prop) {
                propertyBlob = {
                    id: prop.id,
                    name: prop.name || prop.address,
                    address: [prop.flat_number, prop.building_name, prop.address].filter(Boolean).join(', ') || prop.address,
                    locality: prop.locality || '',
                    city: prop.city || '',
                    pincode: prop.pincode || ''
                }
            }
        }

        // ── Build a clean booking_data JSONB blob for reference ───────────────
        const bookingData = {
            applianceType: appliance_type,
            subcategoryName: subcategory || '',
            brandName: brand || '',
            issueType: issue_type || '',
            imageUrl: image_url || null,
            preferredDate: preferred_date,
            preferredTimeSlot: preferred_time_slot,
            serviceCoverage: service_coverage || 'standard',
            warrantyInfo: warranty_info || null,
            amcId: amc_id || null,
            rentalId: rental_id || null,
        }

        // ── Auto Generate Job Number ────────────────────────────────────────
        const job_number = await generateJobNumber();

        // ── Fetch Customer Name and Account Ledger ID ──────────────────────
        const { data: customerData } = await supabase
            .from('customers')
            .select('name, full_name, phone, ledger_id')
            .eq('id', customer_id)
            .single()
        
        const customer_name = customerData
            ? (customerData.name || customerData.full_name || customerData.phone || 'Customer')
            : 'Customer';

        // -- Safe ledger_id resolution --
        // customerData.ledger_id is the accounts.id for this customer.
        // If it's null (e.g. website-created account not yet linked), fall back to
        // a phone-based lookup against the accounts table rather than using customers.id
        // (which is a different UUID and would not match any jobs.customer_id).
        let account_id = customerData?.ledger_id;
        if (!account_id && customerData?.phone) {
            const phone = customerData.phone.replace(/\D/g, '').slice(-10);
            const { data: acct } = await supabase
                .from('accounts')
                .select('id')
                .or(`mobile.eq.${phone},mobile.eq.+91${phone}`)
                .maybeSingle();
            account_id = acct?.id;
        }
        // Final fallback: use the raw customer_id from the request (may still be wrong,
        // but it's the last resort and we log a warning)
        if (!account_id) {
            console.warn(`[customer/jobs POST] No ledger_id or account found for customer ${customer_id} — using raw ID as fallback`);
            account_id = customer_id;
        }

        // ── Insert job using confirmed existing columns ────────────────────────
        // We map app fields → existing jobs columns to avoid schema errors:
        //   appliance_type → category   (text appliance name)
        //   issue_type     → issue      (text issue description)
        //   brand          → stored in notes JSONB
        //   preferred_date → scheduled_date
        //   preferred_time_slot → scheduled_time
        const { data: job, error } = await supabase
            .from('jobs')
            .insert({
                job_number,
                customer_id: account_id,
                customer_name,
                property_id: property_id || null,
                property: propertyBlob,            // JSONB blob for address display
                category: appliance_type,          // appliance name in category column
                subcategory: subcategory || null,  // subcategory name
                issue: issue_type || null,         // issue text in issue column
                description: description || null,  // optional description
                scheduled_date: preferred_date,    // reuse website column
                scheduled_time: preferred_time_slot,
                notes: JSON.stringify(bookingData), // full context as JSONB
                amc_id: amc_id || null,
                rental_id: rental_id || null,
                warranty: service_coverage === 'warranty' ? true : false,
                warranty_proof: warranty_info || (amc_id ? `AMC Contract #${amc_id}` : rental_id ? `Rental Contract #${rental_id}` : null),
                priority: 'normal',
                status: 'new_job_request',
                source: 'customer_app',
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating job (customer app):', error)
            // Handle unknown column gracefully — retry without `source`
            if (error.code === '42703') {
                const { data: jobRetry, error: retryError } = await supabase
                    .from('jobs')
                    .insert({
                        job_number,
                        customer_id: account_id,
                        customer_name,
                        property_id: property_id || null,
                        property: propertyBlob,
                        category: appliance_type,
                        subcategory: subcategory || null,
                        issue: issue_type || null,
                        description: description || null,
                        scheduled_date: preferred_date,
                        scheduled_time: preferred_time_slot,
                        notes: JSON.stringify(bookingData),
                        amc_id: amc_id || null,
                        rental_id: rental_id || null,
                        warranty: service_coverage === 'warranty' ? true : false,
                        warranty_proof: warranty_info || (amc_id ? `AMC Contract #${amc_id}` : rental_id ? `Rental Contract #${rental_id}` : null),
                        priority: 'normal',
                        status: 'new_job_request',
                        source: 'customer_app',
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .single()

                if (retryError) {
                    return NextResponse.json(
                        { success: false, error: 'Failed to create service request: ' + retryError.message },
                        { status: 500 }
                    )
                }
                // Log and return with retry result
                // Log to job_interactions for admin job timeline visibility
                const { error: logRetryError } = await supabase.from('job_interactions').insert({
                    job_id: jobRetry.id,
                    type: 'created',
                    message: `Service request created via Customer App for ${appliance_type}${issue_type ? ' \u2014 ' + issue_type : ''}`,
                    user_name: customer_name,
                });
                if (logRetryError) console.warn('[customer/jobs] job_interactions retry insert failed:', logRetryError.message);
                
                logInteractionServer({
                    type: 'booking-created-app',
                    category: 'job',
                    jobId: String(jobRetry.id),
                    customerId: account_id,
                    customerName: customer_name,
                    description: `Customer App booking: ${appliance_type}${issue_type ? ' \u2014 ' + issue_type : ''} (${job_number})`,
                    metadata: { bookingNumber: job_number, appliance_type, issue_type, customerId: account_id },
                    source: 'Customer App',
                });

                return NextResponse.json({ success: true, job: jobRetry, message: 'Service request created successfully' })
            }
            return NextResponse.json(
                { success: false, error: 'Failed to create service request: ' + error.message },
                { status: 500 }
            )
        }

        // -- Log to job_interactions (admin job timeline) and fire notification --
        const { error: logError } = await supabase.from('job_interactions').insert({
            job_id: job.id,
            type: 'created',
            message: `Service request created via Customer App for ${appliance_type}${issue_type ? ' \u2014 ' + issue_type : ''}`,
            user_name: customer_name,
        });
        if (logError) console.warn('[customer/jobs] job_interactions insert failed:', logError.message);

        logInteractionServer({
            type: 'booking-created-app',
            category: 'job',
            jobId: String(job.id),
            customerId: account_id,
            customerName: customer_name,
            description: `Customer App booking: ${appliance_type}${issue_type ? ' \u2014 ' + issue_type : ''} (${job_number})`,
            metadata: { bookingNumber: job_number, appliance_type, issue_type, customerId: account_id },
            source: 'Customer App',
        });

        // Fire notification so admin sees the incoming booking request immediately
        fireNotification('booking_created_website', {
            job_id: String(job.id),
            job_number: job.job_number,
            customer_id: account_id ? String(account_id) : undefined,
            customer_name: customer_name || undefined,
        }).catch(err => console.warn('[customer/jobs] fireNotification failed:', err.message));

        return NextResponse.json({
            success: true,
            job,
            message: 'Service request created successfully'
        })

    } catch (error) {
        console.error('Error in job creation API:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
