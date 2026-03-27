import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/geocode-properties
 * Returns count of properties needing geocoding.
 *
 * POST /api/admin/geocode-properties
 * Batch-geocodes all properties where latitude IS NULL.
 * Rate-limits to 1 request/second to comply with Nominatim TOS.
 */

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
    try {
        // Fetch all properties without coordinates
        const { data: properties, error } = await supabase
            .from('properties')
            .select('id, flat_number, building_name, address, locality, city, pincode')
            .is('latitude', null)
            .limit(200) // Process up to 200 per batch

        if (error) throw error

        if (!properties || properties.length === 0) {
            return NextResponse.json({ success: true, message: 'All properties already have coordinates!', processed: 0 })
        }

        let succeeded = 0
        let failed = 0
        const results = []

        // Process sequentially with 1.1 second delay between requests (Nominatim rate limit: 1/sec)
        for (const prop of properties) {
            const query = [
                prop.flat_number,
                prop.building_name,
                prop.address,
                prop.locality,
                prop.city,
                prop.pincode,
                'India'
            ].filter(Boolean).join(', ')

            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
                    {
                        headers: {
                            'Accept-Language': 'en',
                            'User-Agent': 'SortedSolutions/1.0 (admin@sorted.solutions)'
                        }
                    }
                )

                const data = await res.json()

                if (data && data.length > 0) {
                    const lat = parseFloat(data[0].lat)
                    const lng = parseFloat(data[0].lon)

                    await supabase
                        .from('properties')
                        .update({ latitude: lat, longitude: lng })
                        .eq('id', prop.id)

                    succeeded++
                    results.push({ id: prop.id, status: 'success', lat, lng })
                } else {
                    failed++
                    results.push({ id: prop.id, status: 'not_found', query })
                }
            } catch (geocodeErr) {
                failed++
                results.push({ id: prop.id, status: 'error', error: geocodeErr.message })
            }

            // Wait 1.1s between requests to comply with Nominatim usage policy
            await new Promise(resolve => setTimeout(resolve, 1100))
        }

        return NextResponse.json({
            success: true,
            processed: properties.length,
            succeeded,
            failed,
            results
        })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
