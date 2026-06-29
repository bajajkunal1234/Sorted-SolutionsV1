import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/places-autocomplete?q=diamond+garden
 *
 * Proxy to Google Geocoding API to bypass Google Places API restrictions.
 * Returns formatted predictions with pre-resolved coordinates and address details.
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')

    const key = process.env.GOOGLE_GEOCODING_API_KEY
    if (!key) {
        return NextResponse.json({ success: false, error: 'Google API key not configured' }, { status: 500 })
    }

    if (!q || q.trim().length < 2) {
        return NextResponse.json({ success: true, predictions: [] })
    }

    try {
        // Query the Geocoding API (which is authorized on the client's API key)
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${key}&region=in&components=country:IN`
        const res = await fetch(url)
        const data = await res.json()

        if (data.status === 'OK') {
            const predictions = (data.results || []).map(r => {
                const components = r.address_components || []
                let pincode = ''
                let sublocality1 = ''
                let sublocality2 = ''
                let city = 'Mumbai'
                let route = ''
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

                // Construct a clean street address
                const streetParts = [route, sublocality2].filter(Boolean)
                let streetAddress = streetParts.join(', ')

                if (!streetAddress && r.formatted_address) {
                    const parts = r.formatted_address.split(',')
                    streetAddress = parts.slice(0, 2).map(p => p.trim()).join(', ')
                }

                return {
                    place_id: r.place_id,
                    description: r.formatted_address,
                    lat: r.geometry.location.lat,
                    lng: r.geometry.location.lng,
                    building_name: premise || '',
                    address: streetAddress || r.formatted_address,
                    locality: sublocality1 || sublocality2 || neighborhood || '',
                    city: city,
                    pincode: pincode
                }
            })
            return NextResponse.json({ success: true, predictions })
        }

        return NextResponse.json({ success: true, predictions: [] })
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}
