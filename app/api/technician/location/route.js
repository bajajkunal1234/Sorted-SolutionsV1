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
            duty_status,
            location_precision,
            session_token,
            battery_level,
            connectivity_status,
            is_mocked
        } = body

        if (!technician_id) {
            return NextResponse.json({ ok: false, error: 'Technician ID is required' }, { status: 400 })
        }

        // Get header session token fallback
        const headerToken = request.headers.get('x-session-token')
        const finalToken = session_token || headerToken

        // Validate active session
        const { data: tech, error: techError } = await supabase
            .from('technicians')
            .select('current_session_token, is_active, is_fired')
            .eq('id', technician_id)
            .single()

        if (techError || !tech || !tech.current_session_token || tech.current_session_token !== finalToken) {
            return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 })
        }

        if (tech.is_active === false || tech.is_fired === true) {
            return NextResponse.json({ error: 'Location tracking disabled' }, { status: 403 })
        }

        // Extract client IP address
        let clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
        if (clientIp.includes(',')) {
            clientIp = clientIp.split(',')[0].trim()
        }

        const serverTime = new Date()
        const finalIsOnline = is_online !== false
        const finalPrecision = location_precision || 'precise'
        const hasCoords = latitude != null && longitude != null && !isNaN(Number(latitude)) && !isNaN(Number(longitude))

        // Build upsert payload
        const updatePayload = {
            technician_id,
            is_on_job: !!is_on_job,
            tracking_source: tracking_source || 'web',
            is_online: finalIsOnline,
            location_precision: finalPrecision,
            ip_address: clientIp,
            updated_at: serverTime.toISOString(),
        }

        if (hasCoords) {
            updatePayload.latitude = Number(latitude)
            updatePayload.longitude = Number(longitude)
        }

        if (duty_status) {
            updatePayload.duty_status = duty_status
        } else if (finalIsOnline && !is_on_job) {
            // Keep on_duty default if online
            updatePayload.duty_status = 'on_duty'
        }

        if (battery_level !== undefined && battery_level !== null && !isNaN(Number(battery_level))) {
            updatePayload.battery_level = Number(battery_level)
        }

        if (connectivity_status) {
            updatePayload.connectivity_status = connectivity_status
        }

        if (is_mocked !== undefined) {
            updatePayload.is_mocked = !!is_mocked
        }

        // If coordinates are missing, check if technician already has a row so we don't fail null constraints
        if (!hasCoords) {
            const { data: existingLoc } = await supabase
                .from('technician_live_locations')
                .select('latitude, longitude')
                .eq('technician_id', technician_id)
                .maybeSingle()

            if (existingLoc && existingLoc.latitude != null && existingLoc.longitude != null) {
                updatePayload.latitude = existingLoc.latitude
                updatePayload.longitude = existingLoc.longitude
            }
        }

        // Only upsert if we have coordinates (either fresh or preserved)
        if (updatePayload.latitude != null && updatePayload.longitude != null) {
            const { error } = await supabase
                .from('technician_live_locations')
                .upsert(updatePayload, { onConflict: 'technician_id' })

            if (error) throw error
        } else {
            // Update other columns directly
            const { error } = await supabase
                .from('technician_live_locations')
                .update(updatePayload)
                .eq('technician_id', technician_id)

            if (error) throw error
        }

        // Also insert into historical logs for routing & timeline review if valid coordinates exist
        if (hasCoords) {
            const { error: logError } = await supabase
                .from('technician_location_logs')
                .insert({
                    technician_id,
                    latitude: Number(latitude),
                    longitude: Number(longitude),
                    is_on_job: !!is_on_job,
                    tracking_source: tracking_source || 'web',
                    is_online: finalIsOnline,
                    location_precision: finalPrecision,
                    battery_level: battery_level !== undefined && battery_level !== null ? Number(battery_level) : null,
                    connectivity_status: connectivity_status || null,
                    is_mocked: !!is_mocked,
                    created_at: serverTime.toISOString()
                })

            if (logError) {
                console.warn('Failed to insert technician location historical log:', logError.message)
            }
        }

        return NextResponse.json({ ok: true })
    } catch (err) {
        return NextResponse.json({ ok: false }, { status: 500 })
    }
}
