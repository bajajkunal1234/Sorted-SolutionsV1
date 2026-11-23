import { createServerSupabase } from '@/lib/supabase-server';
import {
    PROCESS_TEMPLATES_SECTION_ID,
    normalizeProcessTemplatesPayload
} from '@/lib/v2/processTemplates';

// ── In-Memory Server Cache (15-second TTL) ──────────────────────────────────
const CACHE_TTL_MS = 15 * 1000;
let processTemplatesCache = { data: null, timestamp: 0 };

export function invalidateProcessTemplatesCache() {
    processTemplatesCache = { data: null, timestamp: 0 };
}

/**
 * Fetch saved Our Process templates config from Supabase (server-side only).
 */
export async function fetchProcessTemplatesConfig(supabaseClient = null) {
    const now = Date.now();
    if (processTemplatesCache.data && (now - processTemplatesCache.timestamp < CACHE_TTL_MS)) {
        return processTemplatesCache.data;
    }

    const supabase = supabaseClient || createServerSupabase();
    if (!supabase) {
        return normalizeProcessTemplatesPayload(null);
    }

    try {
        const { data } = await supabase
            .from('website_section_configs')
            .select('extra_config')
            .eq('section_id', PROCESS_TEMPLATES_SECTION_ID)
            .maybeSingle();

        const result = normalizeProcessTemplatesPayload(data?.extra_config || null);
        processTemplatesCache = { data: result, timestamp: now };
        return result;
    } catch (err) {
        console.error('[processTemplatesServer] fetch error:', err?.message);
        return normalizeProcessTemplatesPayload(null);
    }
}
