import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/technician/location
 * Silent background location ping — called every 60s/5m by the technician app.
 * Upserts the technician's current position into technician_live_locations.
 * No UI acknowledgement needed.
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const {
            technician_id,
            latitude,
            longitude,
            is_on_job,
            tracking_source,
            is_online,
            location_precision,
            session_token,
            battery_level,
            connectivity_status,
            is_mocked
        } = body

        if (!technician_id || !latitude || !longitude) {
            return NextResponse.json({ ok: false }, { status: 400 })
        }

        // Get header session token fallback
        const headerToken = request.headers.get('x-session-token')
        const finalToken = session_token || headerToken

        // Validate active session
        const { data: tech, error: techError } = await supabase
            .from('technicians')
            .select('current_session_token')
            .eq('id', technician_id)
            .single()

        if (techError || !tech || !tech.current_session_token || tech.current_session_token !== finalToken) {
            return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 })
        }

        // Extract client IP address
        let clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
        if (clientIp.includes(',')) {
            clientIp = clientIp.split(',')[0].trim()
        }

        // Server-side Time & Working Hours Gating (Anti-Clock Spoofing)
        // working hours: 8:00 AM to 9:00 PM IST
        const serverTime = new Date()
        const istOffset = 5.5 * 60 * 60 * 1000
        const istTime = new Date(serverTime.getTime() + istOffset)
        const hours = istTime.getUTCHours()
        const isWorkingHours = hours >= 8 && hours < 21

        let finalIsOnline = is_online !== false
        let finalPrecision = location_precision || 'precise'

        if (!isWorkingHours) {
            finalIsOnline = false
            finalPrecision = 'approx'
        }

        const { error } = await supabase
            .from('technician_live_locations')
            .upsert(
                {
                    technician_id,
                    latitude,
                    longitude,
                    is_on_job: !!is_on_job,
                    tracking_source: tracking_source || 'web',
                    is_online: finalIsOnline,
                    location_precision: finalPrecision,
                    ip_address: clientIp,
                    battery_level: battery_level !== undefined ? battery_level : null,
                    connectivity_status: connectivity_status || null,
                    is_mocked: !!is_mocked,
                    updated_at: serverTime.toISOString(),
                },
                { onConflict: 'technician_id' }
            )

        if (error) throw error

        // Also insert into historical logs for routing & timeline review
        const { error: logError } = await supabase
            .from('technician_location_logs')
            .insert({
                technician_id,
                latitude,
                longitude,
                is_on_job: !!is_on_job,
                tracking_source: tracking_source || 'web',
                is_online: finalIsOnline,
                location_precision: finalPrecision,
                battery_level: battery_level !== undefined ? battery_level : null,
                connectivity_status: connectivity_status || null,
                is_mocked: !!is_mocked,
                created_at: serverTime.toISOString()
            })

        if (logError) {
            console.warn('Failed to insert technician location historical log:', logError.message)
        }

        return NextResponse.json({ ok: true })
    } catch (err) {
        return NextResponse.json({ ok: false }, { status: 500 })
    }
}
