import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'api_debug.log');

function logToFile(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    try {
        fs.appendFileSync(LOG_FILE, logLine);
    } catch (e) {
        console.error('Failed to write to log file', e);
    }
}

export const dynamic = 'force-dynamic';

async function getFullPageData(supabase, pageId) {
    // Use the Supabase SDK for reads — avoids Windows Node.js TLS issues with raw fetch()
    const [
        pageRes,
        problemsRes,
        servicesRes,
        localitiesRes,
        brandsRes,
        faqsRes
    ] = await Promise.all([
        supabase.from('page_settings').select('*').eq('page_id', pageId).maybeSingle(),
        supabase.from('page_problems').select('*').eq('page_id', pageId).order('display_order', { ascending: true }),
        supabase.from('page_services').select('*').eq('page_id', pageId).order('display_order', { ascending: true }),
        supabase.from('page_localities').select('*').eq('page_id', pageId).order('display_order', { ascending: true }),
        supabase.from('page_brands_mapping').select('brand_id').eq('page_id', pageId),
        supabase.from('page_faqs_mapping').select('faq_id').eq('page_id', pageId).order('display_order', { ascending: true })
    ]);

    const page = pageRes.data || null;
    const problems = problemsRes.data || [];
    const services = servicesRes.data || [];
    const localities = localitiesRes.data || [];
    const brandsMapping = brandsRes.data || [];
    const faqsMapping = faqsRes.data || [];

    // Log any individual SDK errors (helps diagnose ipv4-fetch issues)
    if (pageRes.error) console.error(`[getFullPageData] page_settings error: ${pageRes.error.message}`);
    if (problemsRes.error) console.error(`[getFullPageData] page_problems error: ${problemsRes.error.message}`);
    if (servicesRes.error) console.error(`[getFullPageData] page_services error: ${servicesRes.error.message}`);

    console.log(`[getFullPageData-SDK] ${pageId} → page=${!!page} L=${localities.length} S=${services.length} P=${problems.length}`);

    console.log(`[getFullPageData-SDK] ${pageId} → L=${localities.length} S=${services.length} P=${problems.length}`);

    return {
        data: page,
        related: {
            problems,
            services,
            localities,
            brandIds: brandsMapping.map(m => m.brand_id),
            faqIds: faqsMapping.map(m => m.faq_id)
        }
    };
}


export async function GET(request, { params }) {
    const { pageId } = params;
    console.log(`[API-GET] START for ${pageId}`);

    const supabase = createServerSupabase();
    if (!supabase) {
        return NextResponse.json({ success: false, error: 'Database connection missing' }, { status: 500 });
    }

    try {
        const fullData = await getFullPageData(supabase, pageId);
        console.log(`[API-GET] SUCCESS for ${pageId}`);
        return NextResponse.json({
            success: true,
            ...fullData
        });
    } catch (error) {
        console.error(`[API-GET] CRITICAL ERROR for ${pageId}: ${error.message}`);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    const { pageId } = params;

    // ── Saving Settings ──
    const startMsg = `[API-PUT] START: ${pageId}`;
    console.log(startMsg);
    logToFile(startMsg);

    const supabase = createServerSupabase();
    if (!supabase) {
        const err = `[API-PUT] FATAL: Supabase client could not be initialized for ${pageId}`;
        console.error(err);
        logToFile(err);
        return NextResponse.json({
            success: false,
            error: 'Database connection missing'
        }, { status: 500 });
    }

    let body;
    try {
        const rawBody = await request.text();
        if (!rawBody) {
            logToFile(`[API-PUT] CRITICAL: Raw body is EMPTY for ${pageId}`);
            return NextResponse.json({ success: false, error: 'Empty request body' }, { status: 400 });
        }
        body = JSON.parse(rawBody);
        logToFile(`[API-PUT] START for ${pageId}. Items: problems=${body.problems_settings?.items?.length || 0}, services=${body.services_settings?.items?.length || 0}, localities=${body.localities_settings?.items?.length || 0}`);
        console.log(`[API-PUT] body keys: ${Object.keys(body).join(', ')}`);
        if (body.services_settings?.items?.length > 0) {
            console.log(`[API-PUT] First service: ${JSON.stringify(body.services_settings.items[0])}`);
        }
    } catch (parseError) {
        logToFile(`[API-PUT] Parse Error: ${parseError.message}`);
        console.error(`[API-PUT] Parse Error Details:`, parseError);
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    try {

        // 1. Upsert main page settings
        const getPageType = (id) => {
            if (id.startsWith('sloc-')) return 'sublocation';
            if (id.startsWith('sub-')) return 'subcategory';
            if (id.startsWith('cat-')) return 'category';
            if (id.startsWith('loc-')) return 'location';
            return 'page';
        };

        const newPageId = body.page_id || pageId;
        const isRename = newPageId !== pageId;

        const upsertData = {
            page_id: newPageId,
            page_type: getPageType(newPageId),
            hero_settings: body.hero_settings || {},
            issues_settings: body.issues_settings || {},
            problems_settings: body.problems_settings || {},
            brands_settings: body.brands_settings || { items: [] },
            localities_settings: body.localities_settings || { items: [] },
            services_settings: body.services_settings || { items: [] },
            subcategories_settings: body.subcategories_settings || { items: [] },
            faqs_settings: body.faqs_settings || { items: [] },
            section_visibility: body.section_visibility || {},
            section_order: body.section_order || null,
            updated_at: new Date().toISOString()
        };

        console.log(`[API-PUT] Executing main upsert for ${newPageId}${isRename ? ` (RENAME from ${pageId})` : ''}...`);
        const { data: upsertedRows, error: mainError } = await supabase
            .from('page_settings')
            .upsert(upsertData, { onConflict: 'page_id' })
            .select();

        if (mainError) {
            const err = `[API-PUT] Main Upsert FAILURE for ${newPageId}: ${mainError.message}`;
            console.error(err);
            logToFile(err);
            return NextResponse.json({
                success: false,
                error: 'Main table save failed',
                details: mainError.message,
                code: mainError.code
            }, { status: 500 });
        }
        logToFile(`[API-PUT] Main Upsert SUCCESS for ${newPageId}.`);

        const problemsItems = body.problems_settings?.items || [];
        const servicesItems = body.services_settings?.items || [];
        const localitiesItems = body.localities_settings?.items || [];
        const brandsItems = body.brands_settings?.items || [];
        const faqsItems = body.faqs_settings?.items || [];

        // 2. Sync mapping tables using RAW SQL
        // If it's a rename, we MUST ensure the old records (which might be under pageId) are gone
        // The sync logic below uses newPageId for INSERTs.
        logToFile(`[API-PUT] Constructing Raw SQL sync for ${newPageId}`);

        let syncSql = `
            -- Delete existing records for the NEW ID (standard sync)
            DELETE FROM page_problems WHERE page_id = '${newPageId}';
            DELETE FROM page_services WHERE page_id = '${newPageId}';
            DELETE FROM page_localities WHERE page_id = '${newPageId}';
            DELETE FROM page_brands_mapping WHERE page_id = '${newPageId}';
            DELETE FROM page_faqs_mapping WHERE page_id = '${newPageId}';
        `;

        // If it's a rename, also clean up the OLD ID records
        if (isRename) {
            syncSql += `
                DELETE FROM page_problems WHERE page_id = '${pageId}';
                DELETE FROM page_services WHERE page_id = '${pageId}';
                DELETE FROM page_localities WHERE page_id = '${pageId}';
                DELETE FROM page_brands_mapping WHERE page_id = '${pageId}';
                DELETE FROM page_faqs_mapping WHERE page_id = '${pageId}';
                DELETE FROM page_settings WHERE page_id = '${pageId}';
            `;
        }

        if (problemsItems.length > 0) {
            const values = problemsItems.map((item, i) => {
                const title = (item.question || item.title || 'Unnamed Problem').replace(/'/g, "''");
                const desc = (item.answer || item.description || '').replace(/'/g, "''");
                return `('${newPageId}', '${title}', '${desc}', ${i})`;
            }).join(', ');
            syncSql += `INSERT INTO page_problems (page_id, problem_title, problem_description, display_order) VALUES ${values};`;
        }

        if (servicesItems.length > 0) {
            const values = servicesItems.map((item, i) => {
                const name = (item.name || 'Unnamed Service').replace(/'/g, "''");
                const price = (item.price || 0).toString().replace(/'/g, "''");
                return `('${newPageId}', '${name}', '${price}', ${i})`;
            }).join(', ');
            syncSql += `INSERT INTO page_services (page_id, service_name, price_starts_at, display_order) VALUES ${values};`;
        }

        if (localitiesItems.length > 0) {
            const values = localitiesItems.map((item, i) => {
                const name = (typeof item === 'string' ? item : (item.name || 'Unnamed Locality')).replace(/'/g, "''");
                return `('${newPageId}', '${name}', ${i})`;
            }).join(', ');
            syncSql += `INSERT INTO page_localities (page_id, locality_name, display_order) VALUES ${values};`;
        }

        if (brandsItems.length > 0) {
            const values = brandsItems.map((brandId, i) => `('${newPageId}', '${brandId}', ${i})`).join(', ');
            syncSql += `INSERT INTO page_brands_mapping (page_id, brand_id, display_order) VALUES ${values};`;
        }

        if (faqsItems.length > 0) {
            const values = faqsItems.map((faqId, i) => `('${newPageId}', '${faqId}', ${i})`).join(', ');
            syncSql += `INSERT INTO page_faqs_mapping (page_id, faq_id, display_order) VALUES ${values};`;
        }

        logToFile(`[API-PUT] Executing Raw SQL sync for ${newPageId}...`);
        const { error: syncError } = await supabase.rpc('exec_sql', { sql_query: syncSql });

        if (syncError) {
            logToFile(`[API-PUT] Sync ERROR for ${newPageId}: ${syncError.message}`);
        } else {
            logToFile(`[API-PUT] Raw SQL Sync SUCCESS for ${newPageId}`);
        }

        const endMsg = `[API-PUT] END: Successfully saved all data for ${newPageId}`;
        console.log(endMsg);
        logToFile(endMsg);

        // Fetch fresh state to return
        // We use newPageId here!
        const fullData = await getFullPageData(supabase, newPageId);
        return NextResponse.json({ success: true, ...fullData });

    } catch (error) {
        console.error('[API-PUT] GLOBAL CRITICAL ERROR:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
}
