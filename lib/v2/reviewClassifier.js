/**
 * Review Classifier & Auto-Selection Engine
 *
 * Categorizes Google customer reviews into appliance-specific vs. generic reviews,
 * prevents cross-appliance contamination (e.g. oven reviews showing on AC services),
 * and automatically curates the most relevant reviews for any web service.
 */

export const APPLIANCE_CATEGORIES = {
    ac: {
        key: 'ac',
        label: 'Air Conditioners',
        // Matches AC, A/C, Air conditioner, Split AC, Window AC, Cassette AC, Duct AC, Foam Jet, Cooling coil, Compressor
        positiveRegex: /\b(ac|a\/c|air\s*conditioner[s]?|air\s*conditioning|split\s*ac|window\s*ac|cassette\s*ac|duct\s*ac|foam\s*jet|cooling\s*coil|compressor)\b/i,
        // Conflict words that mean this review is about a DIFFERENT appliance unless AC is also mentioned
        otherApplianceRegex: /\b(microwave[s]?|micro\s*oven[s]?|otg|oven[s]?|refrigerator[s]?|fridge[s]?|water\s*purifier[s]?|purifier[s]?|ro\s*repair|kent|aquaguard)\b/i,
        aliases: ['air conditioner', 'air conditioners', 'ac', 'cooling', 'hvac', 'split ac', 'window ac']
    },
    refrigerator: {
        key: 'refrigerator',
        label: 'Refrigerators',
        positiveRegex: /\b(refrigerator[s]?|fridge[s]?|freezer[s]?|gasket|frost\s*free|deep\s*freezer|single\s*door|double\s*door)\b/i,
        otherApplianceRegex: /\b(ac|a\/c|air\s*conditioner|microwave|micro\s*oven|otg|oven|water\s*purifier|kent|aquaguard)\b/i,
        aliases: ['refrigerator', 'refrigerators', 'fridge', 'freezer', 'fridge repair']
    },
    microwave: {
        key: 'microwave',
        label: 'Microwave & Oven',
        positiveRegex: /\b(microwave[s]?|micro\s*oven[s]?|otg|oven[s]?|grill|magnetron|baking\s*oven)\b/i,
        otherApplianceRegex: /\b(ac|a\/c|air\s*conditioner|refrigerator|fridge|water\s*purifier|kent|aquaguard|washing\s*machine)\b/i,
        aliases: ['microwave', 'oven', 'micro oven', 'otg', 'microwave oven', 'microwave repair', 'otg repair']
    },
    washing_machine: {
        key: 'washing_machine',
        label: 'Washing Machines',
        positiveRegex: /\b(washing\s*machine[s]?|washer|front\s*load|top\s*load|dryer|spin\s*cycle)\b/i,
        otherApplianceRegex: /\b(microwave|micro\s*oven|otg|oven|water\s*purifier|kent|aquaguard|refrigerator|fridge)\b/i,
        aliases: ['washing machine', 'washing machines', 'washer', 'dryer', 'laundry']
    },
    water_purifier: {
        key: 'water_purifier',
        label: 'Water Purifiers / RO',
        positiveRegex: /\b(water\s*purifier[s]?|purifier[s]?|\bro\b|kent|aquaguard|filter\s*candle|tds|membrane|drinking\s*water)\b/i,
        otherApplianceRegex: /\b(microwave|micro\s*oven|otg|oven|refrigerator|fridge|air\s*conditioner|washing\s*machine)\b/i,
        aliases: ['water purifier', 'water purifiers', 'purifier', 'ro', 'kent', 'aquaguard', 'water filter']
    }
};

/**
 * Detect which appliance category a service belongs to based on category name and service name.
 */
export function detectTargetCategory(categoryName = '', serviceName = '') {
    const text = `${categoryName || ''} ${serviceName || ''}`.toLowerCase();

    for (const [catKey, catDef] of Object.entries(APPLIANCE_CATEGORIES)) {
        if (catDef.aliases.some(alias => text.includes(alias))) {
            return catKey;
        }
    }

    // Fallback checks
    if (/\bac\b|air\s*con/i.test(text)) return 'ac';
    if (/fridge|refrig/i.test(text)) return 'refrigerator';
    if (/micro|oven|otg/i.test(text)) return 'microwave';
    if (/wash/i.test(text)) return 'washing_machine';
    if (/purif|ro|filter/i.test(text)) return 'water_purifier';

    return null;
}

/**
 * Classify a review based on its text content and metadata.
 */
export function classifyReview(review) {
    const text = (review?.review_text || review?.comment || '').trim();
    const serviceType = (review?.service_type || '').toLowerCase();
    const combined = `${text} ${serviceType}`;

    const isEmpty = text.length === 0;

    // Detect matched categories
    const matchedCategories = [];
    for (const [catKey, catDef] of Object.entries(APPLIANCE_CATEGORIES)) {
        if (catDef.positiveRegex.test(combined)) {
            matchedCategories.push(catKey);
        }
    }

    // A review is generic if it has no specific appliance mentioned or is rating-only
    const isGeneric = isEmpty || matchedCategories.length === 0;

    return {
        isEmpty,
        isGeneric,
        matchedCategories,
        /**
         * Checks if review is a positive match for target category
         */
        matchesCategory: (targetKey) => {
            if (!targetKey) return false;
            return matchedCategories.includes(targetKey);
        },
        /**
         * Checks if review belongs to a DIFFERENT appliance and should NOT be shown for target category
         */
        conflictsWithCategory: (targetKey) => {
            if (!targetKey) return false;
            // If it matches target category, it's NOT in conflict (even if combined like AC + Washing Machine)
            if (matchedCategories.includes(targetKey)) return false;
            // If it matches another specific category, it conflicts!
            if (matchedCategories.length > 0) return true;
            return false;
        }
    };
}

/**
 * AI Auto-Select algorithm: Selects category-specific reviews + top generic reviews
 * for a specific service while strictly filtering out conflicting appliance reviews.
 */
export function autoSelectReviewsForService({
    serviceName = '',
    categoryName = '',
    availableReviews = [],
    targetCount = 60
}) {
    const targetCatKey = detectTargetCategory(categoryName, serviceName);

    // Only consider visible reviews with rating >= 4
    const validReviews = (availableReviews || []).filter(r =>
        r.show_on_website !== false && (r.rating || 5) >= 4
    );

    const directMatches = [];
    const genericMatchesWithText = [];
    const ratingOnlyReviews = [];

    validReviews.forEach(r => {
        const info = classifyReview(r);

        // 1. If target category exists and review directly matches it
        if (targetCatKey && info.matchesCategory(targetCatKey)) {
            directMatches.push(r);
            return;
        }

        // 2. If it conflicts with target category (e.g. oven review for AC service), EXCLUDE IT!
        if (targetCatKey && info.conflictsWithCategory(targetCatKey)) {
            return;
        }

        // 3. Otherwise, if it's generic with genuine feedback text
        if (info.isGeneric && !info.isEmpty) {
            genericMatchesWithText.push(r);
            return;
        }

        // 4. Rating-only reviews (no text, 5 stars) - included to ensure high review count
        if (info.isEmpty) {
            ratingOnlyReviews.push(r);
        }
    });

    // Curate the final list:
    // 1. All direct category matches
    const curated = [...directMatches];

    // 2. Add all generic reviews with text
    for (const gen of genericMatchesWithText) {
        if (curated.length >= targetCount) break;
        curated.push(gen);
    }

    // 3. Add all rating-only reviews (reviews without text)
    for (const ro of ratingOnlyReviews) {
        if (curated.length >= targetCount) break;
        curated.push(ro);
    }

    const genericWithTextSelected = Math.min(genericMatchesWithText.length, Math.max(0, curated.length - directMatches.length));
    const ratingOnlySelected = Math.max(0, curated.length - directMatches.length - genericWithTextSelected);

    // Format for web_details.feedbacks.items
    return {
        targetCategoryKey: targetCatKey,
        targetCategoryLabel: targetCatKey ? APPLIANCE_CATEGORIES[targetCatKey]?.label : 'Generic',
        directMatchCount: directMatches.length,
        genericWithTextCount: genericWithTextSelected,
        ratingOnlyCount: ratingOnlySelected,
        genericCount: curated.length - directMatches.length,
        selectedReviews: curated.map(rev => ({
            id: rev.id,
            name: rev.customer_name || 'Verified Customer',
            location: rev.location || 'Mumbai',
            rating: rev.rating || 5,
            comment: rev.review_text || '',
            date: rev.date || '',
            source: 'Google Reviews'
        }))
    };
}

/**
 * Auto-distributes relevant reviews to all web services in inventory:
 * - Direct appliance matches for specific categories (e.g. AC reviews -> AC services)
 * - Top generic reviews for general coverage
 * - Strictly excludes conflicting appliance reviews (e.g. no oven reviews on AC services)
 * - Preserves any custom/manual reviews the admin entered
 */
export async function autoDistributeReviewsToAllWebServices(supabase) {
    // 1. Fetch all visible reviews (4+ stars)
    const { data: allReviews, error: revError } = await supabase
        .from('website_testimonials')
        .select('*')
        .eq('show_on_website', true)
        .gte('rating', 4);

    if (revError) throw revError;

    // 2. Fetch all web services
    const { data: webServices, error: svcError } = await supabase
        .from('inventory')
        .select('id, name, category, subtype, web_details')
        .eq('subtype', 'web');

    if (svcError) throw svcError;

    const updates = [];

    for (const service of (webServices || [])) {
        const curWeb = service.web_details && typeof service.web_details === 'object' ? service.web_details : {};

        // Run auto-select for this service (select all eligible reviews including rating-only reviews)
        const aiSelection = autoSelectReviewsForService({
            serviceName: service.name,
            categoryName: service.category,
            availableReviews: allReviews || [],
            targetCount: 60
        });

        // Separate any existing custom/manual reviews
        const existingItems = Array.isArray(curWeb.feedbacks?.items) ? curWeb.feedbacks.items : [];
        const manualItems = existingItems.filter(item =>
            item.source === 'Manual' || item.source === 'custom' || (!item.source && !item.id)
        );

        // Combined curated items (AI curated Google reviews + manual items)
        const combinedItems = [...aiSelection.selectedReviews, ...manualItems];

        const updatedWebDetails = {
            ...curWeb,
            feedbacks: {
                ...(curWeb.feedbacks || {}),
                title: curWeb.feedbacks?.title || 'Customer Feedbacks & Ratings',
                items: combinedItems
            }
        };

        const { error: updateError } = await supabase
            .from('inventory')
            .update({
                web_details: updatedWebDetails,
                updated_at: new Date().toISOString()
            })
            .eq('id', service.id);

        if (!updateError) {
            updates.push({
                id: service.id,
                name: service.name,
                category: service.category,
                targetCategory: aiSelection.targetCategoryLabel,
                assignedReviewsCount: combinedItems.length,
                directMatchCount: aiSelection.directMatchCount,
                genericCount: aiSelection.genericCount
            });
        }
    }

    return {
        success: true,
        updatedServicesCount: updates.length,
        services: updates
    };
}

