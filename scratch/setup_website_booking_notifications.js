const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("=== SETTING UP WEBSITE BOOKING & ENQUIRY NOTIFICATIONS ===");

    // 1. Create or verify Template for "Website Enquiry Alert"
    const templateName = "Website Enquiry Alert";
    let templateId = null;

    // Check if template exists
    const { data: existingTemplate } = await supabase
        .from('notification_templates')
        .select('id')
        .eq('name', templateName)
        .maybeSingle();

    if (existingTemplate) {
        templateId = existingTemplate.id;
        console.log(`Template "${templateName}" already exists with ID: ${templateId}`);
    } else {
        const { data: newTemplate, error: tErr } = await supabase
            .from('notification_templates')
            .insert({
                name: templateName,
                channel: 'push',
                type: 'job_notification',
                content: '📞 New Website Enquiry! Phone: {customer_name} for category {job_id}. Please review in Admin dashboard: https://sortedsolutions.in/admin',
                variables: ['job_id', 'customer_name'],
                is_default: false
            })
            .select('id')
            .single();

        if (tErr) {
            console.error("Failed to create template:", tErr);
            return;
        }
        templateId = newTemplate.id;
        console.log(`Created new template "${templateName}" with ID: ${templateId}`);
    }

    // 2. Create Trigger for booking_created_website (standard website bookings)
    // We want this trigger to use the existing "Job Created Admin" template (id: 40c91360-1d39-4e38-b211-e6c7823ef019)
    const adminJobCreatedTemplateId = '40c91360-1d39-4e38-b211-e6c7823ef019';
    
    const { data: existingBookingTrigger } = await supabase
        .from('notification_triggers')
        .select('id')
        .eq('event_type', 'booking_created_website')
        .eq('template_id', adminJobCreatedTemplateId)
        .maybeSingle();

    if (existingBookingTrigger) {
        console.log("Trigger for booking_created_website already exists.");
    } else {
        const { error: trgErr } = await supabase
            .from('notification_triggers')
            .insert({
                event_type: 'booking_created_website',
                is_active: true,
                audience: ['admins'],
                channel: 'push',
                template_id: adminJobCreatedTemplateId
            });

        if (trgErr) {
            console.error("Failed to create booking_created_website trigger:", trgErr);
        } else {
            console.log("Successfully created trigger for booking_created_website.");
        }
    }

    // 3. Create Trigger for booking_enquiry_captured (website lead/enquiry submissions)
    const { data: existingEnquiryTrigger } = await supabase
        .from('notification_triggers')
        .select('id')
        .eq('event_type', 'booking_enquiry_captured')
        .eq('template_id', templateId)
        .maybeSingle();

    if (existingEnquiryTrigger) {
        console.log("Trigger for booking_enquiry_captured already exists.");
    } else {
        const { error: trgErr2 } = await supabase
            .from('notification_triggers')
            .insert({
                event_type: 'booking_enquiry_captured',
                is_active: true,
                audience: ['admins'],
                channel: 'push',
                template_id: templateId
            });

        if (trgErr2) {
            console.error("Failed to create booking_enquiry_captured trigger:", trgErr2);
        } else {
            console.log("Successfully created trigger for booking_enquiry_captured.");
        }
    }
}

run();
