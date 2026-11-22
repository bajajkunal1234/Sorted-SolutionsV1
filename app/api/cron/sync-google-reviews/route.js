import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { classifyReview, autoDistributeReviewsToAllWebServices, APPLIANCE_CATEGORIES } from '@/lib/v2/reviewClassifier';

export const dynamic = 'force-dynamic';

/**
 * GET or POST /api/cron/sync-google-reviews
 *
 * Automated cron job to sync Google Reviews everyday at midnight (3:00 AM IST / 21:30 UTC).
 * Can be triggered by Vercel Cron, external monitoring, or manually.
 */
async function handleSync(request) {
    try {
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get('secret');
        const authHeader = request.headers.get('authorization');

        // Security check: match query secret or Vercel cron header
        const validSecret = 'sorted_solutions_secret_2026';
        const isAuthorized =
            secret === validSecret ||
            authHeader === `Bearer ${validSecret}` ||
            request.headers.get('x-vercel-cron') === '1';

        if (!isAuthorized) {
            return NextResponse.json({ success: false, error: 'Unauthorized cron request' }, { status: 401 });
        }

        // 1. Fetch saved Google Place ID & API Key from website_section_configs
        const { data: configs, error: configError } = await supabase
            .from('website_section_configs')
            .select('section_id, extra_config')
            .in('section_id', ['ecom-v2-testimonials', 'testimonials']);

        if (configError) throw configError;

        let placeId = process.env.GOOGLE_PLACE_ID || '';
        let apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
        let activeSectionId = 'ecom-v2-testimonials';
        let currentExtraConfig = {};

        // Prefer ecom-v2-testimonials, fallback to testimonials
        const v2Row = (configs || []).find(c => c.section_id === 'ecom-v2-testimonials');
        const legacyRow = (configs || []).find(c => c.section_id === 'testimonials');

        if (v2Row?.extra_config?.googleSync?.placeId && v2Row?.extra_config?.googleSync?.apiKey) {
            placeId = v2Row.extra_config.googleSync.placeId;
            apiKey = v2Row.extra_config.googleSync.apiKey;
            activeSectionId = 'ecom-v2-testimonials';
            currentExtraConfig = v2Row.extra_config;
        } else if (legacyRow?.extra_config?.googleSync?.placeId && legacyRow?.extra_config?.googleSync?.apiKey) {
            placeId = legacyRow.extra_config.googleSync.placeId;
            apiKey = legacyRow.extra_config.googleSync.apiKey;
            activeSectionId = 'testimonials';
            currentExtraConfig = legacyRow.extra_config;
        }

        if (!placeId || !apiKey) {
            return NextResponse.json({
                success: false,
                message: 'No Google Place ID or Places API Key configured yet in website settings.'
            }, { status: 200 });
        }

        // 2. Query Google Places API with both newest and most_relevant
        const sorts = ['newest', 'most_relevant'];
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
                console.warn(`[Cron Google Reviews] Error fetching ${sort}:`, err?.message);
            }
        }

        // 3. Compare with existing database rows
        const { data: existing, error: fetchExistingError } = await supabase
            .from('website_testimonials')
            .select('id, customer_name, review_text');

        if (fetchExistingError) throw fetchExistingError;

        const existingMap = new Map();
        (existing || []).forEach(e => {
            const key = `${(e.customer_name || '').trim().toLowerCase()}||${(e.review_text || '').trim()}`;
            existingMap.set(key, e);
        });

        // 4. Determine new rows to insert with automated classification and visibility rules
        const newRowsToInsert = [];
        uniqueGoogleReviews.forEach(r => {
            const key = `${r.author_name.trim().toLowerCase()}||${r.text.trim()}`;
            if (!existingMap.has(key)) {
                const rating = r.rating || 5;
                const isVisible = rating >= 4; // Auto-disable visibility if rating < 4
                const reviewText = (r.text || '').trim();
                const classInfo = classifyReview({ review_text: reviewText });

                let serviceType = 'General Appliance Service';
                if (classInfo.matchesCategory('ac') && classInfo.matchesCategory('washing_machine')) {
                    serviceType = 'AC & Washing Machine Service';
                } else if (classInfo.matchesCategory('ac')) {
                    serviceType = 'Air Conditioner Service';
                } else if (classInfo.matchesCategory('refrigerator')) {
                    serviceType = 'Refrigerator Repair';
                } else if (classInfo.matchesCategory('microwave')) {
                    serviceType = 'Microwave & Oven Repair';
                } else if (classInfo.matchesCategory('washing_machine')) {
                    serviceType = 'Washing Machine Repair';
                } else if (classInfo.matchesCategory('water_purifier')) {
                    serviceType = 'Water Purifier Service';
                }

                newRowsToInsert.push({
                    customer_name: r.author_name,
                    location: 'Mumbai',
                    rating,
                    review_text: reviewText,
                    date: r.time ? new Date(r.time * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    source: 'Google Reviews',
                    show_on_website: isVisible,
                    is_verified: true,
                    service_type: serviceType
                });
            }
        });

        if (newRowsToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('website_testimonials')
                .insert(newRowsToInsert);
            if (insertError) throw insertError;
        }

        // 5. Ensure all reviews below 4 stars have visibility auto-disabled
        await supabase
            .from('website_testimonials')
            .update({ show_on_website: false })
            .lt('rating', 4);

        // 6. Automatically distribute relevant reviews to all web services in inventory
        // (AC reviews -> AC services, Refrigerator reviews -> Refrigerator services, generic -> all services)
        let distributionResult = null;
        try {
            distributionResult = await autoDistributeReviewsToAllWebServices(supabase);
        } catch (distErr) {
            console.warn('[Cron Google Reviews] Error during auto-distribution:', distErr?.message);
        }

        const totalInDb = (existing?.length || 0) + newRowsToInsert.length;
        const nowIso = new Date().toISOString();

        // 7. Update last_auto_sync stats in section configs
        const syncStatus = {
            last_auto_sync_at: nowIso,
            last_auto_sync_status: 'success',
            new_reviews_synced: newRowsToInsert.length,
            total_in_database: totalInDb,
            overall_rating: overallRating,
            total_ratings: totalRatings,
            services_updated: distributionResult?.updatedServicesCount || 0
        };

        const updatedConfig = {
            ...currentExtraConfig,
            lastAutoSync: syncStatus
        };

        await supabase
            .from('website_section_configs')
            .upsert({
                section_id: activeSectionId,
                extra_config: updatedConfig,
                updated_at: nowIso
            }, { onConflict: 'section_id' });

        return NextResponse.json({
            success: true,
            syncedNew: newRowsToInsert.length,
            totalInDb,
            overallRating,
            totalRatings,
            distribution: distributionResult,
            timestamp: nowIso,
            message: `Auto-sync complete: added ${newRowsToInsert.length} new reviews. Auto-assigned to ${distributionResult?.updatedServicesCount || 0} web services.`
        });

    } catch (err) {
        console.error('[Cron Google Reviews] Critical error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function GET(request) {
    return handleSync(request);
}

export async function POST(request) {
    return handleSync(request);
}
