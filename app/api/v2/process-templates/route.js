import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { V2_CATEGORIES } from '@/lib/v2/catalogConfig';
import { getCategoryDefaultConfig } from '@/lib/v2/categoryPageDefaults';
import {
    PROCESS_TEMPLATES_SECTION_ID,
    normalizeProcessTemplatesPayload,
    getDefaultTemplateIdForCategory
} from '@/lib/v2/processTemplates';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = createServerSupabase();
        let rawTemplatesConfig = null;
        let updatedAt = null;
        const categoryRowsMap = new Map();

        if (supabase) {
            const [tplRes, catRes] = await Promise.all([
                supabase
                    .from('website_section_configs')
                    .select('extra_config, updated_at')
                    .eq('section_id', PROCESS_TEMPLATES_SECTION_ID)
                    .maybeSingle(),
                supabase
                    .from('website_section_configs')
                    .select('section_id, extra_config')
                    .like('section_id', 'ecom-v2-cat-%')
            ]);

            if (!tplRes.error && tplRes.data?.extra_config) {
                rawTemplatesConfig = tplRes.data.extra_config;
                updatedAt = tplRes.data.updated_at;
            }

            if (!catRes.error && Array.isArray(catRes.data)) {
                catRes.data.forEach((row) => {
                    const slug = row.section_id.replace('ecom-v2-cat-', '');
                    categoryRowsMap.set(slug, row.extra_config || {});
                });
            }
        }

        const normalized = normalizeProcessTemplatesPayload(rawTemplatesConfig);

        // Build current assignment map for all 6 V2 categories
        const categoryAssignments = {};
        V2_CATEGORIES.forEach((cat) => {
            const savedCat = categoryRowsMap.get(cat.slug);
            const savedProcess = savedCat?.process || null;
            const resolvedTemplateId = savedProcess?.templateId || getDefaultTemplateIdForCategory(cat.slug);
            const validTemplate = normalized.templates.find(t => t.id === resolvedTemplateId);

            categoryAssignments[cat.slug] = {
                categorySlug: cat.slug,
                categoryName: cat.name,
                enabled: savedProcess?.enabled !== false,
                templateId: validTemplate ? validTemplate.id : (normalized.templates[0]?.id || null)
            };
        });

        return NextResponse.json({
            success: true,
            isCustomized: Boolean(rawTemplatesConfig),
            updatedAt,
            data: normalized,
            categoryAssignments
        });
    } catch (err) {
        console.error('[API process-templates] GET error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    return handleSave(request);
}

export async function PUT(request) {
    return handleSave(request);
}

async function handleSave(request) {
    try {
        const body = await request.json();
        const supabase = createServerSupabase();

        if (!supabase) {
            return NextResponse.json({ success: false, error: 'Database connection failed' }, { status: 500 });
        }

        const now = new Date().toISOString();
        const normalized = normalizeProcessTemplatesPayload({
            templates: Array.isArray(body.templates)
                ? body.templates.map((t) => ({
                    ...t,
                    updatedAt: now
                }))
                : undefined,
            homepageTemplateId: body.homepageTemplateId,
            homepageEnabled: body.homepageEnabled
        });

        const payload = {
            section_id: PROCESS_TEMPLATES_SECTION_ID,
            extra_config: {
                ...normalized,
                page_slug: 'v2/process-templates'
            },
            updated_at: now
        };

        const { error: saveErr } = await supabase
            .from('website_section_configs')
            .upsert(payload, { onConflict: 'section_id' });

        if (saveErr) {
            console.error('[API process-templates] upsert error:', saveErr);
            return NextResponse.json({ success: false, error: saveErr.message }, { status: 500 });
        }

        // If caller also sent categoryAssignments, sync each category's process.templateId & enabled
        if (body.categoryAssignments && typeof body.categoryAssignments === 'object') {
            const { data: existingCatRows } = await supabase
                .from('website_section_configs')
                .select('section_id, extra_config')
                .like('section_id', 'ecom-v2-cat-%');

            const existingMap = new Map();
            (existingCatRows || []).forEach((r) => existingMap.set(r.section_id, r.extra_config || {}));

            const upserts = [];
            for (const cat of V2_CATEGORIES) {
                const assign = body.categoryAssignments[cat.slug];
                if (!assign) continue;

                const sectionId = `ecom-v2-cat-${cat.slug}`;
                const existingExtra = existingMap.get(sectionId) || getCategoryDefaultConfig(cat.slug, cat.name);
                const nextProcess = {
                    enabled: assign.enabled !== false,
                    templateId: assign.templateId || null
                };

                upserts.push({
                    section_id: sectionId,
                    extra_config: {
                        ...existingExtra,
                        page_slug: `v2/services/${cat.slug}`,
                        categorySlug: cat.slug,
                        categoryName: cat.name,
                        process: nextProcess
                    },
                    updated_at: now
                });
            }

            if (upserts.length > 0) {
                const { error: catErr } = await supabase
                    .from('website_section_configs')
                    .upsert(upserts, { onConflict: 'section_id' });

                if (catErr) {
                    console.error('[API process-templates] category sync error:', catErr);
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Our Process templates saved successfully',
            data: normalized
        });
    } catch (err) {
        console.error('[API process-templates] POST error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
