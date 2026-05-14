import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
    try {
        const { id } = params;

        const { data, error } = await supabase
            .from('sales_invoices')
            .select('*')
            .eq('job_id', id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching invoice for job', id, error);
            return NextResponse.json({ success: true, data: [] });
        }

        return NextResponse.json({ success: true, data: data || [] });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
