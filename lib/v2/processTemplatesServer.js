import { createServerSupabase } from '@/lib/supabase-server';
import {
    PROCESS_TEMPLATES_SECTION_ID,
    normalizeProcessTemplatesPayload
} from '@/lib/v2/processTemplates';

/**
 * Fetch saved Our Process templates config from Supabase (server-side only).
 */
export async function fetchProcessTemplatesConfig(supabaseClient = null) {
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

        return normalizeProcessTemplatesPayload(data?.extra_config || null);
    } catch (err) {
        console.error('[processTemplatesServer] fetch error:', err?.message);
        return normalizeProcessTemplatesPayload(null);
    }
}
