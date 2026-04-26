import { getSupabaseServer } from '@/lib/supabase-server';
import { unstable_cache } from 'next/cache';

/**
 * Fetches hierarchical booking data and global settings from Supabase.
 * This can be used on the server (API or Server Components) to avoid client-side fetches.
 */
export async function fetchQuickBookingData() {
    const supabase = getSupabaseServer();
    if (!supabase) return null;

    try {
        // Fetch all categories
        const { data: categories, error: catError } = await supabase
            .from('booking_categories')
            .select('*')
            .order('display_order', { ascending: true });

        if (catError) throw catError;

        // Fetch all subcategories
        const { data: subcategories, error: subError } = await supabase
            .from('booking_subcategories')
            .select('*')
            .order('display_order', { ascending: true });

        if (subError) throw subError;

        // Fetch all issues
        const { data: issues, error: issueError } = await supabase
            .from('booking_issues')
            .select('*')
            .order('display_order', { ascending: true });

        if (issueError) throw issueError;

        // Build hierarchical structure
        const hierarchicalData = (categories || []).map(category => ({
            id: category.id,
            name: category.name,
            slug: category.slug || null,
            showOnBookingForm: category.show_on_booking_form,
            displayOrder: category.display_order,
            subcategories: (subcategories || [])
                .filter(sub => sub.category_id === category.id)
                .map(sub => ({
                    id: sub.id,
                    name: sub.name,
                    slug: sub.slug || null,
                    showOnBookingForm: sub.show_on_booking_form,
                    displayOrder: sub.display_order,
                    issues: (issues || [])
                        .filter(issue => issue.subcategory_id === sub.id)
                        .map(issue => ({
                            id: issue.id,
                            name: issue.name,
                            showOnBookingForm: issue.show_on_booking_form,
                            displayOrder: issue.display_order,
                            price: issue.price ?? null,
                            price_label: issue.price_label || 'Starting from'
                        }))
                }))
        }));

        // Fetch global settings from quick_booking_settings table
        const { data: globalSettings } = await supabase
            .from('quick_booking_settings')
            .select('*')
            .single();

        return {
            title: globalSettings?.title || 'Book A Technician Now',
            subtitle: globalSettings?.subtitle || 'Get same day service | Transparent pricing | Licensed technicians',
            serviceable_pincodes: globalSettings?.serviceable_pincodes || ['400001', '400002', '400003', '400004', '400005', '400008', '400012', '400014', '400050', '400051', '400052', '400053', '400063', '400070', '400077'],
            advanced_pincodes: globalSettings?.advanced_pincodes || [],
            valid_pincode_message: globalSettings?.valid_pincode_message || '✓ We serve here!',
            invalid_pincode_message: globalSettings?.invalid_pincode_message || '✗ Not serviceable',
            help_text: globalSettings?.help_text || 'We currently serve Mumbai areas. Call us for other locations.',
            categories: hierarchicalData
        };
    } catch (error) {
        console.error('Error fetching quick booking data from Supabase:', error);
        return null;
    }
}

/**
 * Cached version — same data but served from Next.js Data Cache for up to 5 minutes.
 * Use this in Server Components (service pages, location pages).
 * API routes and admin pages should call fetchQuickBookingData() directly (always fresh).
 */
export const cachedFetchQuickBookingData = unstable_cache(
    () => fetchQuickBookingData(),
    ['quick-booking-data'],
    { revalidate: 300 } // 5 minutes
)
