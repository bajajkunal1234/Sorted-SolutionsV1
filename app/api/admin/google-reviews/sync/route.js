import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/google-reviews/sync
 * Body: { placeId: string, apiKey: string }
 *
 * Fetches reviews from the Google Places API and upserts them into
 * website_testimonials. New reviews default to show_on_website = false
 * so the admin can approve which ones to display.
 */
export async function POST(request) {
    try {
        const { placeId, apiKey } = await request.json();

        if (!placeId || !apiKey) {
            return NextResponse.json(
                { success: false, error: 'placeId and apiKey are required' },
                { status: 400 }
            );
        }

        // Call Google Places API (legacy Details endpoint — simple, no extra setup)
        const googleUrl =
            `https://maps.googleapis.com/maps/api/place/details/json` +
            `?place_id=${encodeURIComponent(placeId)}` +
            `&fields=reviews,rating,user_ratings_total` +
            `&key=${encodeURIComponent(apiKey)}` +
            `&language=en`;

        const response = await fetch(googleUrl);
        if (!response.ok) {
            throw new Error(`Google API HTTP error: ${response.status}`);
        }

        const googleData = await response.json();

        if (googleData.status !== 'OK') {
            return NextResponse.json(
                { success: false, error: `Google API error: ${googleData.status} — ${googleData.error_message || ''}` },
                { status: 422 }
            );
        }

        const reviews = googleData.result?.reviews || [];
        if (reviews.length === 0) {
            return NextResponse.json({ success: true, synced: 0, message: 'No reviews returned by Google (API returns up to 5 most recent).' });
        }

        // Map Google review shape → our DB columns (only core columns)
        const rows = reviews.map(r => ({
            customer_name: r.author_name,
            location: null,
            rating: r.rating,
            review_text: r.text || '',
            date: new Date(r.time * 1000).toISOString().split('T')[0],
            source: 'Google Reviews',
            show_on_website: false,
        }));

        // Upsert by (customer_name + date + source) to avoid duplicates on repeated syncs
        // We use a simpler approach: delete existing Google reviews and re-insert,
        // BUT preserve show_on_website for ones already approved by admin.

        // Step 1: Get existing approved Google reviews so we can restore their show_on_website state
        const { data: existing } = await supabase
            .from('website_testimonials')
            .select('customer_name, date, show_on_website')
            .eq('source', 'Google Reviews');

        const approvedSet = new Set(
            (existing || [])
                .filter(e => e.show_on_website)
                .map(e => `${e.customer_name}||${e.date}`)
        );

        // Step 2: Restore show_on_website for previously-approved reviews
        const rowsWithApproval = rows.map(r => ({
            ...r,
            show_on_website: approvedSet.has(`${r.customer_name}||${r.date}`),
        }));

        // Step 3: Delete old Google-sourced reviews and re-insert fresh ones
        await supabase
            .from('website_testimonials')
            .delete()
            .eq('source', 'Google Reviews');

        const { error: insertError } = await supabase
            .from('website_testimonials')
            .insert(rowsWithApproval);

        if (insertError) throw insertError;

        return NextResponse.json({
            success: true,
            synced: rowsWithApproval.length,
            overallRating: googleData.result?.rating,
            totalRatings: googleData.result?.user_ratings_total,
        });

    } catch (error) {
        console.error('Google Reviews sync error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
