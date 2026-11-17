export const PROCESS_TEMPLATES_SECTION_ID = 'ecom-v2-process-templates';

export const DEFAULT_PROCESS_TEMPLATES = [
    {
        id: 'tpl-standard-repair',
        name: 'Standard Appliance Repair Process',
        title: 'Our process',
        subtitle: 'Transparent doorstep inspection, upfront quote & 30-day warranty',
        steps: [
            {
                title: 'Inspection & quote',
                desc: 'We inspect the appliance thoroughly & share an upfront repair quote for your approval.',
                imageUrl: ''
            },
            {
                title: 'Approval or expert advice',
                desc: 'Repair begins only after your approval; if you decline, only the nominal visiting charge applies.',
                imageUrl: ''
            },
            {
                title: 'Repair & genuine spare parts',
                desc: 'If required, we source genuine manufacturer-grade spare parts at transparent fixed market rates.',
                imageUrl: ''
            },
            {
                title: 'Post-repair testing & warranty',
                desc: 'Complete safety & performance testing, spotless area cleanup & 30-day service warranty.',
                imageUrl: ''
            }
        ]
    },
    {
        id: 'tpl-ac-foam-jet',
        name: 'AC Foam-Jet & Cooling Process',
        title: 'Our process',
        subtitle: '2X deeper foam-jet cleaning & cooling efficiency verification',
        steps: [
            {
                title: 'Pre-service checks',
                desc: 'Detailed inspection of air temperature, airflow, power consumption, gas pressure & indoor/outdoor unit health.',
                imageUrl: ''
            },
            {
                title: 'Jacket setup & mess-free prep',
                desc: 'Waterproof protective AC service jacket fitted cleanly around the unit to protect your walls & floor.',
                imageUrl: ''
            },
            {
                title: 'Deep Foam-Jet cleaning & repair',
                desc: '2X deeper cleaning of cooling coils, drain tray & filters using foam & high-pressure jet pump.',
                imageUrl: ''
            },
            {
                title: 'Post-service cooling verification',
                desc: 'Cooling efficiency check with digital thermometer, vibration check & spotless site handover.',
                imageUrl: ''
            }
        ]
    },
    {
        id: 'tpl-ro-purifier',
        name: 'Water Purifier RO & TDS Process',
        title: 'Our process',
        subtitle: 'Digital TDS testing, genuine filter replacement & tank sanitization',
        steps: [
            {
                title: 'Digital TDS & pressure test',
                desc: 'Measure input & output water TDS levels, pump pressure, and check for leaks or membrane wear.',
                imageUrl: ''
            },
            {
                title: 'Upfront filter & repair quote',
                desc: 'Clear itemized quote for sediment, carbon, RO membrane or booster pump work before starting.',
                imageUrl: ''
            },
            {
                title: 'Service, sanitization & genuine spares',
                desc: 'Food-grade storage tank sanitization and installation of sealed, authentic spare cartridges.',
                imageUrl: ''
            },
            {
                title: 'Final water purity check',
                desc: 'Re-verify output TDS reading, flow rate & taste with a 30-day service warranty.',
                imageUrl: ''
            }
        ]
    }
];

export function getDefaultTemplateIdForCategory(categorySlug) {
    if (categorySlug === 'ac-repair') return 'tpl-ac-foam-jet';
    if (categorySlug === 'water-purifier-repair') return 'tpl-ro-purifier';
    return 'tpl-standard-repair';
}

export function normalizeProcessTemplatesPayload(raw) {
    const templates = Array.isArray(raw?.templates) && raw.templates.length > 0
        ? raw.templates.map((t, idx) => ({
            id: t.id || `tpl-${idx + 1}`,
            name: t.name || `Process Template ${idx + 1}`,
            title: t.title || 'Our process',
            subtitle: t.subtitle || '',
            steps: Array.isArray(t.steps)
                ? t.steps.map((s) => ({
                    title: s?.title || '',
                    desc: s?.desc || '',
                    imageUrl: s?.imageUrl || ''
                }))
                : [],
            updatedAt: t.updatedAt || null
        }))
        : DEFAULT_PROCESS_TEMPLATES;

    const homepageTemplateId = raw?.homepageTemplateId !== undefined
        ? raw.homepageTemplateId
        : (templates[0]?.id || 'tpl-standard-repair');

    const homepageEnabled = raw?.homepageEnabled !== undefined
        ? Boolean(raw.homepageEnabled)
        : true;

    return {
        templates,
        homepageTemplateId,
        homepageEnabled
    };
}

/**
 * Resolves the final `process` object for a live category page by looking up
 * the linked `templateId` inside `templatesConfig`.
 */
export function resolveProcessForCategory(categoryProcessConfig, templatesConfig, categorySlug) {
    const normalized = normalizeProcessTemplatesPayload(templatesConfig);
    const enabled = categoryProcessConfig?.enabled !== false;

    if (!enabled) {
        return {
            enabled: false,
            templateId: categoryProcessConfig?.templateId || null,
            title: 'Our process',
            subtitle: '',
            steps: []
        };
    }

    const requestedId = categoryProcessConfig?.templateId || getDefaultTemplateIdForCategory(categorySlug);
    const matchedTemplate =
        normalized.templates.find(t => t.id === requestedId) ||
        normalized.templates.find(t => t.id === getDefaultTemplateIdForCategory(categorySlug)) ||
        normalized.templates[0];

    if (matchedTemplate) {
        return {
            enabled: true,
            templateId: matchedTemplate.id,
            templateName: matchedTemplate.name,
            title: matchedTemplate.title || 'Our process',
            subtitle: matchedTemplate.subtitle || '',
            steps: Array.isArray(matchedTemplate.steps) ? matchedTemplate.steps : []
        };
    }

    // Legacy fallback if all templates were deleted
    return {
        enabled: true,
        templateId: null,
        title: categoryProcessConfig?.title || 'Our process',
        subtitle: categoryProcessConfig?.subtitle || '',
        steps: Array.isArray(categoryProcessConfig?.steps) ? categoryProcessConfig.steps : []
    };
}

/**
 * Resolves the active Our Process section for the /v2 Homepage.
 */
export function resolveProcessForHomepage(templatesConfig) {
    const normalized = normalizeProcessTemplatesPayload(templatesConfig);
    if (!normalized.homepageEnabled || !normalized.homepageTemplateId) {
        return null;
    }

    const matched = normalized.templates.find(t => t.id === normalized.homepageTemplateId);
    if (!matched || !Array.isArray(matched.steps) || matched.steps.length === 0) {
        return null;
    }

    return {
        enabled: true,
        templateId: matched.id,
        templateName: matched.name,
        title: matched.title || 'Our process',
        subtitle: matched.subtitle || '',
        steps: matched.steps
    };
}
