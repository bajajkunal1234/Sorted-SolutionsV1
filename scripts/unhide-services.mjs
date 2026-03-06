/**
 * Unhides the 'services' section on all category page settings.
 * Only patches section_visibility.services = true, nothing else is modified.
 */
const BASE_URL = 'https://sorted-solutions-v1.vercel.app';

const CATEGORY_SLUGS = [
    'ac-repair', 'washing-machine-repair', 'refrigerator-repair',
    'oven-repair', 'hob-repair', 'water-purifier-repair',
    'dishwasher-repair', 'microwave-repair', 'dryer-repair',
];

async function unhideServices(categorySlug) {
    const pageId = `cat-${categorySlug}`;

    const getRes = await fetch(`${BASE_URL}/api/settings/page/${pageId}`);
    const getData = await getRes.json();
    if (!getData.success) {
        console.log(`  SKIP: no page record for ${pageId}`);
        return;
    }

    const currentSettings = getData.data || {};

    // Only patch section_visibility.services = true
    const payload = {
        ...currentSettings,
        section_visibility: {
            ...(currentSettings.section_visibility || {}),
            services: true,
        }
    };

    const putRes = await fetch(`${BASE_URL}/api/settings/page/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const putData = await putRes.json();

    if (putData.success) {
        console.log(`  ✅ ${pageId}: services section UNHIDDEN`);
    } else {
        console.log(`  ❌ ${pageId}: FAILED - ${putData.error}`);
    }
}

async function main() {
    console.log(`\nUnhiding services section for ${CATEGORY_SLUGS.length} category pages...\n`);
    for (const slug of CATEGORY_SLUGS) {
        process.stdout.write(`Processing cat-${slug}... `);
        await unhideServices(slug);
    }
    console.log('\nDone!');
}

main().catch(console.error);
