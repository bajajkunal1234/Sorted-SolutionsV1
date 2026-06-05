import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { logInteractionServer } from '@/lib/log-interaction-server'
import { generateJobNumber } from '@/lib/generateJobNumber'
import { trackLeadAttribution } from '@/lib/lead-tracker'

export async function POST(request) {
    const supabase = createServerSupabase()
    try {
        const body = await request.json()
        const { categoryId, categoryName, subcategoryId, subcategoryName, issueId, issueName, brand, brandName, pincode, locality, phone, session_id } = body
        
        if (!phone) {
            return NextResponse.json({ success: false, error: 'Phone required' }, { status: 400 })
        }

        const rawPhone = phone.replace(/\D/g, '').slice(-10);

        // Store what we have in `notes` JSON so the Admin modal can read it:
        const bookingData = {
            categoryName: categoryName || categoryId,
            subcategoryName: subcategoryName || subcategoryId,
            issueName: issueName || issueId,
            brandName: brandName || brand,
            customer: {
                phone: `+91-${rawPhone.slice(0, 5)} ${rawPhone.slice(5)}`,
                address: { pincode, locality }
            }
        };

        const jobNumber = await generateJobNumber();

        const { data: enquiry, error } = await supabase.from('jobs').insert({
            job_number: jobNumber,
            status: 'new_job_request',      // 'enquiry' is not a valid DB status value
            customer_name: rawPhone,        // store phone so admin can see who enquired
            category: categoryName || categoryId || 'Appliance Repair',
            subcategory: subcategoryName || subcategoryId || '',
            issue: issueName || issueId || '',
            brand: brandName || brand || '',
            notes: JSON.stringify(bookingData),
            source: 'Website Organic',      // this is what marks it as an enquiry in admin
        }).select('id').single();

        if (error) throw error;

        // Log interaction
        await supabase.from('job_interactions').insert([{
            job_id: enquiry.id,
            type: 'created',
            message: `New Website Enquiry captured for ${bookingData.categoryName}. (Customer Phone: ${bookingData.customer.phone})`,
            user_name: 'System (Website)'
        }]);

        logInteractionServer({
            type: 'booking-enquiry-captured',
            category: 'job',
            jobId: String(enquiry.id),
            description: `Website Enquiry: ${bookingData.categoryName} — ${bookingData.subcategoryName}`,
            metadata: { categoryId, subcategoryId, pincode, phone: rawPhone },
            source: 'Website',
        });

        await trackLeadAttribution(supabase, {
            phone: phone,
            session_id,
            conversion_type: 'web_enquiry',
            status: 'interested'
        }).catch(err => console.error('[enquiry] trackLeadAttribution error:', err));

        return NextResponse.json({ success: true, enquiryId: enquiry.id });

    } catch (e) {
        console.error('Enquiry API Error:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
