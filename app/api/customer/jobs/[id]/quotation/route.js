import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/customer/jobs/[id]/quotation
 * Returns the most recent quotation linked to a job.
 */
export async function GET(request, { params }) {
    const supabase = createServerSupabase();
    const jobId = params.id;

    if (!jobId) {
        return NextResponse.json({ success: false, error: 'Job ID required' }, { status: 400 });
    }

    try {
        const { data: quotation, error } = await supabase
            .from('quotations')
            .select('id, quote_number, total_amount, status, notes, items, date, created_at, account_id')
            .eq('job_id', jobId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !quotation) {
            return NextResponse.json({ success: false, error: 'No quotation found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, quotation });
    } catch (err) {
        console.error('[customer/jobs/quotation] Error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
