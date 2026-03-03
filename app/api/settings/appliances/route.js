import { getSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const LOCATIONS = [
    "andheri", "malad", "jogeshwari", "kandivali", "goregaon",
    "ville-parle", "santacruz", "bandra", "khar", "mahim",
    "dadar", "powai", "saki-naka", "ghatkopar", "kurla"
];

const CORE_APPLIANCES = [
    {
        id: 'bulk-1',
        name: 'Air Conditioner',
        slug: 'ac-repair',
        icon_name: 'Wind',
        color: '#3b82f6',
        subcategories: [
            { id: 'sub-1', name: 'Split AC', slug: 'split-ac' },
            { id: 'sub-2', name: 'Window AC', slug: 'window-ac' }
        ]
    },
    {
        id: 'bulk-2',
        name: 'Washing Machine',
        slug: 'washing-machine-repair',
        icon_name: 'Waves',
        color: '#10b981',
        subcategories: [
            { id: 'sub-3', name: 'Front Load', slug: 'front-load' },
            { id: 'sub-4', name: 'Top Load', slug: 'top-load' }
        ]
    },
    {
        id: 'bulk-3',
        name: 'Refrigerator',
        slug: 'refrigerator-repair',
        icon_name: 'Snowflake',
        color: '#8b5cf6',
        subcategories: [
            { id: 'sub-5', name: 'Single Door', slug: 'single-door' },
            { id: 'sub-6', name: 'Double Door', slug: 'double-door' }
        ]
    },
    {
        id: 'bulk-4',
        name: 'Oven',
        slug: 'oven-repair',
        icon_name: 'Flame',
        color: '#f59e0b',
        subcategories: [
            { id: 'sub-7', name: 'Microwave Oven', slug: 'microwave-oven' },
            { id: 'sub-8', name: 'OTG Oven', slug: 'otg-oven' }
        ]
    },
    {
        id: 'bulk-5',
        name: 'Water Purifier',
        slug: 'water-purifier-repair',
        icon_name: 'Droplets',
        color: '#06b6d4',
        subcategories: [
            { id: 'sub-9', name: 'RO Purifier', slug: 'ro-purifier' },
            { id: 'sub-10', name: 'UV Purifier', slug: 'uv-purifier' }
        ]
    },
    {
        id: 'bulk-6',
        name: 'Gas Stove / HOB',
        slug: 'hob-repair',
        icon_name: 'FlameKindling',
        color: '#ec4899',
        subcategories: [
            { id: 'sub-11', name: 'Gas Stove', slug: 'gas-stove' },
            { id: 'sub-12', name: 'Built-in HOB', slug: 'built-in-hob' }
        ]
    }
];

/**
 * GET /api/settings/appliances
 * Returns all booking categories + subcategories formatted for the WebsiteSettings
 * page builder. Also returns which page_ids already have settings rows seeded.
 */
export async function GET() {
    const supabase = getSupabaseServer();
    if (!supabase) {
        return NextResponse.json({ success: false, error: 'Database connection missing' }, { status: 500 });
    }

    try {
        // 1. Gather data from all sources
        let dbCategories = [];
        let dbSubcategories = [];
        let jsonbCategories = [];
        let jsonbSubcategories = [];

        // Source A: Database Tables
        const { data: catData } = await supabase
            .from('booking_categories')
            .select('id, name, slug, icon_name, color, display_order')
            .order('display_order', { ascending: true });

        if (catData && catData.length > 0) {
            dbCategories = catData;
            const { data: subData } = await supabase
                .from('booking_subcategories')
                .select('id, name, slug, category_id, display_order')
                .order('display_order', { ascending: true });
            if (subData) dbSubcategories = subData;
        }

        // Source B: JSONB Settings
        const { data: globalSettings } = await supabase
            .from('quick_booking_settings')
            .select('categories')
            .single();

        if (globalSettings && globalSettings.categories && globalSettings.categories.length > 0) {
            jsonbCategories = globalSettings.categories.map(cat => ({
                id: cat.id,
                name: cat.name,
                slug: cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-') + '-repair',
                icon_name: cat.icon_name || 'Package',
                color: cat.color || '#6366f1',
                display_order: cat.order || 0
            }));

            jsonbSubcategories = globalSettings.categories.flatMap(cat =>
                (cat.subcategories || []).map(sub => ({
                    id: sub.id,
                    category_id: cat.id,
                    name: sub.name,
                    slug: sub.slug || sub.name.toLowerCase().replace(/\s+/g, '-'),
                    display_order: sub.order || 0
                }))
            );
        }

        // 2. MERGE AND DEDUPLICATE (Priority: DB > JSONB > Core)
        const categoryMap = new Map();
        const subcategoryMap = new Map();

        // Add Core Appliances as base
        CORE_APPLIANCES.forEach(cat => {
            const catSlug = cat.slug;
            categoryMap.set(catSlug, { ...cat, isCore: true });
            cat.subcategories.forEach(sub => {
                subcategoryMap.set(`${catSlug}|${sub.slug}`, { ...sub, category_slug: catSlug });
            });
        });

        // Overlay JSONB
        jsonbCategories.forEach(cat => {
            categoryMap.set(cat.slug, { ...cat, isJsonb: true });
        });
        jsonbSubcategories.forEach(sub => {
            // Find parent slug
            const parent = jsonbCategories.find(c => c.id === sub.category_id);
            if (parent) subcategoryMap.set(`${parent.slug}|${sub.slug}`, { ...sub, category_slug: parent.slug });
        });

        // Overlay DB
        dbCategories.forEach(cat => {
            categoryMap.set(cat.slug, { ...cat, isDb: true });
        });
        dbSubcategories.forEach(sub => {
            const parent = dbCategories.find(c => c.id === sub.category_id);
            if (parent) subcategoryMap.set(`${parent.slug}|${sub.slug}`, { ...sub, category_slug: parent.slug });
        });

        const categories = Array.from(categoryMap.values());
        const subcategories = Array.from(subcategoryMap.values());

        // 3. PAGE SETTINGS CHECK
        const { data: existingSettings } = await supabase
            .from('page_settings')
            .select('page_id');
        const builtPageIds = new Set((existingSettings || []).map(s => s.page_id));

        // 4. BUILD RESPONSE
        const result = categories.map(cat => {
            const catSlug = cat.slug;
            const subs = subcategories.filter(s => s.category_slug === catSlug);

            const catPageId = `cat-${catSlug}`;
            const subPageIds = subs.map(s => `sub-${catSlug}-${s.slug}`);
            const slocPageIds = LOCATIONS.map(loc => `sloc-${loc}-${catSlug}`);

            const allPageIds = [catPageId, ...subPageIds, ...slocPageIds];
            const builtCount = allPageIds.filter(id => builtPageIds.has(id)).length;

            return {
                id: cat.id,
                name: cat.name,
                slug: catSlug,
                icon_name: cat.icon_name || 'Package',
                color: cat.color || '#6366f1',
                subcategories: subs.map(s => ({
                    id: s.id,
                    name: s.name,
                    slug: s.slug
                })),
                pageIds: {
                    category: catPageId,
                    subcategories: subPageIds,
                    sublocations: slocPageIds,
                    total: allPageIds.length,
                    built: builtCount
                }
            };
        });

        return NextResponse.json({ success: true, data: result, locations: LOCATIONS });

    } catch (error) {
        console.error('Error fetching appliances:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
