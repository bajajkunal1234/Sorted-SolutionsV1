/**
 * Bulk update services_settings for all category pages.
 * Updates title, subtitle, and selects 3 common + 4 cross-sell services per page.
 * Prices are pulled from Quick Booking data. NO PAGE DATA IS DELETED - only services_settings is patched.
 * Run: node scripts/bulk-update-services.mjs
 */

const BASE_URL = 'https://sorted-solutions-v1.vercel.app';

const TITLE = 'Explore Other Appliance Solutions';
const SUBTITLE = 'Looking for help with another appliance? Our technicians also provide repair and maintenance services for a wide range of Appliances across Mumbai';

// 3 Common services for every page (with tag)
// ID | Name               | Price | Tag
// 47 | AC Wet/Foam Jet    | 599   | seasonal
// 151| Microwave NotHeat  | 299   | popular
// 103| Fridge Not Cooling | 199   | emergency
const COMMON = [
    { id: 47, price: '599', tag: 'seasonal' },
    { id: 151, price: '299', tag: 'popular' },
    { id: 103, price: '199', tag: 'emergency' },
];

// 4 cross-sell services per category (services from OTHER product categories)
// Key = page_id slug, value = array of {id, price, tag}
const CROSS_SELLS = {
    'ac-repair': [
        { id: 77, price: '199', tag: '' },  // Washing Machine Water Leaking
        { id: 103, price: '199', tag: '' },  // Refrigerator Not Cooling (already in common, but adding for completeness - will be deduped)
        { id: 151, price: '299', tag: '' },  // Microwave Not Heating
        { id: 184, price: '199', tag: '' },  // Water Purifier Not Working
        // Use non-overlapping ones:
    ],
    'washing-machine-repair': [
        { id: 8, price: '299', tag: '' },  // AC Not Cooling (Split AC)
        { id: 103, price: '199', tag: '' },  // Refrigerator Not Cooling - already common, skip
        { id: 184, price: '199', tag: '' },  // Water Purifier Not Working
        { id: 175, price: '299', tag: '' },  // Microwave Not Heating (OTG)
    ],
    'refrigerator-repair': [
        { id: 85, price: '199', tag: '' },  // Washing Machine Water Inlet Issue (Front Load)
        { id: 8, price: '299', tag: '' },  // AC Not Cooling (Split AC)
        { id: 151, price: '299', tag: '' },  // Microwave Not Heating - already common, skip
        { id: 184, price: '199', tag: '' },  // Water Purifier Not Working
    ],
    'oven-repair': [
        { id: 77, price: '199', tag: '' },  // Washing Machine Water Leaking
        { id: 8, price: '299', tag: '' },  // AC Not Cooling
        { id: 103, price: '199', tag: '' },  // Refrigerator Not Cooling - already common, skip
        { id: 184, price: '199', tag: '' },  // Water Purifier Not Working
    ],
    'hob-repair': [
        { id: 77, price: '199', tag: '' },  // Washing Machine Water Leaking
        { id: 8, price: '299', tag: '' },  // AC Not Cooling
        { id: 184, price: '199', tag: '' },  // Water Purifier Not Working
        { id: 111, price: '199', tag: '' },  // Refrigerator Making Noise
    ],
    'water-purifier-repair': [
        { id: 85, price: '199', tag: '' },  // Washing Machine Water Inlet Issue
        { id: 8, price: '299', tag: '' },  // AC Not Cooling
        { id: 111, price: '199', tag: '' },  // Refrigerator Making Noise
        { id: 151, price: '299', tag: '' },  // Microwave Not Heating - already common, skip
    ],
    'dishwasher-repair': [
        { id: 85, price: '199', tag: '' },  // Washing Machine Water Inlet Issue
        { id: 8, price: '299', tag: '' },  // AC Not Cooling
        { id: 111, price: '199', tag: '' },  // Refrigerator Making Noise
        { id: 151, price: '299', tag: '' },  // Microwave Not Heating - already common, skip
    ],
    'microwave-repair': [
        { id: 77, price: '199', tag: '' },  // Washing Machine Water Leaking
        { id: 8, price: '299', tag: '' },  // AC Not Cooling
        { id: 103, price: '199', tag: '' },  // Refrigerator Not Cooling - already common, skip
        { id: 184, price: '199', tag: '' },  // Water Purifier Not Working
    ],
    'dryer-repair': [
        { id: 77, price: '199', tag: '' },  // Washing Machine Water Leaking
        { id: 8, price: '299', tag: '' },  // AC Not Cooling
        { id: 111, price: '199', tag: '' },  // Refrigerator Making Noise
        { id: 184, price: '199', tag: '' },  // Water Purifier Not Working
    ],
};

// Build proper cross-sell lists (deduplicate against COMMON ids)
const COMMON_IDS = new Set(COMMON.map(c => c.id));

const FINAL_CROSS_SELLS = {
    'ac-repair': [{ id: 77, price: '199', tag: '' }, { id: 85, price: '199', tag: '' }, { id: 184, price: '199', tag: '' }, { id: 111, price: '199', tag: '' }],
    'washing-machine-repair': [{ id: 8, price: '299', tag: '' }, { id: 111, price: '199', tag: '' }, { id: 184, price: '199', tag: '' }, { id: 203, price: '199', tag: '' }],
    'refrigerator-repair': [{ id: 85, price: '199', tag: '' }, { id: 8, price: '299', tag: '' }, { id: 184, price: '199', tag: '' }, { id: 203, price: '199', tag: '' }],
    'oven-repair': [{ id: 77, price: '199', tag: '' }, { id: 8, price: '299', tag: '' }, { id: 85, price: '199', tag: '' }, { id: 184, price: '199', tag: '' }],
    'hob-repair': [{ id: 77, price: '199', tag: '' }, { id: 8, price: '299', tag: '' }, { id: 184, price: '199', tag: '' }, { id: 111, price: '199', tag: '' }],
    'water-purifier-repair': [{ id: 85, price: '199', tag: '' }, { id: 8, price: '299', tag: '' }, { id: 111, price: '199', tag: '' }, { id: 77, price: '199', tag: '' }],
    'dishwasher-repair': [{ id: 85, price: '199', tag: '' }, { id: 8, price: '299', tag: '' }, { id: 111, price: '199', tag: '' }, { id: 77, price: '199', tag: '' }],
    'microwave-repair': [{ id: 77, price: '199', tag: '' }, { id: 8, price: '299', tag: '' }, { id: 111, price: '199', tag: '' }, { id: 184, price: '199', tag: '' }],
    'dryer-repair': [{ id: 77, price: '199', tag: '' }, { id: 8, price: '299', tag: '' }, { id: 111, price: '199', tag: '' }, { id: 184, price: '199', tag: '' }],
};

async function updatePage(categorySlug) {
    const pageId = `cat-${categorySlug}`;
    const crossSells = FINAL_CROSS_SELLS[categorySlug] || [];

    // Combine: common first, then cross-sells (no duplicates)
    const allItems = [...COMMON];
    for (const cs of crossSells) {
        if (!COMMON_IDS.has(cs.id)) {
            allItems.push(cs);
        }
    }

    // Fetch current settings first (to not overwrite other fields)
    const getRes = await fetch(`${BASE_URL}/api/settings/page/${pageId}`);
    const getData = await getRes.json();
    if (!getData.success) {
        console.log(`  SKIP: no page record for ${pageId}`);
        return;
    }

    const currentSettings = getData.data || {};

    // Build patched payload - only update services_settings, preserve everything else
    const payload = {
        ...currentSettings,
        services_settings: {
            ...(currentSettings.services_settings || {}),
            title: TITLE,
            subtitle: SUBTITLE,
            items: allItems,
        }
    };

    const putRes = await fetch(`${BASE_URL}/api/settings/page/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const putData = await putRes.json();

    if (putData.success) {
        console.log(`  ✅ ${pageId}: updated with ${allItems.length} services`);
    } else {
        console.log(`  ❌ ${pageId}: FAILED - ${putData.error}`);
    }
}

async function main() {
    const slugs = Object.keys(FINAL_CROSS_SELLS);
    console.log(`\nUpdating services_settings for ${slugs.length} category pages...\n`);

    for (const slug of slugs) {
        process.stdout.write(`Processing cat-${slug}... `);
        await updatePage(slug);
    }

    console.log('\nDone!');
}

main().catch(console.error);
