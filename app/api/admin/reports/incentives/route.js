import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const supabase = createServerSupabase();
        const { searchParams } = new URL(request.url);
        const activeMonth = searchParams.get('month'); // format: YYYY-MM

        if (!activeMonth || !/^\d{4}-\d{2}$/.test(activeMonth)) {
            return NextResponse.json({ success: false, error: 'Invalid or missing month parameter (expected YYYY-MM)' }, { status: 400 });
        }

        const [yr, mo] = activeMonth.split('-').map(Number);
        const monthEnd = new Date(yr, mo, 0).toISOString().split('T')[0];

        const historyStartObj = new Date(yr, mo - 4, 1);
        const historyStart = `${historyStartObj.getFullYear()}-${String(historyStartObj.getMonth() + 1).padStart(2, '0')}-01`;

        const [
            jobsRes,
            invoicesRes,
            quotationsRes,
            vouchersRes,
            finalizedRes
        ] = await Promise.all([
            supabase
                .from('jobs')
                .select('id, technician_id, status, scheduled_date, scheduled_time, created_at, amount, customer_id, on_way_at, arrived_at, completed_at, customer_rating, rating_note, customer_name, technician_name')
                .gte('scheduled_date', historyStart)
                .lte('scheduled_date', monthEnd),
            supabase
                .from('sales_invoices')
                .select('id, total_amount, date, job_id, technician_id, technician_name, status, account_id')
                .gte('date', historyStart)
                .lte('date', monthEnd)
                .neq('status', 'cancelled'),
            supabase
                .from('quotations')
                .select('id, status, date, technician_id, job_id')
                .gte('date', historyStart)
                .lte('date', monthEnd)
                .neq('status', 'cancelled'),
            supabase
                .from('payment_vouchers')
                .select('account_id, amount, notes, date')
                .ilike('notes', '%Incentive%'),
            supabase
                .from('website_settings')
                .select('value')
                .eq('key', `incentives-finalized-${activeMonth}`)
                .maybeSingle()
        ]);

        if (jobsRes.error) throw jobsRes.error;
        if (invoicesRes.error) throw invoicesRes.error;
        if (quotationsRes.error) throw quotationsRes.error;
        if (vouchersRes.error) throw vouchersRes.error;

        return NextResponse.json({
            success: true,
            data: {
                allJobs: jobsRes.data || [],
                allInvoices: invoicesRes.data || [],
                allQuotations: quotationsRes.data || [],
                paidVouchers: vouchersRes.data || [],
                isFinalized: !!finalizedRes.data?.value
            }
        });
    } catch (error) {
        console.error('[Admin Reports Incentives Error]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
