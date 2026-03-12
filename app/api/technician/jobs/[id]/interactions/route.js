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
            .order('created_at', { ascending: false });

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

        const interactionPayload = {
            job_id: jobId,
            customer_id: body.customer_id || null, // Optional, can be supplied from frontend
            type: body.type || 'note-added',
            category: body.category || 'communication',
            description: body.description,
            user_name: body.user_name || 'Technician',
            source: 'Technician App',
            metadata: body.metadata || {}
        };

        const { data, error } = await supabase
            .from('interactions')
            .insert([interactionPayload])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error creating job interaction:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to save interaction' },
            { status: 500 }
        );
    }
}
