import { createServerSupabase } from '@/lib/supabase-server';

/**
 * Shared utility for fetching page dynamic settings directly from Supabase.
 * This is used by both the API routes (for admin) and the Server Components (for live pages)
 * to avoid HTTP loopback fetch failures on Vercel deployments.
 */
export async function getFullPageData(pageId, supabaseClient = null) {
    const supabase = supabaseClient || createServerSupabase();
    if (!supabase) {
        throw new Error('Database connection missing');
    }

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

    if (pageRes.error) console.error(`[getFullPageData] page_settings error: ${pageRes.error.message}`);

    return {
        success: true,
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

export async function resolveFaqs(faqIds, supabaseClient = null) {
    if (!faqIds || faqIds.length === 0) return { success: true, faqs: [] };

    const supabase = supabaseClient || createServerSupabase();
    if (!supabase) return { success: false, error: 'DB connection missing' };

    try {
        const { data: faqRows, error } = await supabase
            .from('website_faqs')
            .select('id, question, answer')
            .in('id', faqIds);

        if (error) throw error;

        const resolved = faqIds
            .map(id => faqRows.find(f => f.id === id))
            .filter(Boolean)
            .map(f => ({ question: f.question, answer: f.answer }));

        return { success: true, faqs: resolved };
    } catch (err) {
        console.error('[resolveFaqs] Error:', err.message);
        return { success: false, error: err.message };
    }
}
