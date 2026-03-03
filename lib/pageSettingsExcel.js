/**
 * pageSettingsExcel.js
 * Client-side Excel export/import for PageSettingsManager.
 * Uses SheetJS (xlsx) — dynamically imported to avoid SSR issues.
 *
 * Sheet layout:
 *   Hero            → key/value rows
 *   Problems        → question | answer
 *   Services        → title | description | price | image | slug
 *   Localities      → name
 *   Sub-Services    → title | slug | image         (selected subcategory cards)
 *   Brands          → brand_id | name              (selected brand IDs)
 *   FAQs            → faq_id | question            (selected FAQ IDs)
 *   Other Locations → page_id                      (selected location page IDs)
 *   Issues          → issue_id                     (selected issue IDs — sub-pages only)
 *   Section Titles  → section | title | subtitle
 */

// ── EXPORT ────────────────────────────────────────────────────────────────────
export async function exportPageSettingsToExcel(settings, pageLabel = 'page') {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const addSheet = (name, data, colWidths) => {
        const ws = XLSX.utils.aoa_to_sheet(data);
        if (colWidths) ws['!cols'] = colWidths.map(w => ({ wch: w }));
        XLSX.utils.book_append_sheet(wb, ws, name);
    };

    // ── Hero ──
    const hero = settings.hero_settings || {};
    addSheet('Hero', [
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
    ], [22, 60]);

    // ── Problems (manually typed) ──
    const problems = settings.problems_settings?.items || [];
    addSheet('Problems', [
        ['question', 'answer'],
        ...problems.map(p => [p.question || '', p.answer || ''])
    ], [40, 80]);

    // ── Services (manually typed) ──
    const services = settings.services_settings?.items || [];
    addSheet('Services', [
        ['title', 'description', 'price', 'image', 'slug'],
        ...services.map(s => [s.title || '', s.description || '', s.price || '', s.image || '', s.slug || ''])
    ], [30, 60, 10, 50, 25]);

    // ── Localities (manually typed) ──
    const localities = settings.localities_settings?.items || [];
    addSheet('Localities', [
        ['name'],
        ...localities.map(l => [typeof l === 'string' ? l : (l.name || '')])
    ], [30]);

    // ── Sub-Services (picked from booking subcategories) ──
    const subcats = settings.subcategories_settings?.items || [];
    addSheet('Sub-Services', [
        ['title', 'slug', 'image'],
        ...subcats.map(s => [s.title || '', s.slug || '', s.image || ''])
    ], [30, 25, 60]);

    // ── Brands (picked from global library) ──
    // items can be brand IDs (numbers) or objects {id, name}
    const brandItems = settings.brands_settings?.items || [];
    addSheet('Brands', [
        ['brand_id', 'name (read-only info)'],
        ...brandItems.map(b => typeof b === 'object'
            ? [b.id ?? '', b.name ?? '']
            : [b, ''])
    ], [15, 40]);

    // ── FAQs (picked from global library) ──
    // items can be FAQ IDs or objects {id, question}
    const faqItems = settings.faqs_settings?.items || [];
    addSheet('FAQs', [
        ['faq_id', 'question (read-only info)'],
        ...faqItems.map(f => typeof f === 'object'
            ? [f.id ?? '', f.question ?? '']
            : [f, ''])
    ], [15, 80]);

    // ── Other Locations (picked from active pages) ──
    // items can be page_id strings or objects {id, title}
    const locItems = settings.other_locations_settings?.items || [];
    addSheet('Other Locations', [
        ['page_id', 'title (read-only info)'],
        ...locItems.map(l => typeof l === 'object'
            ? [l.id ?? '', l.title ?? '']
            : [l, ''])
    ], [30, 50]);

    // ── Issues (picked from booking issues — subcategory pages only) ──
    const issueItems = settings.issues_settings?.items || [];
    addSheet('Issues', [
        ['issue_id'],
        ...issueItems.map(id => [id])
    ], [15]);

    // ── Section Titles ──
    addSheet('Section Titles', [
        ['Section', 'Title', 'Subtitle'],
        ['Problems', settings.problems_settings?.title || '', settings.problems_settings?.subtitle || ''],
        ['Services', settings.services_settings?.title || '', settings.services_settings?.subtitle || ''],
        ['Localities', settings.localities_settings?.title || '', settings.localities_settings?.subtitle || ''],
        ['Brands', settings.brands_settings?.title || '', settings.brands_settings?.subtitle || ''],
        ['Sub-Services', settings.subcategories_settings?.title || '', settings.subcategories_settings?.subtitle || ''],
        ['Other Locations', settings.other_locations_settings?.title || '', settings.other_locations_settings?.subtitle || ''],
        ['FAQs', settings.faqs_settings?.title || '', settings.faqs_settings?.subtitle || ''],
        ['Issues', settings.issues_settings?.title || '', settings.issues_settings?.subtitle || ''],
    ], [20, 40, 60]);

    // ── Download ──
    const safeName = (pageLabel || 'page').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    XLSX.writeFile(wb, `${safeName}_settings.xlsx`);
}

// ── IMPORT ────────────────────────────────────────────────────────────────────
/**
 * Reads an uploaded Excel file and returns a partial settings patch.
 * @param {File} file
 * @returns {Promise<Object>} patch object
 */
export async function importPageSettingsFromExcel(file) {
    const XLSX = await import('xlsx');
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });

    const patch = {};

    const sheetToRows = (name) => {
        const ws = wb.Sheets[name];
        return ws ? XLSX.utils.sheet_to_json(ws, { defval: '' }) : null;
    };
    const sheetToAOA = (name) => {
        const ws = wb.Sheets[name];
        return ws ? XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) : null;
    };

    // ── Hero ──
    const heroAOA = sheetToAOA('Hero');
    if (heroAOA?.length > 1) {
        const m = {};
        heroAOA.slice(1).forEach(([k, v]) => { if (k) m[k] = v; });
        patch.hero_settings = {
            title: m['Title'] ?? '',
            subtitle: m['Subtitle'] ?? '',
            badge: m['Badge Text'] ?? '',
            description: m['Description'] ?? '',
            ctaText: m['CTA Button Text'] ?? '',
            ctaUrl: m['CTA Button URL'] ?? '',
            bg_type: m['Background Type'] || 'gradient',
            bg_color_from: m['BG Color From'] || '#6366f1',
            bg_color_to: m['BG Color To'] || '#4f46e5',
            bg_image_url: m['BG Image URL'] ?? '',
            overlay_opacity: parseFloat(m['Overlay Opacity']) || 0.85,
        };
    }

    // ── Problems ──
    const problemRows = sheetToRows('Problems');
    if (problemRows) {
        patch.problems_items = problemRows
            .filter(r => r.question || r.answer)
            .map(r => ({ question: String(r.question || ''), answer: String(r.answer || '') }));
    }

    // ── Services ──
    const serviceRows = sheetToRows('Services');
    if (serviceRows) {
        patch.services_items = serviceRows
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
        patch.localities_items = localityRows
            .filter(r => r.name)
            .map(r => String(r.name));
    }

    // ── Sub-Services ──
    const subcatRows = sheetToRows('Sub-Services');
    if (subcatRows) {
        patch.subcategories_items = subcatRows
            .filter(r => r.title || r.slug)
            .map(r => ({
                title: String(r.title || ''),
                slug: String(r.slug || ''),
                image: String(r.image || ''),
            }));
    }

    // ── Brands (IDs only — name column is ignored on import) ──
    const brandRows = sheetToRows('Brands');
    if (brandRows) {
        patch.brands_items = brandRows
            .filter(r => r.brand_id !== '')
            .map(r => Number(r.brand_id));
    }

    // ── FAQs (IDs only) ──
    const faqRows = sheetToRows('FAQs');
    if (faqRows) {
        patch.faqs_items = faqRows
            .filter(r => r.faq_id !== '')
            .map(r => Number(r.faq_id));
    }

    // ── Other Locations (page IDs) ──
    const locRows = sheetToRows('Other Locations');
    if (locRows) {
        patch.other_locations_items = locRows
            .filter(r => r.page_id !== '')
            .map(r => String(r.page_id));
    }

    // ── Issues (issue IDs) ──
    const issueRows = sheetToRows('Issues');
    if (issueRows) {
        patch.issues_items = issueRows
            .filter(r => r.issue_id !== '')
            .map(r => Number(r.issue_id));
    }

    // ── Section Titles ──
    const titleRows = sheetToRows('Section Titles');
    if (titleRows) {
        const m = {};
        titleRows.forEach(r => { if (r.Section) m[r.Section] = { title: r.Title || '', subtitle: r.Subtitle || '' }; });
        patch.section_titles = m;
    }

    return patch;
}

// ── APPLY PATCH ───────────────────────────────────────────────────────────────
/**
 * Merges an import patch into the current settings state.
 * Safe — only updates keys present in the patch.
 */
export function applyImportPatch(currentSettings, patch) {
    const next = { ...currentSettings };

    const mergeItems = (settingsKey, patchKey) => {
        if (patch[patchKey] !== undefined) {
            next[settingsKey] = { ...(next[settingsKey] || {}), items: patch[patchKey] };
        }
    };

    if (patch.hero_settings) {
        next.hero_settings = { ...(next.hero_settings || {}), ...patch.hero_settings };
    }

    mergeItems('problems_settings', 'problems_items');
    mergeItems('services_settings', 'services_items');
    mergeItems('localities_settings', 'localities_items');
    mergeItems('subcategories_settings', 'subcategories_items');
    mergeItems('brands_settings', 'brands_items');
    mergeItems('faqs_settings', 'faqs_items');
    mergeItems('other_locations_settings', 'other_locations_items');
    mergeItems('issues_settings', 'issues_items');

    if (patch.section_titles) {
        const KEY_MAP = {
            'Problems': 'problems_settings',
            'Services': 'services_settings',
            'Localities': 'localities_settings',
            'Brands': 'brands_settings',
            'Sub-Services': 'subcategories_settings',
            'Other Locations': 'other_locations_settings',
            'FAQs': 'faqs_settings',
            'Issues': 'issues_settings',
        };
        Object.entries(patch.section_titles).forEach(([label, { title, subtitle }]) => {
            const key = KEY_MAP[label];
            if (key && next[key]) {
                next[key] = { ...next[key], title, subtitle };
            }
        });
    }

    return next;
}
