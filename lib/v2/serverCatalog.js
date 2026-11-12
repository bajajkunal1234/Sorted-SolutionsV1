import { createServerSupabase } from '@/lib/supabase-server';
import {
    V2_CATEGORIES,
    getCategoryBySlug,
    normalizeWebServiceItem,
} from '@/lib/v2/catalogConfig';

export const WEB_SERVICE_SELECT_FIELDS =
    'id, name, category, subcategory, sku, description, type, subtype, status, sale_price, selling_price, retail_price, gst_applicable, gst_rate, sac_code, hsn_code, images, terms_conditions, service_terms_template, job_type';

/**
 * Fetches all active website-published inventory items (strictly subtype = 'web').
 */
export async function fetchPublishedWebServices({ categorySlug = null, query = null } = {}) {
    const supabase = createServerSupabase();
    const { data: rows, error } = await supabase
        .from('inventory')
        .select(WEB_SERVICE_SELECT_FIELDS)
        .eq('subtype', 'web')
        .eq('status', 'active')
        .order('name', { ascending: true });

    if (error) throw error;

    const allServices = (rows || []).map(normalizeWebServiceItem);

    const categoryCounts = {};
    allServices.forEach(item => {
        categoryCounts[item.categorySlug] = (categoryCounts[item.categorySlug] || 0) + 1;
    });

    const categories = V2_CATEGORIES.map(cat => ({
        ...cat,
        count: categoryCounts[cat.slug] || 0,
    }));

    let services = allServices;
    const catParam = (categorySlug || '').trim().toLowerCase();
    if (catParam && catParam !== 'all') {
        const matched = getCategoryBySlug(catParam);
        if (matched) {
            services = services.filter(item => item.categorySlug === matched.slug);
        } else {
            services = services.filter(
                item =>
                    item.categorySlug === catParam ||
                    item.dbCategory.toLowerCase() === catParam
            );
        }
    }

    const q = (query || '').trim().toLowerCase();
    if (q) {
        services = services.filter(
            item =>
                item.name.toLowerCase().includes(q) ||
                item.categoryName.toLowerCase().includes(q) ||
                item.subgroup.toLowerCase().includes(q) ||
                item.description.toLowerCase().includes(q)
        );
    }

    return {
        categories,
        services,
        categoryCounts,
        totalPublished: allServices.length,
    };
}
