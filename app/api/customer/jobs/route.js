import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

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

        // Build query — jobs stores appliance/brand/issue as plain text + JSONB notes,
        // so we select all columns directly (no invalid FK joins)
        let query = supabase
            .from('jobs')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false })

        // Filter by status if provided
        if (status && status !== 'all') {
            query = query.eq('status', status)
        }

        const { data: jobs, error } = await query

        if (error) {
            console.error('Error fetching customer jobs:', error)
            return NextResponse.json(
                { error: 'Failed to fetch jobs', detail: error.message, code: error.code, hint: error.hint },
                { status: 500 }
            )
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
                stage: job.stage,
                assignedTechnician: job.assigned_technician?.name,
                technicianMobile: job.assigned_technician?.mobile,
                dueDate: job.due_date,
                confirmedVisitTime: job.confirmed_visit_time,
                completedAt: job.completed_at,
                createdAt: job.created_at,
                notes: job.description || ''   // show description as user-facing notes
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

// Generate Job Number like JOB-1001, JOB-1002
async function generateJobNumber() {
    // Find the highest existing JOB- number
    const { data: latestJobs } = await supabase
        .from('jobs')
        .select('job_number')
        .not('job_number', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
        
    let nextNum = 1001; // Start from 1001 if none exist
    if (latestJobs && latestJobs.length > 0) {
        const nums = latestJobs
            .map(j => {
                const match = j.job_number?.match(/^JOB-(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            })
            .filter(n => n > 0);
        
        if (nums.length > 0) {
            nextNum = Math.max(...nums) + 1;
        }
    }
    return `JOB-${nextNum}`;
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
            brand,
            issue_type,
            description,
            preferred_date,
            preferred_time_slot,
            image_url
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
                .not('status', 'in', '("cancelled","rejected")')

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
                .from('customer_properties')
                .select('*')
                .eq('id', property_id)
                .single()
            if (prop) {
                propertyBlob = {
                    id: prop.id,
                    name: prop.name || prop.address,
                    address: prop.address,
                    locality: prop.locality || '',
                    city: prop.city || '',
                    pincode: prop.pincode || ''
                }
            }
        }

        // ── Build a clean booking_data JSONB blob for reference ───────────────
        const bookingData = {
            applianceType: appliance_type,
            brandName: brand || '',
            issueType: issue_type || '',
            imageUrl: image_url || null,
            preferredDate: preferred_date,
            preferredTimeSlot: preferred_time_slot,
        }

        // ── Auto Generate Job Number ────────────────────────────────────────
        const job_number = await generateJobNumber();

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
                customer_id,
                property_id: property_id || null,
                property: propertyBlob,            // JSONB blob for address display
                category: appliance_type,          // appliance name in category column
                issue: issue_type || null,         // issue text in issue column
                description: description || null,  // optional description
                scheduled_date: preferred_date,    // reuse website column
                scheduled_time: preferred_time_slot,
                notes: JSON.stringify(bookingData), // full context as JSONB
                priority: 'normal',
                status: 'pending',
                stage: 'new',
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
                        customer_id,
                        property_id: property_id || null,
                        property: propertyBlob,
                        category: appliance_type,
                        issue: issue_type || null,
                        description: description || null,
                        scheduled_date: preferred_date,
                        scheduled_time: preferred_time_slot,
                        notes: JSON.stringify(bookingData),
                        priority: 'normal',
                        status: 'pending',
                        stage: 'new',
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
                await supabase.from('job_interactions').insert({
                    job_id: jobRetry.id,
                    type: 'created',
                    message: `Service request created via customer app for ${appliance_type}${issue_type ? ' — ' + issue_type : ''}`,
                    user_name: 'Customer App'
                })
                return NextResponse.json({ success: true, job: jobRetry, message: 'Service request created successfully' })
            }
            return NextResponse.json(
                { success: false, error: 'Failed to create service request: ' + error.message },
                { status: 500 }
            )
        }

        // ── Log interaction ───────────────────────────────────────────────────
        await supabase.from('job_interactions').insert({
            job_id: job.id,
            type: 'created',
            message: `Service request created via customer app for ${appliance_type}${issue_type ? ' — ' + issue_type : ''}`,
            user_name: 'Customer App'
        })

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
