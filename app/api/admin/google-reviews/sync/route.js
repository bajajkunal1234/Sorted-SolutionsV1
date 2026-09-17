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

        // Fetch reviews with both most_relevant and newest to maximize unique reviews returned
        const sorts = ['most_relevant', 'newest'];
        const uniqueGoogleReviews = new Map();
        let overallRating = null;
        let totalRatings = null;

        for (const sort of sorts) {
            const googleUrl =
                `https://maps.googleapis.com/maps/api/place/details/json` +
                `?place_id=${encodeURIComponent(placeId)}` +
                `&fields=reviews,rating,user_ratings_total` +
                `&reviews_sort=${sort}` +
                `&key=${encodeURIComponent(apiKey)}` +
                `&language=en`;

            try {
                const response = await fetch(googleUrl);
                if (response.ok) {
                    const googleData = await response.json();
                    if (googleData.status === 'OK') {
                        if (googleData.result?.rating) overallRating = googleData.result.rating;
                        if (googleData.result?.user_ratings_total) totalRatings = googleData.result.user_ratings_total;
                        
                        const reviews = googleData.result?.reviews || [];
                        for (const r of reviews) {
                            // Only include reviews that have some text content
                            if (r.author_name && r.text && r.text.trim().length > 0) {
                                const key = `${r.author_name.trim().toLowerCase()}||${r.text.trim()}`;
                                if (!uniqueGoogleReviews.has(key)) {
                                    uniqueGoogleReviews.set(key, r);
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn(`Error fetching ${sort} reviews from Google:`, err);
            }
        }

        if (uniqueGoogleReviews.size === 0) {
            return NextResponse.json({ success: true, synced: 0, message: 'No reviews returned by Google API.' });
        }

        // Step 1: Get existing reviews in website_testimonials
        const { data: existing, error: fetchExistingError } = await supabase
            .from('website_testimonials')
            .select('id, customer_name, review_text, show_on_website');

        if (fetchExistingError) throw fetchExistingError;

        const existingMap = new Map();
        (existing || []).forEach(e => {
            const key = `${(e.customer_name || '').trim().toLowerCase()}||${(e.review_text || '').trim()}`;
            existingMap.set(key, e);
        });

        // Step 2: Determine new reviews to insert
        const newRowsToInsert = [];
        uniqueGoogleReviews.forEach(r => {
            const key = `${r.author_name.trim().toLowerCase()}||${r.text.trim()}`;
            if (!existingMap.has(key)) {
                // New review: default to show_on_website = true (visible on website)
                newRowsToInsert.push({
                    customer_name: r.author_name,
                    location: 'Mumbai',
                    rating: r.rating || 5,
                    review_text: r.text.trim(),
                    date: r.time ? new Date(r.time * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    source: 'Google Reviews',
                    show_on_website: true, // Show by default; user can hide unwanted ones in admin
                    is_verified: true,
                });
            }
        });

        // Step 3: Insert only new reviews (NEVER delete existing ones!)
        if (newRowsToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('website_testimonials')
                .insert(newRowsToInsert);

            if (insertError) throw insertError;
        }

        const totalInDb = (existing?.length || 0) + newRowsToInsert.length;

        return NextResponse.json({
            success: true,
            synced: newRowsToInsert.length,
            totalExisting: existing?.length || 0,
            totalInDb,
            overallRating,
            totalRatings,
            message: `Synced! Added ${newRowsToInsert.length} new reviews. Total in database: ${totalInDb}. All active reviews are visible on the website.`
        });

    } catch (error) {
        console.error('Google Reviews sync error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
