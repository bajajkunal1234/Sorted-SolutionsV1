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
        const { data, error } = await supabase
            .from('technician_live_locations')
            .select('technician_id, latitude, longitude, is_on_job, tracking_source, updated_at, is_online, location_precision, ip_address, battery_level, connectivity_status, is_mocked')
            .not('latitude', 'is', null)
            .order('updated_at', { ascending: false })

        if (error) throw error

        // Enrich with technician details
        const ids = (data || []).map(r => r.technician_id)
        let techMap = {}
        if (ids.length > 0) {
            const { data: techs } = await supabase
                .from('technicians')
                .select('id, name, current_session_token, is_active')
                .in('id', ids)
            for (const t of techs || []) {
                techMap[t.id] = { 
                    name: t.name, 
                    current_session_token: t.current_session_token,
                    is_active: t.is_active !== false
                }
            }
        }

        const enriched = (data || [])
            .filter(r => techMap[r.technician_id] && techMap[r.technician_id].is_active)
            .map(r => ({
                technician_id: r.technician_id,
                name: techMap[r.technician_id]?.name || 'Technician',
                current_session_token: techMap[r.technician_id]?.current_session_token || null,
                latitude: r.latitude,
                longitude: r.longitude,
                is_on_job: r.is_on_job,
                tracking_source: r.tracking_source || 'web',
                last_seen: r.updated_at,
                is_online: r.is_online !== false,
                location_precision: r.location_precision || 'precise',
                ip_address: r.ip_address,
                battery_level: r.battery_level,
                connectivity_status: r.connectivity_status,
                is_mocked: !!r.is_mocked,
                // seconds since last ping
                seconds_ago: Math.round((Date.now() - new Date(r.updated_at).getTime()) / 1000),
            }))

        return NextResponse.json({ success: true, data: enriched, total: enriched.length })
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}
