/**
 * Server-side interaction logger — call from any Next.js API route.
 * Writes directly to Supabase, no HTTP round-trip.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

/**
 * @param {object} opts
 * @param {string} opts.type           - Interaction type key (e.g. 'customer-login')
 * @param {string} opts.category       - Category (e.g. 'auth', 'job', 'account')
 * @param {string} [opts.customerId]
 * @param {string} [opts.customerName]
 * @param {string} [opts.jobId]
 * @param {string} [opts.invoiceId]
 * @param {string} [opts.performedBy]
 * @param {string} [opts.performedByName]
 * @param {string} [opts.description]
 * @param {object} [opts.metadata]
 * @param {string} [opts.source]       - e.g. 'Customer App', 'Website', 'Admin', 'Technician App'
 */
export async function logInteractionServer({
    type,
    category,
    customerId = null,
    customerName = null,
    jobId = null,
    propertyId = null,
    invoiceId = null,
    performedBy = null,
    performedByName = 'System',
    description = '',
    metadata = {},
    source = 'System',
}) {
    try {
        const { error } = await supabaseAdmin.from('interactions').insert({
            type,
            category,
            customer_id: customerId,
            customer_name: customerName,
            job_id: jobId,
            property_id: propertyId,
            invoice_id: invoiceId,
            performed_by: performedBy,
            performed_by_name: performedByName,
            description,
            metadata,
            source,
            status: 'completed',
            timestamp: new Date().toISOString(),
        });
        if (error) {
            console.error('[logInteractionServer] Supabase Error:', error);
        }
    } catch (err) {
        // Never throw — logging should never break the main flow
        console.error('[logInteractionServer] Failed:', err?.message);
    }
}
