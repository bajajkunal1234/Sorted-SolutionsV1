import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Fetch interactions with optional filters
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const customerId = searchParams.get('customer_id')
        const jobId = searchParams.get('job_id')
        const productId = searchParams.get('product_id')
        const propertyId = searchParams.get('property_id')
        const technicianId = searchParams.get('technician_id')
        const source = searchParams.get('source')
        const category = searchParams.get('category')
        const limit = parseInt(searchParams.get('limit') || '200', 10)

        let query = supabase
            .from('interactions')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(limit)

        if (customerId) query = query.eq('customer_id', customerId)
        if (jobId) query = query.eq('job_id', jobId)
        if (productId) query = query.eq('product_id', productId)
        if (propertyId) query = query.eq('property_id', propertyId)
        if (technicianId) query = query.eq('technician_id', technicianId)
        if (source) query = query.eq('source', source)
        if (category) query = query.eq('category', category)


        const { data, error } = await query
        if (error) throw error

        return NextResponse.json({ success: true, data: data || [] })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// POST - Create new interaction/note
export async function POST(request) {
    try {
        const body = await request.json()

        const { data, error } = await supabase
            .from('interactions')
            .insert([body])
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PATCH - Update an existing interaction
export async function PATCH(request) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: 'Interaction ID is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('interactions')
            .update({
                ...updates,
                // Don't modify timestamp here to preserve the original note creation time
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
