import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/fleet-locations
 * Returns all technicians who have sent a location in the last 15 minutes.
 * Joins with technicians table for name.
 * Used by admin fleet map to show all online staff regardless of job status.
 */
export async function GET() {
    try {
        const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15 min ago

        const { data, error } = await supabase
            .from('technician_live_locations')
            .select('technician_id, latitude, longitude, is_on_job, updated_at')
            .gte('updated_at', cutoff)
            .order('updated_at', { ascending: false })

        if (error) throw error

        // Enrich with technician names
        const ids = (data || []).map(r => r.technician_id)
        let nameMap = {}
        if (ids.length > 0) {
            const { data: techs } = await supabase
                .from('technicians')
                .select('id, name')
                .in('id', ids)
            for (const t of techs || []) nameMap[t.id] = t.name
        }

        const enriched = (data || []).map(r => ({
            technician_id: r.technician_id,
            name: nameMap[r.technician_id] || 'Technician',
            latitude: r.latitude,
            longitude: r.longitude,
            is_on_job: r.is_on_job,
            last_seen: r.updated_at,
            // seconds since last ping
            seconds_ago: Math.round((Date.now() - new Date(r.updated_at).getTime()) / 1000),
        }))

        return NextResponse.json({ success: true, data: enriched, total: enriched.length })
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}
