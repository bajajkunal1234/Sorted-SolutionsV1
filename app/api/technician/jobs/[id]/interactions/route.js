import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET all interactions for a specific job
export async function GET(request, { params }) {
    try {
        const { id: jobId } = params;

        const { data, error } = await supabase
            .from('interactions')
            .select('*')
            .eq('job_id', jobId)
            .order('timestamp', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Error fetching job interactions:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch job interactions' },
            { status: 500 }
        );
    }
}

// POST a new interaction (note/update) for a specific job
export async function POST(request, { params }) {
    try {
        const { id: jobId } = params;
        const body = await request.json();

        // Validate required fields
        if (!body.description) {
            return NextResponse.json(
                { success: false, error: 'Description is required' },
                { status: 400 }
            );
        }

        const metadata = body.metadata || {};
        if (metadata.latitude && metadata.longitude && !metadata.locality) {
            try {
                const geoRes = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${metadata.latitude}&lon=${metadata.longitude}&format=json`,
                    { headers: { 'Accept-Language': 'en', 'User-Agent': 'SortedSolutions/1.0' } }
                );
                if (geoRes.ok) {
                    const geo = await geoRes.json();
                    const addr = geo.address || {};
                    const loc = addr.suburb || addr.neighbourhood || addr.quarter || addr.village || addr.subdivision || addr.locality || addr.city_district || null;
                    if (loc) {
                        metadata.locality = loc;
                    }
                }
            } catch (geoErr) {
                console.error('[interactions POST] Geocoding error:', geoErr);
            }
        }

        const interactionPayload = {
            job_id: jobId,
            customer_id: body.customer_id || null,
            type: body.type || 'note-added',
            category: body.category || 'communication',
            description: body.description,
            performed_by_name: body.user_name || body.performedByName || body.performed_by_name || 'Technician',
            performed_by: body.performedBy || body.performed_by || null,
            source: 'Technician App',
            metadata: metadata,
            timestamp: new Date().toISOString()
        };

        let result = await supabase
            .from('interactions')
            .insert([interactionPayload])
            .select()
            .single();

        // If metadata column doesn't exist, retry without it
        if (result.error?.message?.includes('metadata') || result.error?.code === '42703') {
            console.warn('metadata column not found, retrying without it');
            const { metadata: _dropped, ...payloadWithoutMeta } = interactionPayload;
            result = await supabase
                .from('interactions')
                .insert([payloadWithoutMeta])
                .select()
                .single();
        }

        if (result.error) {
            console.error('Supabase insert error:', result.error);
            return NextResponse.json(
                { success: false, error: result.error.message || 'Failed to save interaction' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data: result.data });
    } catch (error) {
        console.error('Error creating job interaction:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to save interaction' },
            { status: 500 }
        );
    }
}
