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
    // All reads use REST with cache:'no-store' to bypass Next.js fetch cache and SDK bugs
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const headers = { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` };
    const encoded = encodeURIComponent(pageId);
    const fetchOpts = { headers, cache: 'no-store' };

    // Fetch main page_settings row
    const pageRes = await fetch(
        `${supabaseUrl}/rest/v1/page_settings?page_id=eq.${encoded}&select=*`,
        fetchOpts
    );
    const pageArr = await pageRes.json();
    const page = Array.isArray(pageArr) && pageArr.length > 0 ? pageArr[0] : null;

    // Fetch mapping tables
    const [problemsRes, servicesRes, localitiesRes, brandsRes, faqsRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/page_problems?page_id=eq.${encoded}&order=display_order.asc&select=*`, fetchOpts),
        fetch(`${supabaseUrl}/rest/v1/page_services?page_id=eq.${encoded}&order=display_order.asc&select=*`, fetchOpts),
        fetch(`${supabaseUrl}/rest/v1/page_localities?page_id=eq.${encoded}&order=display_order.asc&select=*`, fetchOpts),
        fetch(`${supabaseUrl}/rest/v1/page_brands_mapping?page_id=eq.${encoded}&select=brand_id`, fetchOpts),
        fetch(`${supabaseUrl}/rest/v1/page_faqs_mapping?page_id=eq.${encoded}&select=faq_id`, fetchOpts)
    ]);

    const [problems, services, localities, brandsMapping, faqsMapping] = await Promise.all([
        problemsRes.json(),
        servicesRes.json(),
        localitiesRes.json(),
        brandsRes.json(),
        faqsRes.json()
    ]);

    logToFile(`[getFullPageData-REST] ${pageId} → L=${Array.isArray(localities) ? localities.length : 'err'} S=${Array.isArray(services) ? services.length : 'err'} P=${Array.isArray(problems) ? problems.length : 'err'}`);
    console.log(`[getFullPageData-REST] ${pageId} → localities: ${Array.isArray(localities) ? localities.length : JSON.stringify(localities)}`);

    return {
        data: page || null,
        related: {
            problems: Array.isArray(problems) ? problems : [],
            services: Array.isArray(services) ? services : [],
            localities: Array.isArray(localities) ? localities : [],
            brandIds: Array.isArray(brandsMapping) ? brandsMapping.map(m => m.brand_id) : [],
            faqIds: Array.isArray(faqsMapping) ? faqsMapping.map(m => m.faq_id) : []
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
        const upsertData = {
            page_id: pageId,
            page_type: getPageType(pageId),
            hero_settings: body.hero_settings || {},
            problems_settings: body.problems_settings || {},
            brands_settings: body.brands_settings || { items: [] },
            localities_settings: body.localities_settings || { items: [] },
            services_settings: body.services_settings || { items: [] },
            subcategories_settings: body.subcategories_settings || { items: [] },
            faqs_settings: body.faqs_settings || { items: [] },
            section_visibility: body.section_visibility || {},
            updated_at: new Date().toISOString()
        };

        console.log(`[API-PUT] Executing main upsert for ${pageId}...`);
        const { data: upsertedRows, error: mainError } = await supabase
            .from('page_settings')
            .upsert(upsertData, { onConflict: 'page_id' })
            .select();

        if (mainError) {
            const err = `[API-PUT] Main Upsert FAILURE for ${pageId}: ${mainError.message}`;
            console.error(err);
            logToFile(err);
            return NextResponse.json({
                success: false,
                error: 'Main table save failed',
                details: mainError.message,
                code: mainError.code
            }, { status: 500 });
        }
        logToFile(`[API-PUT] Main Upsert SUCCESS for ${pageId}. Row ID: ${upsertedRows?.[0]?.id}`);
        console.log(`[API-PUT] Main Upsert SUCCESS. ID: ${upsertedRows?.[0]?.id}`);

        // 2. Conditionally clear and update related tables via REST API
        // NOTE: The Supabase JS SDK silently inserts only 1 row for mapping tables.
        // Direct REST calls are used instead as they work correctly.
        const problemsItems = body.problems_settings?.items || [];
        const servicesItems = body.services_settings?.items || [];
        const localitiesItems = body.localities_settings?.items || [];
        const brandsItems = body.brands_settings?.items || [];
        const faqsItems = body.faqs_settings?.items || [];

        logToFile(`[API-PUT] Items to save for ${pageId}: P=${problemsItems.length}, S=${servicesItems.length}, L=${localitiesItems.length}, B=${brandsItems.length}, F=${faqsItems.length}`);
        console.log(`[API-PUT] Items counts: P=${problemsItems.length}, S=${servicesItems.length}, L=${localitiesItems.length}`);

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const restHeaders = {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        };
        const encoded = encodeURIComponent(pageId);

        // Helper: DELETE all rows for this page from a table via REST
        const restDelete = (table) =>
            fetch(`${supabaseUrl}/rest/v1/${table}?page_id=eq.${encoded}`, {
                method: 'DELETE',
                headers: restHeaders
            });

        // Helper: INSERT rows into a table via REST
        const restInsert = (table, rows) =>
            fetch(`${supabaseUrl}/rest/v1/${table}`, {
                method: 'POST',
                headers: restHeaders,
                body: JSON.stringify(rows)
            });

        // Only touch a table's rows when the incoming items array is non-empty
        const ops = [];

        if (problemsItems.length > 0) {
            ops.push(async () => {
                await restDelete('page_problems');
                const res = await restInsert('page_problems', problemsItems.map((item, i) => ({
                    page_id: pageId,
                    problem_title: item.question || item.title || 'Unnamed Problem',
                    problem_description: item.answer || item.description || '',
                    display_order: i
                })));
                const ok = res.ok || res.status === 201;
                logToFile(`[API-PUT] ${ok ? 'INSERT SUCCESS' : 'INSERT ERROR'} for problems (${pageId}) rows=${problemsItems.length}`);
            });
        }

        if (servicesItems.length > 0) {
            ops.push(async () => {
                await restDelete('page_services');
                const res = await restInsert('page_services', servicesItems.map((item, i) => ({
                    page_id: pageId,
                    service_name: item.name || 'Unnamed Service',
                    price_starts_at: (item.price || 0).toString(),
                    display_order: i
                })));
                const ok = res.ok || res.status === 201;
                logToFile(`[API-PUT] ${ok ? 'INSERT SUCCESS' : 'INSERT ERROR'} for services (${pageId}) rows=${servicesItems.length}`);
            });
        }

        if (localitiesItems.length > 0) {
            ops.push(async () => {
                await restDelete('page_localities');
                const res = await restInsert('page_localities', localitiesItems.map((item, i) => ({
                    page_id: pageId,
                    locality_name: typeof item === 'string' ? item : (item.name || 'Unnamed Locality'),
                    display_order: i
                })));
                const ok = res.ok || res.status === 201;
                logToFile(`[API-PUT] ${ok ? 'INSERT SUCCESS' : 'INSERT ERROR'} for localities (${pageId}) rows=${localitiesItems.length}`);
                if (!ok) {
                    const text = await res.text();
                    logToFile(`[API-PUT] Insert localities error body: ${text}`);
                }
            });
        }

        // Always delete+reinsert brands mapping (delete even when empty, to allow full deselection)
        ops.push(async () => {
            await restDelete('page_brands_mapping');
            if (brandsItems.length > 0) {
                const res = await restInsert('page_brands_mapping', brandsItems.map((brandId, i) => ({
                    page_id: pageId,
                    brand_id: brandId,
                    display_order: i
                })));
                const ok = res.ok || res.status === 201;
                logToFile(`[API-PUT] ${ok ? 'INSERT SUCCESS' : 'INSERT ERROR'} for brands (${pageId}) rows=${brandsItems.length}`);
            } else {
                logToFile(`[API-PUT] Cleared all brands for ${pageId}`);
            }
        });

        // Always delete+reinsert faqs mapping (delete even when empty, to allow full deselection)
        ops.push(async () => {
            await restDelete('page_faqs_mapping');
            if (faqsItems.length > 0) {
                const res = await restInsert('page_faqs_mapping', faqsItems.map((faqId, i) => ({
                    page_id: pageId,
                    faq_id: faqId,
                    display_order: i
                })));
                const ok = res.ok || res.status === 201;
                logToFile(`[API-PUT] ${ok ? 'INSERT SUCCESS' : 'INSERT ERROR'} for faqs (${pageId}) rows=${faqsItems.length}`);
            } else {
                logToFile(`[API-PUT] Cleared all FAQs for ${pageId}`);
            }
        });

        // Run all delete+insert sequences in parallel
        await Promise.all(ops.map(op => op()));


        const endMsg = `[API-PUT] END: Successfully saved all data for ${pageId}`;
        console.log(endMsg);
        logToFile(endMsg);

        // Fetch fresh state to return
        const fullData = await getFullPageData(supabase, pageId);
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
