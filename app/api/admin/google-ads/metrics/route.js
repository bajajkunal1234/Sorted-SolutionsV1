import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/admin/google-ads/metrics
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '90');

        const supabase = createServerSupabase();
        if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

        const { data, error } = await supabase
            .from('google_ads_daily_metrics')
            .select('*')
            .order('date', { ascending: false })
            .limit(limit);

        if (error) throw error;

        // Return sorted ascending for charts, but return the raw data
        const sortedData = [...(data || [])].reverse();

        return NextResponse.json({ success: true, data: sortedData });
    } catch (error) {
        console.error('[google-ads/metrics GET error]', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST /api/admin/google-ads/metrics (Upsert)
export async function POST(request) {
    try {
        const body = await request.json();
        const { date, amount_spent, clicks, impressions, conversions_recorded } = body;

        if (!date) {
            return NextResponse.json({ success: false, error: 'Date is required' }, { status: 400 });
        }

        const supabase = createServerSupabase();
        if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

        const { data, error } = await supabase
            .from('google_ads_daily_metrics')
            .upsert({
                date,
                amount_spent: parseFloat(amount_spent || '0'),
                clicks: parseInt(clicks || '0'),
                impressions: parseInt(impressions || '0'),
                conversions_recorded: parseInt(conversions_recorded || '0')
            }, { onConflict: 'date' })
            .select('*')
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('[google-ads/metrics POST error]', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// DELETE /api/admin/google-ads/metrics
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');

        if (!date) {
            return NextResponse.json({ success: false, error: 'Date is required' }, { status: 400 });
        }

        const supabase = createServerSupabase();
        if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

        const { error } = await supabase
            .from('google_ads_daily_metrics')
            .delete()
            .eq('date', date);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[google-ads/metrics DELETE error]', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
