/**
 * pageSettingsExcel.js
 * Client-side Excel export/import for PageSettingsManager.
 * Uses SheetJS (xlsx) — dynamically imported to avoid SSR issues.
 *
 * Sheet layout:
 *   Hero        → single row of key/value pairs
 *   Problems    → question | answer
 *   Services    → title | description | price | image | slug
 *   Localities  → name
 *   Subcategories → title | slug | image
 *   Section Titles → all section title/subtitle pairs
 */


// ── EXPORT ──────────────────────────────────────────────────────────────────
export async function exportPageSettingsToExcel(settings, pageLabel = 'page') {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Hero ──
    const hero = settings.hero_settings || {};
    const heroData = [
        ['Field', 'Value'],
        ['Title', hero.title || ''],
        ['Subtitle', hero.subtitle || ''],
        ['Badge Text', hero.badge || ''],
        ['Description', hero.description || ''],
        ['CTA Button Text', hero.ctaText || ''],
        ['CTA Button URL', hero.ctaUrl || ''],
        ['Background Type', hero.bg_type || 'gradient'],
        ['BG Color From', hero.bg_color_from || '#6366f1'],
        ['BG Color To', hero.bg_color_to || '#4f46e5'],
        ['BG Image URL', hero.bg_image_url || ''],
        ['Overlay Opacity', hero.overlay_opacity ?? 0.85],
    ];
    const wsHero = XLSX.utils.aoa_to_sheet(heroData);
    wsHero['!cols'] = [{ wch: 22 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsHero, 'Hero');

    // ── Sheet 2: Problems ──
    const problems = (settings.problems_settings?.items || []);
    const problemsData = [
        ['question', 'answer'],
        ...problems.map(p => [p.question || '', p.answer || ''])
    ];
    const wsProblems = XLSX.utils.aoa_to_sheet(problemsData);
    wsProblems['!cols'] = [{ wch: 40 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsProblems, 'Problems');

    // ── Sheet 3: Services ──
    const services = (settings.services_settings?.items || []);
    const servicesData = [
        ['title', 'description', 'price', 'image', 'slug'],
        ...services.map(s => [s.title || '', s.description || '', s.price || '', s.image || '', s.slug || ''])
    ];
    const wsServices = XLSX.utils.aoa_to_sheet(servicesData);
    wsServices['!cols'] = [{ wch: 30 }, { wch: 60 }, { wch: 10 }, { wch: 50 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, wsServices, 'Services');

    // ── Sheet 4: Localities ──
    const localities = (settings.localities_settings?.items || []);
    const localitiesData = [
        ['name'],
        ...localities.map(l => [typeof l === 'string' ? l : (l.name || '')])
    ];
    const wsLocalities = XLSX.utils.aoa_to_sheet(localitiesData);
    wsLocalities['!cols'] = [{ wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsLocalities, 'Localities');

    // ── Sheet 5: Sub-Services (Subcategories) ──
    const subcats = (settings.subcategories_settings?.items || []);
    const subcatsData = [
        ['title', 'slug', 'image'],
        ...subcats.map(s => [s.title || '', s.slug || '', s.image || ''])
    ];
    const wsSubcats = XLSX.utils.aoa_to_sheet(subcatsData);
    wsSubcats['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsSubcats, 'Sub-Services');

    // ── Sheet 6: Section Titles (all section title/subtitle pairs) ──
    const sectionTitleData = [
        ['Section', 'Title', 'Subtitle'],
        ['Problems', settings.problems_settings?.title || '', settings.problems_settings?.subtitle || ''],
        ['Services', settings.services_settings?.title || '', settings.services_settings?.subtitle || ''],
        ['Localities', settings.localities_settings?.title || '', settings.localities_settings?.subtitle || ''],
        ['Brands', settings.brands_settings?.title || '', settings.brands_settings?.subtitle || ''],
        ['Sub-Services', settings.subcategories_settings?.title || '', settings.subcategories_settings?.subtitle || ''],
        ['Other Locations', settings.other_locations_settings?.title || '', settings.other_locations_settings?.subtitle || ''],
        ['FAQs', settings.faqs_settings?.title || '', settings.faqs_settings?.subtitle || ''],
    ];
    const wsTitles = XLSX.utils.aoa_to_sheet(sectionTitleData);
    wsTitles['!cols'] = [{ wch: 20 }, { wch: 40 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsTitles, 'Section Titles');

    // ── Download ──
    const safeName = (pageLabel || 'page').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    XLSX.writeFile(wb, `${safeName}_settings.xlsx`);
}

// ── IMPORT ──────────────────────────────────────────────────────────────────
/**
 * Reads an uploaded Excel file and returns a partial settings patch.
 * The caller merges this into the existing settings state.
 *
 * @param {File} file - The uploaded .xlsx file
 * @returns {Promise<Object>} - Partial settings update object
 */
export async function importPageSettingsFromExcel(file) {
    const XLSX = await import('xlsx');
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });

    const patch = {};

    // Helper: sheet rows as array of objects (first row = headers)
    const sheetToRows = (sheetName) => {
        const ws = wb.Sheets[sheetName];
        if (!ws) return null;
        return XLSX.utils.sheet_to_json(ws, { defval: '' });
    };

    // Helper: sheet rows as raw AOA (for key-value sheets like Hero)
    const sheetToAOA = (sheetName) => {
        const ws = wb.Sheets[sheetName];
        if (!ws) return null;
        return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    };

    // ── Hero ──
    const heroAOA = sheetToAOA('Hero');
    if (heroAOA && heroAOA.length > 1) {
        const heroMap = {};
        heroAOA.slice(1).forEach(([key, val]) => { if (key) heroMap[key] = val; });
        patch.hero_settings = {
            title: heroMap['Title'] ?? '',
            subtitle: heroMap['Subtitle'] ?? '',
            badge: heroMap['Badge Text'] ?? '',
            description: heroMap['Description'] ?? '',
            ctaText: heroMap['CTA Button Text'] ?? '',
            ctaUrl: heroMap['CTA Button URL'] ?? '',
            bg_type: heroMap['Background Type'] || 'gradient',
            bg_color_from: heroMap['BG Color From'] || '#6366f1',
            bg_color_to: heroMap['BG Color To'] || '#4f46e5',
            bg_image_url: heroMap['BG Image URL'] ?? '',
            overlay_opacity: parseFloat(heroMap['Overlay Opacity']) || 0.85,
        };
    }

    // ── Problems ──
    const problemRows = sheetToRows('Problems');
    if (problemRows) {
        patch.problems_settings_items = problemRows
            .filter(r => r.question || r.answer)
            .map(r => ({ question: String(r.question || ''), answer: String(r.answer || '') }));
    }

    // ── Services ──
    const serviceRows = sheetToRows('Services');
    if (serviceRows) {
        patch.services_settings_items = serviceRows
            .filter(r => r.title)
            .map(r => ({
                title: String(r.title || ''),
                description: String(r.description || ''),
                price: r.price !== '' ? r.price : '',
                image: String(r.image || ''),
                slug: String(r.slug || ''),
            }));
    }

    // ── Localities ──
    const localityRows = sheetToRows('Localities');
    if (localityRows) {
        patch.localities_settings_items = localityRows
            .filter(r => r.name)
            .map(r => String(r.name));
    }

    // ── Sub-Services ──
    const subcatRows = sheetToRows('Sub-Services');
    if (subcatRows) {
        patch.subcategories_settings_items = subcatRows
            .filter(r => r.title || r.slug)
            .map(r => ({
                title: String(r.title || ''),
                slug: String(r.slug || ''),
                image: String(r.image || ''),
            }));
    }

    // ── Section Titles ──
    const titleRows = sheetToRows('Section Titles');
    if (titleRows) {
        const titleMap = {};
        titleRows.forEach(r => { if (r.Section) titleMap[r.Section] = { title: r.Title || '', subtitle: r.Subtitle || '' }; });
        patch.section_titles = titleMap;
    }

    return patch;
}

/**
 * Merges an import patch into the current settings state.
 * Safe — only updates keys that are present in the patch.
 */
export function applyImportPatch(currentSettings, patch) {
    const next = { ...currentSettings };

    if (patch.hero_settings) {
        next.hero_settings = { ...(next.hero_settings || {}), ...patch.hero_settings };
    }

    if (patch.problems_settings_items !== undefined) {
        next.problems_settings = { ...(next.problems_settings || {}), items: patch.problems_settings_items };
    }

    if (patch.services_settings_items !== undefined) {
        next.services_settings = { ...(next.services_settings || {}), items: patch.services_settings_items };
    }

    if (patch.localities_settings_items !== undefined) {
        next.localities_settings = { ...(next.localities_settings || {}), items: patch.localities_settings_items };
    }

    if (patch.subcategories_settings_items !== undefined) {
        next.subcategories_settings = { ...(next.subcategories_settings || {}), items: patch.subcategories_settings_items };
    }

    if (patch.section_titles) {
        const sectionKeyMap = {
            'Problems': 'problems_settings',
            'Services': 'services_settings',
            'Localities': 'localities_settings',
            'Brands': 'brands_settings',
            'Sub-Services': 'subcategories_settings',
            'Other Locations': 'other_locations_settings',
            'FAQs': 'faqs_settings',
        };
        Object.entries(patch.section_titles).forEach(([sectionLabel, { title, subtitle }]) => {
            const key = sectionKeyMap[sectionLabel];
            if (key && next[key]) {
                next[key] = { ...next[key], title, subtitle };
            }
        });
    }

    return next;
}
