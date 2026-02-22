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

export async function GET(request, { params }) {
    const { pageId } = params;
    console.log(`[API-GET] START for ${pageId}`);

    const supabase = createServerSupabase();
    if (!supabase) {
        return NextResponse.json({ success: false, error: 'Database connection missing' }, { status: 500 });
    }

    try {
        console.log(`[API-GET] Fetching settings for: ${pageId}`);
        const { data: page, error } = await supabase
            .from('page_settings')
            .select('*')
            .eq('page_id', pageId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[API-GET] Error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // Fetch related data in parallel
        const [
            { data: problems },
            { data: services },
            { data: localities },
            { data: brandsMapping },
            { data: faqsMapping }
        ] = await Promise.all([
            supabase.from('page_problems').select('*').eq('page_id', pageId).order('display_order', { ascending: true }),
            supabase.from('page_services').select('*').eq('page_id', pageId).order('display_order', { ascending: true }),
            supabase.from('page_localities').select('*').eq('page_id', pageId).order('display_order', { ascending: true }),
            supabase.from('page_brands_mapping').select('brand_id').eq('page_id', pageId),
            supabase.from('page_faqs_mapping').select('faq_id').eq('page_id', pageId)
        ]);

        console.log(`[API-GET] SUCCESS for ${pageId}`);
        return NextResponse.json({
            success: true,
            data: page || null,
            related: {
                problems: problems || [],
                services: services || [],
                localities: localities || [],
                brandIds: brandsMapping?.map(m => m.brand_id) || [],
                faqIds: faqsMapping?.map(m => m.faq_id) || []
            }
        });
    } catch (error) {
        console.error('[API-GET] Catch Error:', error);
        console.error(`[API-GET] CRITICAL ERROR for ${pageId}: ${error.message}`);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    const { pageId } = params;

    // --- LOUD SERVER LOGGING ---
    const startMsg = `[API-PUT] START: ${pageId}`;
    console.log('\n' + '='.repeat(60));
    console.log(startMsg);
    console.log('='.repeat(60));
    logToFile(startMsg);

    const supabase = createServerSupabase();
    if (!supabase) {
        const err = `[API-PUT] FATAL: Supabase client could not be initialized for ${pageId}. Check env vars.`;
        console.error(err);
        logToFile(err);
        return NextResponse.json({
            success: false,
            error: 'Database connection missing',
            debug: { url: !!process.env.NEXT_PUBLIC_SUPABASE_URL, key: !!process.env.SUPABASE_SERVICE_ROLE_KEY }
        }, { status: 500 });
    }

    let body;
    try {
        logToFile(`[API-PUT] Attempting to parse request body for ${pageId}...`);
        body = await request.json();
        logToFile(`[API-PUT] Body parsed SUCCESSFULLY for ${pageId}`);
    } catch (parseError) {
        const parseErrMsg = `[API-PUT] JSON Parse FAILURE for ${pageId}: ${parseError.message}`;
        console.error(parseErrMsg);
        logToFile(parseErrMsg);
        return NextResponse.json({ success: false, error: 'Invalid JSON body', details: parseError.message }, { status: 400 });
    }

    try {
        const bodyMsg = `[API-PUT] Request Body Data: Problems: ${body.problems_settings?.items?.length || 0}, Services: ${body.services_settings?.items?.length || 0}`;
        console.log(bodyMsg);
        logToFile(bodyMsg);

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

        // 2. Clear and update related tables
        console.log(`[API-PUT] Clearing mapping tables for ${pageId}...`);
        const cleanup = await Promise.all([
            supabase.from('page_problems').delete().eq('page_id', pageId),
            supabase.from('page_services').delete().eq('page_id', pageId),
            supabase.from('page_localities').delete().eq('page_id', pageId),
            supabase.from('page_brands_mapping').delete().eq('page_id', pageId),
            supabase.from('page_faqs_mapping').delete().eq('page_id', pageId)
        ]);

        const cleanupErrors = cleanup.filter(r => r.error).map(r => r.error);
        if (cleanupErrors.length > 0) {
            console.warn('[API-PUT] Cleanup had errors (non-fatal):', cleanupErrors);
        }

        const inserts = [];

        if (body.problems_settings?.items?.length > 0) {
            console.log(`[API-PUT] Inserting ${body.problems_settings.items.length} problems...`);
            inserts.push(supabase.from('page_problems').insert(
                body.problems_settings.items.map((item, index) => ({
                    page_id: pageId,
                    problem_title: item.question || item.title || 'Unnamed Problem',
                    problem_description: item.answer || item.description || '',
                    display_order: index
                }))
            ));
        }

        if (body.services_settings?.items?.length > 0) {
            console.log(`[API-PUT] Inserting ${body.services_settings.items.length} services...`);
            inserts.push(supabase.from('page_services').insert(
                body.services_settings.items.map((item, index) => ({
                    page_id: pageId,
                    service_name: item.name || 'Unnamed Service',
                    price_starts_at: parseInt(item.price) || 0,
                    display_order: index
                }))
            ));
        }

        if (body.localities_settings?.items?.length > 0) {
            console.log(`[API-PUT] Inserting ${body.localities_settings.items.length} localities...`);
            inserts.push(supabase.from('page_localities').insert(
                body.localities_settings.items.map((item, index) => ({
                    page_id: pageId,
                    locality_name: typeof item === 'string' ? item : (item.name || 'Unnamed Locality'),
                    display_order: index
                }))
            ));
        }

        if (body.brands_settings?.items?.length > 0) {
            console.log(`[API-PUT] Inserting ${body.brands_settings.items.length} brands...`);
            inserts.push(supabase.from('page_brands_mapping').insert(
                body.brands_settings.items.map((brandId, index) => ({
                    page_id: pageId,
                    brand_id: brandId,
                    display_order: index
                }))
            ));
        }

        if (body.faqs_settings?.items?.length > 0) {
            console.log(`[API-PUT] Inserting ${body.faqs_settings.items.length} FAQs...`);
            inserts.push(supabase.from('page_faqs_mapping').insert(
                body.faqs_settings.items.map((faqId, index) => ({
                    page_id: pageId,
                    faq_id: faqId,
                    display_order: index
                }))
            ));
        }

        if (inserts.length > 0) {
            const results = await Promise.all(inserts);
            const errors = results.filter(r => r.error).map(r => r.error);
            if (errors.length > 0) {
                console.error('[API-PUT] Related Insert FAILURE:', errors);
                return NextResponse.json({
                    success: false,
                    error: 'Related data save failed',
                    details: errors[0].message,
                    code: errors[0].code
                }, { status: 500 });
            }
        }

        const endMsg = `[API-PUT] END: Successfully saved all data for ${pageId}`;
        console.log(endMsg + '\n' + '='.repeat(60));
        logToFile(endMsg);
        return NextResponse.json({ success: true, data: upsertedRows?.[0] });

    } catch (error) {
        console.error('[API-PUT] GLOBAL CRITICAL ERROR:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
