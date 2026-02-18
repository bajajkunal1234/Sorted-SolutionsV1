import { supabase } from './supabase';

export async function fetchAppContent(key) {
    if (!supabase) return null;

    try {
        const { data, error } = await supabase
            .from('website_settings')
            .select('value')
            .eq('key', key)
            .single();

        if (error) {
            console.error(`Error fetching app content for key "${key}":`, error);
            return null;
        }

        return data?.value || null;
    } catch (err) {
        console.error(`Unexpected error fetching app content for key "${key}":`, err);
        return null;
    }
}
