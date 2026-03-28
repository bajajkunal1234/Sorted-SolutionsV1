import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/technician/location
 * Silent background location ping — called every 60s by the technician app.
 * Upserts the technician's current position into technician_live_locations.
 * No UI acknowledgement needed.
 */
export async function POST(request) {
    try {
        const { technician_id, latitude, longitude, is_on_job } = await request.json()

        if (!technician_id || !latitude || !longitude) {
            return NextResponse.json({ ok: false }, { status: 400 })
        }

        const { error } = await supabase
            .from('technician_live_locations')
            .upsert(
                {
                    technician_id,
                    latitude,
                    longitude,
                    is_on_job: !!is_on_job,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'technician_id' }
            )

        if (error) throw error

        return NextResponse.json({ ok: true })
    } catch (err) {
        // Fail silently — don't alert technician
        return NextResponse.json({ ok: false }, { status: 500 })
    }
}
