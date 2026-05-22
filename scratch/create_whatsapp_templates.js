const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const templatesToInsert = [
    {
        name: 'Invoice Whatsapp Template',
        channel: 'whatsapp',
        type: 'invoice_whatsapp',
        content: `Hello {customer_name}! 👋

We've prepared your final invoice for service request (Job #{job_number}).

📋 *Invoice {invoice_number}*

Subtotal: {subtotal}
CGST: {cgst}
SGST: {sgst}
*Total Amount: {total_amount}*

📱 View & track your service request here:
{tracking_url}

Thank you for choosing us! Feel free to call us for any queries.

— Sorted Solutions`,
        variables: ['customer_name', 'job_number', 'invoice_number', 'subtotal', 'cgst', 'sgst', 'total_amount', 'tracking_url'],
        is_default: true
    },
    {
        name: 'Quotation Whatsapp Template',
        channel: 'whatsapp',
        type: 'quotation_whatsapp',
        content: `Hello {customer_name}! 👋

We've prepared your repair estimate for service request (Job #{job_number}).

📋 *Quotation {quote_number}*

*Items:*
{line_items}

Subtotal: {subtotal}
CGST: {cgst}
SGST: {sgst}
*Total Amount: {total_amount}*

📱 View & track your service request here:
{tracking_url}

Please review and let us know if you'd like to proceed. Feel free to call us for any queries.

— Sorted Solutions`,
        variables: ['customer_name', 'job_number', 'quote_number', 'line_items', 'subtotal', 'cgst', 'sgst', 'total_amount', 'tracking_url'],
        is_default: true
    }
];

async function insertTemplates() {
    console.log('Inserting templates...');
    for (const t of templatesToInsert) {
        // Check if exists
        const { data: existing } = await supabase
            .from('notification_templates')
            .select('id')
            .eq('type', t.type)
            .eq('channel', t.channel);
        
        if (existing && existing.length > 0) {
            console.log(`Template for type ${t.type} already exists. Skipping...`);
            continue;
        }

        const { data, error } = await supabase
            .from('notification_templates')
            .insert(t)
            .select();
        
        if (error) {
            console.error(`Error inserting ${t.type}:`, error);
        } else {
            console.log(`Inserted ${t.type}:`, data);
        }
    }
}

insertTemplates();
