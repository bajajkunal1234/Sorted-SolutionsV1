import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/google-distance?origin=lat,lng&destination=lat,lng
 *
 * Proxy to Google Distance Matrix API.
 * Returns driving distance and duration.
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const origin = searchParams.get('origin')
        const destination = searchParams.get('destination')

        const key = process.env.GOOGLE_GEOCODING_API_KEY
        if (!key) {
            return NextResponse.json({ success: false, error: 'Google API key not configured' }, { status: 500 })
        }

        if (!origin || !destination) {
            return NextResponse.json({ success: false, error: 'Missing origin or destination parameter' }, { status: 400 })
        }

        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${key}&region=in`
        const res = await fetch(url)
        const data = await res.json()

        if (data.status === 'OK' && data.rows?.[0]?.elements?.[0]?.status === 'OK') {
            const element = data.rows[0].elements[0]
            return NextResponse.json({
                success: true,
                distance: element.distance.text,
                duration: element.duration.text,
                distanceM: element.distance.value,
                durationS: element.duration.value
            })
        }

        // Fallback or warning if no route found by Google
        return NextResponse.json({
            success: false,
            error: data.rows?.[0]?.elements?.[0]?.status || data.status || 'No route found'
        })
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}
