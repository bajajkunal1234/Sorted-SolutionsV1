import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/places-autocomplete?q=diamond+garden
 *
 * Proxy to Google Places Autocomplete API.
 * Biased towards Mumbai region.
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')

    const key = process.env.GOOGLE_GEOCODING_API_KEY
    if (!key) {
        return NextResponse.json({ success: false, error: 'Google Place API not configured' }, { status: 500 })
    }

    if (!q || q.trim().length < 2) {
        return NextResponse.json({ success: true, predictions: [] })
    }

    try {
        // Bias results to Mumbai (approx lat 19.076, lng 72.8777) within 50km, limited to India (components=country:in)
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&key=${key}&components=country:in&location=19.0760,72.8777&radius=50000`
        const res = await fetch(url)
        const data = await res.json()

        if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
            const predictions = (data.predictions || []).map(p => ({
                place_id: p.place_id,
                description: p.description,
                structured_formatting: p.structured_formatting
            }))
            return NextResponse.json({ success: true, predictions })
        }

        return NextResponse.json({ success: false, status: data.status, error: data.error_message })
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}
