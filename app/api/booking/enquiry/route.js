import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { logInteractionServer } from '@/lib/log-interaction-server'
import { generateJobNumber } from '@/lib/generateJobNumber'

export async function POST(request) {
    try {
        const body = await request.json()
        const { categoryId, categoryName, subcategoryId, subcategoryName, issueId, issueName, brand, brandName, pincode, locality, phone } = body
        
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
            status: 'enquiry',
            customer_name: 'Website Lead',
            category: categoryName || categoryId || 'Appliance Repair',
            subcategory: subcategoryName || subcategoryId || '',
            issue: issueName || issueId || '',
            brand: brandName || brand || '',
            notes: JSON.stringify(bookingData),
            source: 'Website Organic',
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

        return NextResponse.json({ success: true, enquiryId: enquiry.id });

    } catch (e) {
        console.error('Enquiry API Error:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
