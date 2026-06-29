import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/places-details?place_id=ChIJ...
 *
 * Proxy to Google Places Details API.
 * Resolves exact coordinates and address components.
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const placeId = searchParams.get('place_id')

    const key = process.env.GOOGLE_GEOCODING_API_KEY
    if (!key) {
        return NextResponse.json({ success: false, error: 'Google Place API not configured' }, { status: 500 })
    }

    if (!placeId) {
        return NextResponse.json({ success: false, error: 'place_id is required' }, { status: 400 })
    }

    try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,address_components,formatted_address,name&key=${key}`
        const res = await fetch(url)
        const data = await res.json()

        if (data.status === 'OK' && data.result) {
            const { lat, lng } = data.result.geometry.location
            const components = data.result.address_components || []
            const name = data.result.name || ''

            let pincode = ''
            let sublocality1 = '' // e.g. Goregaon East
            let sublocality2 = '' // e.g. Aarey Colony
            let city = 'Mumbai'
            let route = '' // e.g. Film City Road
            let neighborhood = ''
            let premise = ''

            for (const comp of components) {
                const types = comp.types
                if (types.includes('postal_code')) {
                    pincode = comp.long_name
                } else if (types.includes('sublocality_level_1')) {
                    sublocality1 = comp.long_name
                } else if (types.includes('sublocality_level_2')) {
                    sublocality2 = comp.long_name
                } else if (types.includes('locality')) {
                    city = comp.long_name
                } else if (types.includes('route')) {
                    route = comp.long_name
                } else if (types.includes('neighborhood')) {
                    neighborhood = comp.long_name
                } else if (types.includes('premise')) {
                    premise = comp.long_name
                }
            }

            // Build logical street address: e.g. "Film City Road, Aarey Colony"
            const addressParts = [route, sublocality2, neighborhood].filter(Boolean)
            const streetAddress = addressParts.join(', ')

            return NextResponse.json({
                success: true,
                data: {
                    latitude: lat,
                    longitude: lng,
                    formatted: data.result.formatted_address,
                    building_name: premise || name || '',
                    address: streetAddress || data.result.formatted_address,
                    locality: sublocality1 || sublocality2 || neighborhood || '',
                    city: city,
                    pincode: pincode
                }
            })
        }

        return NextResponse.json({ success: false, status: data.status, error: data.error_message })
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}
