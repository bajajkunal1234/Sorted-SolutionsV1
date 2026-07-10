import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Helper: Calculate distance between coordinates (Haversine formula) in meters
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * GET /api/admin/technician-location-history
 * Params:
 *  - technicianId: UUID of the technician
 *  - date: YYYY-MM-DD (IST local date)
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const technicianId = searchParams.get('technicianId')
        const date = searchParams.get('date') // e.g. 2026-07-09
        const month = searchParams.get('month') // e.g. 2026-07

        if (!technicianId) {
            return NextResponse.json({ success: false, error: 'technicianId parameter is required' }, { status: 400 })
        }

        // Handle Monthly distance summary request
        if (month) {
            const startMonth = new Date(`${month}-01T00:00:00+05:30`)
            // Get end of month: next month first day minus 1 second
            const year = parseInt(month.split('-')[0])
            const m = parseInt(month.split('-')[1])
            const endMonth = new Date(year, m, 0, 23, 59, 59) // End of this month local timezone

            const { data: logs, error: logsError } = await supabase
                .from('technician_location_logs')
                .select('latitude, longitude, created_at')
                .eq('technician_id', technicianId)
                .gte('created_at', startMonth.toISOString())
                .lte('created_at', endMonth.toISOString())
                .order('created_at', { ascending: true })

            if (logsError) throw logsError

            // Group logs by day and calculate total distance
            const dailyDistances = {}
            const pointsByDay = {}

            logs.forEach(log => {
                // Format in local Indian timezone
                const dateIST = new Date(log.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
                if (!pointsByDay[dateIST]) {
                    pointsByDay[dateIST] = []
                }
                pointsByDay[dateIST].push({ lat: log.latitude, lng: log.longitude })
            })

            for (const [day, pts] of Object.entries(pointsByDay)) {
                let dist = 0
                for (let i = 1; i < pts.length; i++) {
                    dist += getDistance(pts[i-1].lat, pts[i-1].lng, pts[i].lat, pts[i].lng)
                }
                dailyDistances[day] = Number((dist / 1000).toFixed(1))
            }

            return NextResponse.json({ success: true, data: dailyDistances })
        }

        if (!date) {
            return NextResponse.json({ success: false, error: 'Either date or month parameter must be specified' }, { status: 400 })
        }

        // 1. Convert IST day boundary to UTC equivalent
        // 2026-07-09 00:00:00 IST -> 2026-07-08 18:30:00 UTC
        // 2026-07-09 23:59:59 IST -> 2026-07-09 18:29:59 UTC
        const startIST = new Date(`${date}T00:00:00+05:30`)
        const endIST = new Date(`${date}T23:59:59+05:30`)

        // 2. Fetch all location pings for that day
        const { data: logsData, error: logsError } = await supabase
            .from('technician_location_logs')
            .select('*')
            .eq('technician_id', technicianId)
            .gte('created_at', startIST.toISOString())
            .lte('created_at', endIST.toISOString())
            .order('created_at', { ascending: true })

        if (logsError) throw logsError

        let logs = logsData || []

        // Fallback: If no logs found for today, check the latest live location of the technician
        if (logs.length === 0) {
            const { data: liveLoc, error: liveLocError } = await supabase
                .from('technician_live_locations')
                .select('*')
                .eq('technician_id', technicianId)
                .maybeSingle()

            if (!liveLocError && liveLoc) {
                logs = [{
                    latitude: liveLoc.latitude,
                    longitude: liveLoc.longitude,
                    is_on_job: liveLoc.is_on_job,
                    tracking_source: liveLoc.tracking_source,
                    is_online: liveLoc.is_online,
                    location_precision: liveLoc.location_precision,
                    battery_level: liveLoc.battery_level,
                    connectivity_status: liveLoc.connectivity_status,
                    is_mocked: liveLoc.is_mocked,
                    created_at: liveLoc.updated_at
                }]
            }
        }

        // 3. Fetch all active jobs scheduled or updated on that day for this tech
        const { data: jobs, error: jobsError } = await supabase
            .from('jobs')
            .select('*, properties(*), customers(*)')
            .eq('technician_id', technicianId)
            .or(`scheduled_date.eq.${date},updated_at.gte.${startIST.toISOString()}`)

        if (jobsError) throw jobsError

        // Extract job IDs for sub-queries
        const jobIds = (jobs || []).map(j => j.id)

        // 4. Fetch job interactions (Start, complete, checklist pings)
        let jobInteractions = []
        if (jobIds.length > 0) {
            const { data: jiData, error: jiError } = await supabase
                .from('job_interactions')
                .select('*')
                .in('job_id', jobIds)
                .gte('created_at', startIST.toISOString())
                .lte('created_at', endIST.toISOString())
                .order('created_at', { ascending: true })

            if (jiError) throw jiError
            jobInteractions = jiData || []
        }

        // 5. Fetch calls and other general activities logged in interactions
        const { data: interactions, error: intError } = await supabase
            .from('interactions')
            .select('*')
            .eq('performed_by', technicianId)
            .gte('timestamp', startIST.toISOString())
            .lte('timestamp', endIST.toISOString())
            .order('timestamp', { ascending: true })

        if (intError) throw intError

        // 6. Process Route, Total Distance and Stops (Idle Detection)
        let totalDistance = 0 // in meters
        const routePath = (logs || []).map(log => ({
            lat: log.latitude,
            lng: log.longitude,
            time: log.created_at,
            isOnJob: log.is_on_job
        }))

        // Calculate total distance traveled
        for (let i = 1; i < routePath.length; i++) {
            totalDistance += getDistance(
                routePath[i-1].lat, routePath[i-1].lng,
                routePath[i].lat, routePath[i].lng
            )
        }

        // Idle Stop Algorithm
        const stops = []
        const minStopDurationMs = 5 * 60 * 1000 // 5 minutes
        const maxStopRadiusMeters = 15 // 15 meters

        let stopStartIndex = 0
        for (let i = 1; i < routePath.length; i++) {
            const startPt = routePath[stopStartIndex]
            const currPt = routePath[i]
            const dist = getDistance(startPt.lat, startPt.lng, currPt.lat, currPt.lng)

            if (dist > maxStopRadiusMeters) {
                // Moved away, check if the duration spent at the previous area qualifies as a stop
                const duration = new Date(routePath[i-1].time) - new Date(startPt.time)
                if (duration >= minStopDurationMs) {
                    stops.push({
                        lat: startPt.lat,
                        lng: startPt.lng,
                        arrivalTime: startPt.time,
                        departureTime: routePath[i-1].time,
                        durationMinutes: Math.round(duration / 60000)
                    })
                }
                stopStartIndex = i // reset stop center
            } else if (i === routePath.length - 1) {
                // End of logs check
                const duration = new Date(currPt.time) - new Date(startPt.time)
                if (duration >= minStopDurationMs) {
                    stops.push({
                        lat: startPt.lat,
                        lng: startPt.lng,
                        arrivalTime: startPt.time,
                        departureTime: currPt.time,
                        durationMinutes: Math.round(duration / 60000)
                    })
                }
            }
        }

        // 7. Compile Timeline & Process Violations
        const timeline = []

        // Helper: Find closest technician coordinate at a given timestamp
        const getTechLocAtTime = (targetTimeStr) => {
            if (routePath.length === 0) return null
            const targetTime = new Date(targetTimeStr)
            let closestPt = routePath[0]
            let minDelta = Math.abs(new Date(closestPt.time) - targetTime)

            for (const pt of routePath) {
                const delta = Math.abs(new Date(pt.time) - targetTime)
                if (delta < minDelta) {
                    minDelta = delta
                    closestPt = pt
                }
            }
            return closestPt
        }

        // A. Add Shift Start & End
        if (routePath.length > 0) {
            timeline.push({
                type: 'shift_start',
                time: routePath[0].time,
                title: 'Start of Day',
                description: `Technician phone GPS registered initial log.`,
                lat: routePath[0].lat,
                lng: routePath[0].lng
            })
            if (routePath.length > 1) {
                timeline.push({
                    type: 'shift_end',
                    time: routePath[routePath.length - 1].time,
                    title: 'End of Day',
                    description: `Technician phone GPS registered final log of the day.`,
                    lat: routePath[routePath.length - 1].lat,
                    lng: routePath[routePath.length - 1].lng
                })
            }
        }

        // B. Add Idle/Parking Stops
        stops.forEach((stop, index) => {
            timeline.push({
                type: 'stop',
                time: stop.arrivalTime,
                title: `Stop Detected (#${index + 1})`,
                description: `Stopped for ${stop.durationMinutes} mins.`,
                duration: stop.durationMinutes,
                arrivalTime: stop.arrivalTime,
                departureTime: stop.departureTime,
                lat: stop.lat,
                lng: stop.lng
            })
        })

        // C. Add Job Interactions & Auditing Warnings
        jobInteractions.forEach(ji => {
            const job = jobs.find(j => j.id === ji.job_id)
            const jobNum = job ? job.job_number : 'Unknown Job'
            let lat = null
            let lng = null
            let warning = null

            // If we have job property coordinates, audit the location
            if (job && job.properties && job.properties.location) {
                let propLat = job.properties.location.lat || job.properties.location.latitude
                let propLng = job.properties.location.lng || job.properties.location.longitude

                if (propLat && propLng) {
                    // Get tech coordinates at the exact timestamp of the action
                    const techLoc = getTechLocAtTime(ji.created_at)
                    if (techLoc) {
                        lat = techLoc.lat
                        lng = techLoc.lng
                        const distMeters = getDistance(techLoc.lat, techLoc.lng, propLat, propLng)

                        // If distance is > 150m, flag as process violation
                        if (distMeters > 150) {
                            if (ji.type === 'start_job' || ji.type === 'on_way') {
                                warning = `Started job before reaching customer site. Distance was ${(distMeters / 1000).toFixed(2)} km away.`
                            } else if (ji.type === 'quotation_created' || ji.message?.toLowerCase().includes('quotation')) {
                                warning = `Created quotation away from customer's site. Distance was ${(distMeters / 1000).toFixed(2)} km away.`
                            } else if (ji.type === 'complete_job') {
                                warning = `Completed job away from customer's site. Distance was ${(distMeters / 1000).toFixed(2)} km away.`
                            }
                        }
                    }
                }
            }

            timeline.push({
                type: 'job_action',
                time: ji.created_at,
                title: `${jobNum} - ${ji.type?.replace(/_/g, ' ') || 'Action'}`,
                description: ji.message || `Performed interaction on job`,
                warning: warning,
                lat: lat,
                lng: lng,
                jobId: ji.job_id
            })
        })

        // D. Add Calls and general actions
        interactions.forEach(int => {
            // Find coordinates at timestamp
            const techLoc = getTechLocAtTime(int.timestamp)
            timeline.push({
                type: 'interaction',
                time: int.timestamp,
                title: int.type === 'call' ? `Called Customer` : int.category || 'Interaction',
                description: int.description || `Interaction details: ${int.status || ''}`,
                lat: techLoc ? techLoc.lat : null,
                lng: techLoc ? techLoc.lng : null,
                customerId: int.customer_id,
                customerName: int.customer_name
            })
        })

        // Sort timeline chronologically
        timeline.sort((a, b) => new Date(a.time) - new Date(b.time))

        // 8. Return response payload
        return NextResponse.json({
            success: true,
            data: {
                date,
                technicianId,
                totalDistanceKm: Number((totalDistance / 1000).toFixed(2)),
                routePath,
                stopsCount: stops.length,
                violationsCount: timeline.filter(t => t.warning).length,
                timeline,
                jobsList: (jobs || []).map(j => ({
                    id: j.id,
                    jobNumber: j.job_number,
                    category: j.category,
                    customerName: j.customers?.name || 'N/A',
                    propertyLocation: j.properties?.location || null,
                    address: [j.properties?.flat_number, j.properties?.building_name, j.properties?.address].filter(Boolean).join(', ')
                }))
            }
        })
    } catch (err) {
        console.error('Timeline API exception:', err)
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}
