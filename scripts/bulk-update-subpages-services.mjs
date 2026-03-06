/**
 * Bulk update services_settings for ALL subcategory + sub-location pages.
 * Fetches the real page list from the live site — no hardcoded IDs.
 * SAFE: only patches services_settings + section_visibility.services.
 *       All other page data (hero, FAQs, how-it-works, etc.) is preserved.
 *
 * Run: node scripts/bulk-update-subpages-services.mjs
 */

const BASE_URL = 'https://sortedsolutions.in';

const TITLE = 'Explore Other Appliance Solutions';
const SUBTITLE = 'Looking for help with another appliance? Our technicians also provide repair and maintenance services for a wide range of Appliances across Mumbai';

// 3 common services shown on every page (with ribbon tags)
const COMMON = [
    { id: 47, price: '599', tag: 'seasonal' },  // AC Wet/Foam Jet Clean
    { id: 151, price: '299', tag: 'popular' },  // Microwave Not Heating
    { id: 103, price: '199', tag: 'emergency' },  // Refrigerator Not Cooling
];
const COMMON_IDS = new Set(COMMON.map(c => c.id));

// Cross-sell services per parent appliance category
const CROSS_SELLS_BY_CAT = {
    'ac-repair': [{ id: 77, price: '199', tag: '' }, { id: 85, price: '199', tag: '' }, { id: 184, price: '199', tag: '' }, { id: 111, price: '199', tag: '' }],
    'washing-machine-repair': [{ id: 8, price: '299', tag: '' }, { id: 111, price: '199', tag: '' }, { id: 184, price: '199', tag: '' }, { id: 203, price: '199', tag: '' }],
    'refrigerator-repair': [{ id: 85, price: '199', tag: '' }, { id: 8, price: '299', tag: '' }, { id: 184, price: '199', tag: '' }, { id: 203, price: '199', tag: '' }],
    'oven-repair': [{ id: 77, price: '199', tag: '' }, { id: 8, price: '299', tag: '' }, { id: 85, price: '199', tag: '' }, { id: 184, price: '199', tag: '' }],
    'hob-repair': [{ id: 77, price: '199', tag: '' }, { id: 8, price: '299', tag: '' }, { id: 184, price: '199', tag: '' }, { id: 111, price: '199', tag: '' }],
    'water-purifier-repair': [{ id: 85, price: '199', tag: '' }, { id: 8, price: '299', tag: '' }, { id: 111, price: '199', tag: '' }, { id: 77, price: '199', tag: '' }],
    'microwave-repair': [{ id: 77, price: '199', tag: '' }, { id: 8, price: '299', tag: '' }, { id: 111, price: '199', tag: '' }, { id: 184, price: '199', tag: '' }],
    'dishwasher-repair': [{ id: 85, price: '199', tag: '' }, { id: 8, price: '299', tag: '' }, { id: 111, price: '199', tag: '' }, { id: 77, price: '199', tag: '' }],
    'dryer-repair': [{ id: 77, price: '199', tag: '' }, { id: 8, price: '299', tag: '' }, { id: 111, price: '199', tag: '' }, { id: 184, price: '199', tag: '' }],
};

// Derive which appliance category a page belongs to from its page_id
function getCatSlugFromPageId(pageId) {
    const knownCats = Object.keys(CROSS_SELLS_BY_CAT);
    // For sub-* : page_id = sub-{cat}-{subcategory}
    // For sloc-* : page_id = sloc-{location}-{cat}
    // For loc-* : page_id = loc-{location}  --> use generic cross-sells
    for (const cat of knownCats) {
        if (pageId.includes(cat)) return cat;
    }
    return null; // unknown category — will use only COMMON items
}

function buildItems(catSlug) {
    const crossSells = catSlug ? (CROSS_SELLS_BY_CAT[catSlug] || []) : [];
    const allItems = [...COMMON];
    for (const cs of crossSells) {
        if (!COMMON_IDS.has(cs.id)) allItems.push(cs);
    }
    return allItems;
}

async function updatePage(pageId, index, total) {
    try {
        const getRes = await fetch(`${BASE_URL}/api/settings/page/${pageId}`);
        const getData = await getRes.json();

        if (!getData.success || !getData.data) {
            process.stdout.write(`  ⏭  [${index}/${total}] ${pageId} — no record, skipping\n`);
            return 'skipped';
        }

        const currentSettings = getData.data;
        const catSlug = getCatSlugFromPageId(pageId);
        const items = buildItems(catSlug);

        const payload = {
            ...currentSettings,
            section_visibility: {
                ...(currentSettings.section_visibility || {}),
                services: true,
            },
            services_settings: {
                ...(currentSettings.services_settings || {}),
                title: TITLE,
                subtitle: SUBTITLE,
                items,
            },
        };

        const putRes = await fetch(`${BASE_URL}/api/settings/page/${pageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const putData = await putRes.json();

        if (putData.success) {
            const cat = catSlug || 'generic';
            process.stdout.write(`  ✅ [${index}/${total}] ${pageId} — ${items.length} services (${cat})\n`);
            return 'ok';
        } else {
            process.stdout.write(`  ❌ [${index}/${total}] ${pageId} — ${putData.error}\n`);
            return 'error';
        }
    } catch (err) {
        process.stdout.write(`  ❌ [${index}/${total}] ${pageId} — ${err.message}\n`);
        return 'error';
    }
}

async function main() {
    // 1. Fetch ALL real pages from live site
    console.log(`\n📡 Fetching real page list from ${BASE_URL}/api/settings/active-pages ...\n`);
    const listRes = await fetch(`${BASE_URL}/api/settings/active-pages`);
    const listData = await listRes.json();

    if (!listData.success || !Array.isArray(listData.data)) {
        console.error('❌ Failed to fetch page list:', listData.error || 'unknown error');
        process.exit(1);
    }

    const allPages = listData.data;
    console.log(`   Found ${allPages.length} total pages in database.\n`);

    // 2. Filter to only subcategory + sub-location pages
    const targetPages = allPages.filter(p =>
        p.page_type === 'subcategory' || p.page_type === 'sublocation'
    );

    console.log(`   Targeting ${targetPages.length} pages (subcategory + sub-location).\n`);
    const total = targetPages.length;

    // Also show what's being skipped
    const categoryPages = allPages.filter(p => p.page_type === 'category');
    const locationPages = allPages.filter(p => p.page_type === 'location');
    console.log(`   Skipping ${categoryPages.length} category pages (already done) + ${locationPages.length} location pages.\n`);
    console.log(`── Starting updates ─────────────────────\n`);

    let ok = 0, skipped = 0, errors = 0;

    for (let i = 0; i < targetPages.length; i++) {
        const page = targetPages[i];
        const result = await updatePage(page.page_id, i + 1, total);
        if (result === 'ok') ok++;
        else if (result === 'skipped') skipped++;
        else errors++;

        // Small delay to avoid hammering the server
        await new Promise(r => setTimeout(r, 150));
    }

    console.log(`\n── Summary ──────────────────────────────`);
    console.log(`  ✅ Updated  : ${ok}`);
    console.log(`  ⏭  Skipped  : ${skipped} (no page record)`);
    console.log(`  ❌ Errors   : ${errors}`);
    console.log(`─────────────────────────────────────────\n`);
}

main().catch(console.error);
