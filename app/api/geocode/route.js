import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/geocode?q=Diamond+1+Royal+Palms+Goregaon+East+Mumbai
 *
 * Server-side proxy to Google Geocoding API.
 * Keeps the API key secret (never exposed to the browser).
 * Returns { success, lat, lng, formatted } or { success: false, status }
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')

    if (!q || q.trim().length < 3) {
        return NextResponse.json({ success: false, error: 'Missing or too short query' }, { status: 400 })
    }

    const key = process.env.GOOGLE_GEOCODING_API_KEY
    if (!key) {
        return NextResponse.json({ success: false, error: 'Geocoding not configured' }, { status: 500 })
    }

    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${key}&region=in&components=country:IN`
        const res = await fetch(url)
        const data = await res.json()

        if (data.status === 'OK' && data.results.length > 0) {
            const { lat, lng } = data.results[0].geometry.location
            return NextResponse.json({
                success: true,
                lat,
                lng,
                formatted: data.results[0].formatted_address
            })
        }

        return NextResponse.json({ success: false, status: data.status })
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}
