const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const amcTemplate = `
<div style="font-family: Arial, sans-serif; color: #1e293b;">
    <h2 style="border-bottom: 2px solid #3b82f6; padding-bottom: 8px; color: #1d4ed8; text-transform: uppercase; font-size: 16px; letter-spacing: 1px;">1. Service Contract Overview</h2>
    <p style="font-size: 13px; line-height: 1.6;">
        This Annual Maintenance Contract (AMC) is entered into on <strong>[START_DATE]</strong> between <strong>[COMPANY_NAME]</strong> and <strong>[CUSTOMER_NAME]</strong>. 
        This agreement outlines the terms of maintenance and support services for the equipment specified below.
    </p>

    <h2 style="border-bottom: 2px solid #3b82f6; padding-bottom: 8px; color: #1d4ed8; text-transform: uppercase; font-size: 16px; letter-spacing: 1px; margin-top: 30px;">2. Equipment Details</h2>
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;">
        <tbody>
            <tr>
                <td style="padding: 10px; border: 1px solid #cbd5e1; background-color: #f8fafc; font-weight: 600; width: 30%;">Product / Plan</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">[PRODUCT_NAME]</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid #cbd5e1; background-color: #f8fafc; font-weight: 600;">Brand & Model</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">[PRODUCT_BRAND] / [PRODUCT_MODEL]</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid #cbd5e1; background-color: #f8fafc; font-weight: 600;">Serial Number</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">[SERIAL_NUMBER]</td>
            </tr>
        </tbody>
    </table>

    <h2 style="border-bottom: 2px solid #3b82f6; padding-bottom: 8px; color: #1d4ed8; text-transform: uppercase; font-size: 16px; letter-spacing: 1px; margin-top: 30px;">3. Commercial Terms</h2>
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;">
        <tbody>
            <tr>
                <td style="padding: 10px; border: 1px solid #cbd5e1; background-color: #f8fafc; font-weight: 600; width: 30%;">Contract Value</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: 700; color: #16a34a;">Rs. [CONTRACT_VALUE]</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid #cbd5e1; background-color: #f8fafc; font-weight: 600;">Valid From</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">[START_DATE]</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid #cbd5e1; background-color: #f8fafc; font-weight: 600;">Valid Till</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">[END_DATE]</td>
            </tr>
        </tbody>
    </table>

    <h2 style="border-bottom: 2px solid #3b82f6; padding-bottom: 8px; color: #1d4ed8; text-transform: uppercase; font-size: 16px; letter-spacing: 1px; margin-top: 30px;">4. Services Included</h2>
    <div style="font-size: 13px; line-height: 1.6; margin-top: 10px; padding: 10px; background-color: #f8fafc; border: 1px solid #cbd5e1;">
        [SERVICES_INCLUDED]
    </div>

    <h2 style="border-bottom: 2px solid #3b82f6; padding-bottom: 8px; color: #1d4ed8; text-transform: uppercase; font-size: 16px; letter-spacing: 1px; margin-top: 30px;">5. Plan Terms & Conditions</h2>
    <div style="font-size: 12px; line-height: 1.6; color: #475569; margin-top: 10px;">
        [PLAN_TERMS]
    </div>

    <p style="font-size: 13px; line-height: 1.6; margin-top: 20px;">
        The next scheduled service visit under this contract is due on or around <strong>[NEXT_SERVICE_DATE]</strong>. 
        Our technician will contact you prior to the visit to coordinate a convenient time.
    </p>
</div>
`;

async function run() {
    const { data, error } = await supabase
        .from('agreement_templates')
        .update({ content: amcTemplate })
        .eq('type', 'amc');
    console.log('Update result:', error || 'Success');
}
run();
