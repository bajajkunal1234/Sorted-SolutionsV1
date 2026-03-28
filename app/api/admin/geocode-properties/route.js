import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/geocode-properties
 * Returns count of properties needing geocoding.
 *
 * POST /api/admin/geocode-properties
 * Batch-geocodes all properties where latitude IS NULL.
 * Uses Google Geocoding API for high accuracy (especially for Indian addresses).
 * Falls back through: building+street+locality → street+locality → locality → pincode
 */

const GOOGLE_KEY = process.env.GOOGLE_GEOCODING_API_KEY

async function googleGeocode(query) {
    if (!query || query.trim().length < 3) return null
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_KEY}&region=in&components=country:IN`
        const res = await fetch(url)
        if (!res.ok) return null
        const data = await res.json()
        if (data.status === 'OK' && data.results.length > 0) {
            const { lat, lng } = data.results[0].geometry.location
            return { lat, lng, formatted: data.results[0].formatted_address }
        }
    } catch (_) {}
    return null
}

export async function GET() {
    try {
        const { count } = await supabase
            .from('properties')
            .select('id', { count: 'exact', head: true })
            .is('latitude', null)

        const { count: total } = await supabase
            .from('properties')
            .select('id', { count: 'exact', head: true })

        return NextResponse.json({ success: true, needsGeocoding: count || 0, total: total || 0 })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function POST() {
    if (!GOOGLE_KEY) {
        return NextResponse.json({
            success: false,
            error: 'GOOGLE_GEOCODING_API_KEY not configured in environment variables.'
        }, { status: 500 })
    }

    try {
        // Fetch all properties without coordinates
        const { data: properties, error } = await supabase
            .from('properties')
            .select('id, flat_number, building_name, address, locality, city, pincode')
            .is('latitude', null)
            .limit(500)

        if (error) throw error

        if (!properties || properties.length === 0) {
            return NextResponse.json({ success: true, message: 'All properties already have coordinates!', processed: 0, succeeded: 0, failed: 0 })
        }

        let succeeded = 0
        let failed = 0
        const results = []

        for (const prop of properties) {
            const city = prop.city || 'Mumbai'
            const building = prop.building_name || ''
            const street = prop.address || ''
            const locality = prop.locality || ''
            const pincode = prop.pincode || ''

            // Build queries from most specific → least specific
            const queries = []
            if (building && street && locality) queries.push(`${building}, ${street}, ${locality}, ${city}, India`)
            if (building && locality)           queries.push(`${building}, ${locality}, ${city}, India`)
            if (street && locality)             queries.push(`${street}, ${locality}, ${city}, India`)
            if (locality)                       queries.push(`${locality}, ${city}, India`)
            if (pincode)                        queries.push(`${pincode}, India`)

            let placed = false
            for (const q of queries) {
                const result = await googleGeocode(q)
                if (result) {
                    await supabase
                        .from('properties')
                        .update({ latitude: result.lat, longitude: result.lng })
                        .eq('id', prop.id)

                    succeeded++
                    results.push({ id: prop.id, status: 'success', lat: result.lat, lng: result.lng, query: q, formatted: result.formatted })
                    placed = true
                    break
                }
                // Small delay between fallback attempts for same property
                await new Promise(r => setTimeout(r, 50))
            }

            if (!placed) {
                failed++
                results.push({ id: prop.id, status: 'not_found', building, street, locality, pincode })
            }

            // Google Geocoding API supports ~50 requests/sec, but we add a tiny delay
            // to be respectful and avoid hitting rate limits on large batches
            await new Promise(r => setTimeout(r, 100))
        }

        // Re-fetch count after processing
        const { count: remaining } = await supabase
            .from('properties')
            .select('id', { count: 'exact', head: true })
            .is('latitude', null)

        return NextResponse.json({
            success: true,
            processed: properties.length,
            succeeded,
            failed,
            remaining: remaining || 0,
            results
        })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
