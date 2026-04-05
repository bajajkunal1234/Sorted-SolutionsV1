import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/customer/jobs/[id]/invoice
 * Returns the latest unpaid (or partial) sales invoice linked to a job.
 * Used by the customer app Pay Online button to get the real amount due.
 */
export async function GET(request, { params }) {
    const supabase = createServerSupabase();
    const jobId = params.id;

    if (!jobId) {
        return NextResponse.json({ success: false, error: 'Job ID required' }, { status: 400 });
    }

    try {
        // Fetch the most recent unpaid/partial sales invoice for this job
        const { data: invoice, error } = await supabase
            .from('sales_invoices')
            .select('id, invoice_number, total_amount, paid_amount, status, account_id, date')
            .eq('job_id', jobId)
            .in('status', ['unpaid', 'partial'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !invoice) {
            // If no unpaid invoice, try fetching any invoice (even paid) so customer sees their receipt
            const { data: anyInvoice } = await supabase
                .from('sales_invoices')
                .select('id, invoice_number, total_amount, paid_amount, status, account_id, date')
                .eq('job_id', jobId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (anyInvoice) {
                return NextResponse.json({ success: true, invoice: anyInvoice });
            }

            return NextResponse.json({ success: false, error: 'No invoice found for this job' }, { status: 404 });
        }

        return NextResponse.json({ success: true, invoice });

    } catch (err) {
        console.error('[customer/jobs/invoice] Error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
