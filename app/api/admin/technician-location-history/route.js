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

            let logs = []
            let page = 0
            const pageSize = 1000
            let hasMore = true

            while (hasMore) {
                const offset = page * pageSize
                const { data: pageLogs, error: logsError } = await supabase
                    .from('technician_location_logs')
                    .select('latitude, longitude, created_at, location_precision')
                    .eq('technician_id', technicianId)
                    .gte('created_at', startMonth.toISOString())
                    .lte('created_at', endMonth.toISOString())
                    .order('created_at', { ascending: true })
                    .range(offset, offset + pageSize - 1)

                if (logsError) throw logsError
                if (!pageLogs || pageLogs.length === 0) {
                    hasMore = false
                } else {
                    logs = logs.concat(pageLogs)
                    if (pageLogs.length < pageSize) {
                        hasMore = false
                    }
                }
                page++
            }

            // Group logs by day and calculate total distance
            const dailyDistances = {}
            const pointsByDay = {}

            logs.forEach(log => {
                // Ignore approximate triangulation pings from distance calculation
                if (log.location_precision === 'approx') return;

                // Format in local Indian timezone
                const dateIST = new Date(log.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
                if (!pointsByDay[dateIST]) {
                    pointsByDay[dateIST] = []
                }
                pointsByDay[dateIST].push({ lat: log.latitude, lng: log.longitude, time: log.created_at })
            })

            for (const [day, pts] of Object.entries(pointsByDay)) {
                let dist = 0
                for (let i = 1; i < pts.length; i++) {
                    const prev = pts[i-1];
                    const curr = pts[i];
                    const segmentDist = getDistance(prev.lat, prev.lng, curr.lat, curr.lng);
                    
                    const timeDiffSec = (new Date(curr.time) - new Date(prev.time)) / 1000;
                    const speedKmh = timeDiffSec > 0 ? (segmentDist / 1000) / (timeDiffSec / 3600) : 0;
                    
                    if (speedKmh <= 100) {
                        dist += segmentDist;
                    }
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
        let logs = []
        let dailyPage = 0
        const dailyPageSize = 1000
        let dailyHasMore = true

        while (dailyHasMore) {
            const offset = dailyPage * dailyPageSize
            const { data: pageLogs, error: logsError } = await supabase
                .from('technician_location_logs')
                .select('*')
                .eq('technician_id', technicianId)
                .gte('created_at', startIST.toISOString())
                .lte('created_at', endIST.toISOString())
                .order('created_at', { ascending: true })
                .range(offset, offset + dailyPageSize - 1)

            if (logsError) throw logsError
            if (!pageLogs || pageLogs.length === 0) {
                dailyHasMore = false
            } else {
                logs = logs.concat(pageLogs)
                if (pageLogs.length < dailyPageSize) {
                    dailyHasMore = false
                }
            }
            dailyPage++
        }

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

        // 3. Fetch all jobs assigned to this technician
        // This ensures we get both:
        //  - Today's scheduled/updated jobs (for timeline)
        //  - All active outstanding jobs (for map markers)
        const { data: allJobsData, error: jobsError } = await supabase
            .from('jobs')
            .select('*')
            .eq('technician_id', technicianId)

        if (jobsError) throw jobsError

        const fortyEightHoursAgo = new Date(startIST.getTime() - 48 * 60 * 60 * 1000);

        const rawJobs = (allJobsData || []).filter(j => {
            const isToday = j.scheduled_date === date || new Date(j.updated_at) >= startIST;
            const isActive = j.status !== 'closed' && j.status !== 'cancelled';
            const isRecentClosedCancelled = (j.status === 'closed' || j.status === 'cancelled') && new Date(j.updated_at) >= fortyEightHoursAgo;
            return isToday || isActive || isRecentClosedCancelled;
        });

        // Fetch technician name
        const { data: tech } = await supabase
            .from('technicians')
            .select('name')
            .eq('id', technicianId)
            .maybeSingle()
        const techName = tech?.name || 'Technician'

        // Fetch suppliers list
        const { data: rawSuppliers } = await supabase
            .from('accounts')
            .select('*')
            .or('type.eq.supplier,type.eq.vendor,under.ilike.%supplier%,under.ilike.%vendor%,under.ilike.%creditor%')
        const suppliers = rawSuppliers || []

        // Resolve properties and customers manually to bypass Supabase schema relationship cache blocks
        let enrichedJobs = []
        if (rawJobs && rawJobs.length > 0) {
            const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            const propertyIds = rawJobs.map(j => j.property?.id || j.property_id).filter(id => id && UUID_REGEX.test(id))
            const customerIds = rawJobs.map(j => j.customer_id).filter(id => id && UUID_REGEX.test(id))

            let properties = []
            if (propertyIds.length > 0) {
                const { data: props, error: propsError } = await supabase
                    .from('properties')
                    .select('*')
                    .in('id', propertyIds)
                if (!propsError && props) {
                    properties = props
                } else if (propsError) {
                    console.error("Timeline API Debug - propsError:", propsError)
                }
            }

            let customers = []
            if (customerIds.length > 0) {
                const { data: custs, error: custsError } = await supabase
                    .from('accounts')
                    .select('*')
                    .in('id', customerIds)
                if (!custsError && custs) {
                    customers = custs
                }
            }

            const jobsPromises = rawJobs.map(async job => {
                const propId = job.property?.id || job.property_id
                let prop = (propId && UUID_REGEX.test(propId)) ? properties.find(p => p.id === propId) : null
                
                // Fallback to inline JSONB property if DB lookup was null or wasn't a valid DB UUID
                if (!prop && job.property) {
                    prop = {
                        id: job.property.id,
                        address: job.property.address,
                        flat_number: job.property.flat_number,
                        building_name: job.property.building_name,
                        locality: job.property.locality,
                        city: job.property.city || 'Mumbai',
                        pincode: job.property.pincode,
                        location: (job.property.latitude && job.property.longitude) ? {
                            lat: parseFloat(job.property.latitude),
                            lng: parseFloat(job.property.longitude)
                        } : null
                    }
                } else if (prop) {
                    prop = {
                        ...prop,
                        location: (prop.latitude && prop.longitude) ? {
                            lat: parseFloat(prop.latitude),
                            lng: parseFloat(prop.longitude)
                        } : null
                    }
                }

                const cust = (job.customer_id && UUID_REGEX.test(job.customer_id)) ? customers.find(c => c.id === job.customer_id) : null

                // Fallback: Resolve coordinate from customer's account properties list if missing
                if (prop && !prop.location && cust && Array.isArray(cust.properties)) {
                    const matchById = cust.properties.find(p => String(p.id) === String(propId || job.property?.id))
                    if (matchById && (matchById.lat || matchById.latitude)) {
                        prop.location = {
                            lat: Number(matchById.lat || matchById.latitude),
                            lng: Number(matchById.lng || matchById.longitude)
                        }
                    } else {
                        const matchByDetails = cust.properties.find(p => 
                            (p.building_name && prop.building_name && String(p.building_name).trim().toLowerCase() === String(prop.building_name).trim().toLowerCase()) ||
                            (p.address && prop.address && String(p.address).trim().toLowerCase() === String(prop.address).trim().toLowerCase())
                        )
                        if (matchByDetails && (matchByDetails.lat || matchByDetails.latitude)) {
                            prop.location = {
                                lat: Number(matchByDetails.lat || matchByDetails.latitude),
                                lng: Number(matchByDetails.lng || matchByDetails.longitude)
                            }
                        } else {
                            const firstWithCoords = cust.properties.find(p => p.lat || p.latitude)
                            if (firstWithCoords) {
                                prop.location = {
                                    lat: Number(firstWithCoords.lat || firstWithCoords.latitude),
                                    lng: Number(firstWithCoords.lng || firstWithCoords.longitude)
                                }
                            }
                        }
                    }
                }

                // Final Fallback: Geocode on the fly using Google Geocoding API if coordinates are still missing
                if (prop && !prop.location) {
                    const geocodeKey = process.env.GOOGLE_GEOCODING_API_KEY
                    if (geocodeKey) {
                        const building = prop.building_name || ''
                        const street = prop.address || ''
                        const locality = prop.locality || ''
                        const pincode = prop.pincode || ''
                        const city = prop.city || 'Mumbai'

                        const queries = []
                        if (building && street && locality) queries.push(`${building}, ${street}, ${locality}, ${city}, India`)
                        if (building && locality)           queries.push(`${building}, ${locality}, ${city}, India`)
                        if (street && locality)             queries.push(`${street}, ${locality}, ${city}, India`)
                        if (locality)                       queries.push(`${locality}, ${city}, India`)
                        if (pincode)                        queries.push(`${pincode}, India`)

                        for (const q of queries) {
                            try {
                                const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${geocodeKey}&region=in&components=country:IN`
                                const res = await fetch(url)
                                const data = await res.json()
                                if (data.status === 'OK' && data.results.length > 0) {
                                    const { lat, lng } = data.results[0].geometry.location
                                    prop.location = { lat, lng }
                                    
                                    // Asynchronously save back to properties table
                                    if (prop.id && UUID_REGEX.test(prop.id) && !prop.id.startsWith('inline')) {
                                        supabase.from('properties')
                                            .update({ latitude: lat, longitude: lng })
                                            .eq('id', prop.id)
                                            .then(() => {})
                                    }
                                    break
                                }
                            } catch (e) {
                                console.error("On-the-fly geocoding failed:", e)
                            }
                        }
                    }
                }

                return {
                    ...job,
                    properties: prop,
                    customers: cust
                }
            })

            enrichedJobs = await Promise.all(jobsPromises)
        }

        const jobs = enrichedJobs

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
        
        // Filter out approximate triangulation/cell-tower pings to keep route lines clean
        const cleanLogs = (logs || []).filter(log => log.location_precision !== 'approx');
        
        // If everything is approximate (fallback), use all logs so we don't display empty map
        const finalRouteLogs = cleanLogs.length > 0 ? cleanLogs : (logs || []);

        const routePath = finalRouteLogs.map(log => ({
            lat: log.latitude,
            lng: log.longitude,
            time: log.created_at,
            isOnJob: log.is_on_job
        }))

        // Calculate total distance traveled, filtering out physically impossible jumps (> 100 km/h)
        for (let i = 1; i < routePath.length; i++) {
            const prev = routePath[i-1];
            const curr = routePath[i];
            const dist = getDistance(prev.lat, prev.lng, curr.lat, curr.lng);
            
            const timeDiffSec = (new Date(curr.time) - new Date(prev.time)) / 1000;
            const speedKmh = timeDiffSec > 0 ? (dist / 1000) / (timeDiffSec / 3600) : 0;
            
            if (speedKmh <= 100) {
                totalDistance += dist;
            }
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

            // Only return location if the nearest ping is within 15 minutes of the action
            if (minDelta > 15 * 60 * 1000) return null

            return closestPt
        }

        // A. Add Shift Start & End
        if (routePath.length > 0) {
            timeline.push({
                type: 'shift_start',
                time: routePath[0].time,
                title: 'Start of Day',
                description: `${techName} phone GPS registered initial log.`,
                lat: routePath[0].lat,
                lng: routePath[0].lng
            })
            if (routePath.length > 1) {
                timeline.push({
                    type: 'shift_end',
                    time: routePath[routePath.length - 1].time,
                    title: 'End of Day',
                    description: `${techName} phone GPS registered final log of the day.`,
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

            // Audit distance only for actual technician actions
            const isTechAction = 
                ji.user_name?.toLowerCase().includes('technician') || 
                ji.message?.toLowerCase().includes('by technician') ||
                ji.type === 'on-way' || 
                ji.type === 'on_way' || 
                ji.type === 'arrived';

            if (isTechAction && job && job.properties && job.properties.location) {
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
                            const isArrived = ji.type === 'arrived' || ji.message?.toLowerCase().includes('arrived') || ji.message?.toLowerCase().includes('diagnosing_quoting');
                            const isOnWay = ji.type === 'on-way' || ji.type === 'on_way' || ji.message?.toLowerCase().includes('on the way');
                            const isQuotation = ji.type === 'quotation_created' || ji.message?.toLowerCase().includes('quotation');
                            const isComplete = ji.type === 'complete_job' || ji.type === 'complete-job' || ji.message?.toLowerCase().includes('complete') || ji.message?.toLowerCase().includes('closed');

                            if (isArrived) {
                                warning = `Marked arrived away from customer's site. Distance was ${(distMeters / 1000).toFixed(2)} km away.`
                            } else if (isOnWay) {
                                warning = `Started on-way before reaching customer site. Distance was ${(distMeters / 1000).toFixed(2)} km away.`
                            } else if (isQuotation) {
                                warning = `Created quotation away from customer's site. Distance was ${(distMeters / 1000).toFixed(2)} km away.`
                            } else if (isComplete) {
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
                description: (ji.message || `Performed interaction on job`).replace(/\bTechnician\b/g, techName).replace(/\btechnician\b/g, techName),
                warning: warning,
                lat: lat,
                lng: lng,
                jobId: ji.job_id
            })
        })

        // D. Add Calls and general actions
        interactions.forEach(int => {
            const techLoc = getTechLocAtTime(int.timestamp)
            const job = jobs.find(j => j.id === int.job_id)
            const jobNum = job ? job.job_number : null
            
            let desc = int.description || 'Performed action'
            if (int.customer_name) {
                if (desc.toLowerCase().includes('called the customer')) {
                    desc = `${techName} called customer ${int.customer_name}${jobNum ? ` for ${jobNum}` : ''}`
                } else if (!desc.includes(int.customer_name)) {
                    desc = `${desc} (${int.customer_name}${jobNum ? `, ${jobNum}` : ''})`
                }
            } else if (jobNum && !desc.includes(jobNum)) {
                desc = `${desc} (${jobNum})`
            }

            desc = desc.replace(/\bTechnician\b/g, techName).replace(/\btechnician\b/g, techName);

            timeline.push({
                type: 'interaction',
                time: int.timestamp,
                title: int.type === 'call' || int.type === 'customer-called' ? `Called Customer` : int.category || 'Interaction',
                description: desc,
                lat: techLoc ? techLoc.lat : null,
                lng: techLoc ? techLoc.lng : null,
                customerId: int.customer_id,
                customerName: int.customer_name
            })
        })

        // Sort timeline chronologically
        timeline.sort((a, b) => new Date(a.time) - new Date(b.time))

        // 7.5 Detect resource wastage stops and trigger alerts
        const getSupplierCoordinates = (supplier) => {
            if (!supplier) return null
            const props = supplier.properties
            if (Array.isArray(props) && props.length > 0) {
                const first = props.find(p => p.lat || p.latitude)
                if (first) {
                    return {
                        lat: Number(first.lat || first.latitude),
                        lng: Number(first.lng || first.longitude)
                    }
                }
            }
            return null
        }

        const wastageStops = []
        stops.forEach(stop => {
            if (stop.durationMinutes > 20) {
                let nearJob = false
                jobs.forEach(job => {
                    const loc = job.properties?.location
                    if (loc) {
                        const jobLat = loc.lat || loc.latitude
                        const jobLng = loc.lng || loc.longitude
                        if (jobLat && jobLng) {
                            const dist = getDistance(stop.lat, stop.lng, jobLat, jobLng)
                            if (dist <= 200) nearJob = true
                        }
                    }
                })

                let nearSupplier = false
                suppliers.forEach(supplier => {
                    const coords = getSupplierCoordinates(supplier)
                    if (coords) {
                        const dist = getDistance(stop.lat, stop.lng, coords.lat, coords.lng)
                        if (dist <= 200) nearSupplier = true
                    }
                })

                if (!nearJob && !nearSupplier) {
                    wastageStops.push(stop)
                }
            }
        })

        if (wastageStops.length > 0) {
            for (const stop of wastageStops) {
                const link = `/admin?tab=reports&subtab=timeline&tech=${technicianId}&date=${date}&stop=${stop.arrivalTime}`
                
                // Check if already notified
                const { data: existingNotif } = await supabase
                    .from('app_notifications')
                    .select('id')
                    .eq('link', link)
                    .limit(1)

                if (!existingNotif || existingNotif.length === 0) {
                    // Reverse geocode place name using Google Maps API key
                    let placeName = `Stop near [${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}]`
                    const geocodeKey = process.env.GOOGLE_GEOCODING_API_KEY
                    if (geocodeKey) {
                        try {
                            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${stop.lat},${stop.lng}&key=${geocodeKey}`
                            const res = await fetch(url)
                            const data = await res.json()
                            if (data.status === 'OK' && data.results.length > 0) {
                                const addrComponents = data.results[0].address_components
                                const building = addrComponents.find(c => c.types.includes('premise') || c.types.includes('subpremise') || c.types.includes('point_of_interest'))?.long_name
                                const routeName = addrComponents.find(c => c.types.includes('route'))?.long_name
                                const sublocality = addrComponents.find(c => c.types.includes('sublocality_level_1') || c.types.includes('sublocality'))?.long_name
                                
                                const parts = [building, routeName, sublocality].filter(Boolean)
                                if (parts.length > 0) {
                                    placeName = parts.join(', ')
                                } else {
                                    placeName = data.results[0].formatted_address
                                }
                            }
                        } catch (e) {
                            console.error("Reverse geocoding error in timeline API:", e)
                        }
                    }

                    const formatDuration = (totalMins) => {
                        if (!totalMins) return '0 mins'
                        const hrs = Math.floor(totalMins / 60)
                        const mins = totalMins % 60
                        if (hrs > 0) {
                            return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins > 0 ? `${mins} min${mins > 1 ? 's' : ''}` : ''}`.trim()
                        }
                        return `${mins} min${mins > 1 ? 's' : ''}`
                    }

                    // Save resource wastage alert to DB
                    const { error: insertErr } = await supabase.from('app_notifications').insert({
                        recipient_type: 'admin',
                        recipient_id: 'admin',
                        title: `⚠️ Resource Wastage Alert: ${techName}`,
                        message: `${techName} spent ${formatDuration(stop.durationMinutes)} idling at ${placeName} on ${date}.`,
                        link: link,
                        is_read: false
                    })
                    if (insertErr) {
                        console.error("Error inserting wastage notification:", insertErr)
                    }

                    // Broadcast realtime update
                    try {
                        const channel = supabase.channel('realtime:admin_updates')
                        channel.subscribe((subStatus) => {
                            if (subStatus === 'SUBSCRIBED') {
                                channel.send({
                                    type: 'broadcast',
                                    event: 'notification_received',
                                    payload: { title: `⚠️ Resource Wastage Alert: ${techName}` }
                                }).then(() => supabase.removeChannel(channel))
                            }
                        })
                    } catch (broadcastErr) {
                        console.error("Broadcast failed:", broadcastErr)
                    }
                }
            }
        }

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
                    status: j.status,
                    customerName: j.customers?.name || j.customer_name || 'N/A',
                    propertyLocation: j.properties?.location || null,
                    address: [j.properties?.flat_number, j.properties?.building_name, j.properties?.address].filter(Boolean).join(', ').trim() || j.property?.address || ''
                }))
            }
        })
    } catch (err) {
        console.error('Timeline API exception:', err)
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}
