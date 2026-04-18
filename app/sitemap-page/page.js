/**
 * Human-readable sitemap at /sitemap-page
 * Server Component — fetches data, passes to SitemapViewer client component.
 * Google uses /sitemap.xml — this page is for humans.
 */

import { createServerSupabase } from '@/lib/supabase-server';
import { unstable_noStore as noStore } from 'next/cache';
import SitemapViewer from './SitemapViewer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
    title: 'Sitemap | Sorted Solutions',
    description: 'Complete sitemap of all pages on Sorted Solutions — appliance repair services across Mumbai.',
};

const LOCATIONS = [
    'andheri', 'malad', 'jogeshwari', 'kandivali', 'goregaon',
    'ville-parle', 'santacruz', 'bandra', 'khar', 'mahim',
    'dadar', 'powai', 'saki-naka', 'ghatkopar', 'kurla',
];

const FALLBACK_APPLIANCES = [
    { name: 'AC Repair',          slug: 'ac-repair',              subcategories: [{ name: 'Split AC', slug: 'split-ac' }, { name: 'Window AC', slug: 'window-ac' }, { name: 'Cassette AC', slug: 'cassette-ac' }] },
    { name: 'Washing Machine',    slug: 'washing-machine-repair', subcategories: [{ name: 'Front Load', slug: 'front-load' }, { name: 'Top Load', slug: 'top-load' }] },
    { name: 'Refrigerator',       slug: 'refrigerator-repair',    subcategories: [{ name: 'Single Door', slug: 'single-door' }, { name: 'Double Door', slug: 'double-door' }] },
    { name: 'Oven Repair',        slug: 'oven-repair',            subcategories: [{ name: 'Microwave Oven', slug: 'microwave-oven' }, { name: 'OTG Oven', slug: 'otg-oven' }] },
    { name: 'Water Purifier',     slug: 'water-purifier-repair',  subcategories: [{ name: 'Domestic RO', slug: 'domestic-ro' }, { name: 'Commercial RO', slug: 'commercial-ro' }] },
    { name: 'HOB Repair',         slug: 'hob-repair',             subcategories: [{ name: 'Gas Stove', slug: 'gas-stove' }, { name: 'Built-in HOB', slug: 'built-in-hob' }] },
];

const STATIC_LINKS = [
    { label: 'Home',                  url: '/' },
    { label: 'Book a Repair',         url: '/booking' },
    { label: 'Contact Us',            url: '/contact' },
    { label: 'Terms & Conditions',    url: '/terms' },
    { label: 'Privacy Policy',        url: '/privacy' },
    { label: 'Accessibility',         url: '/accessibility' },
];

async function fetchAppliances() {
    try {
        const supabase = createServerSupabase();
        if (!supabase) return FALLBACK_APPLIANCES;

        const { data: cats } = await supabase
            .from('booking_categories')
            .select('id, name, slug')
            .order('display_order', { ascending: true });

        if (!cats?.length) return FALLBACK_APPLIANCES;

        const { data: subs } = await supabase
            .from('booking_subcategories')
            .select('id, name, slug, category_id')
            .order('display_order', { ascending: true });

        return cats.map(cat => ({
            name: cat.name,
            slug: cat.slug,
            subcategories: (subs || [])
                .filter(s => s.category_id === cat.id)
                .map(s => ({ name: s.name, slug: s.slug || s.name.toLowerCase().replace(/\s+/g, '-') })),
        }));
    } catch {
        return FALLBACK_APPLIANCES;
    }
}

export default async function SitemapPage() {
    noStore();
    const appliances = await fetchAppliances();

    return (
        <SitemapViewer
            staticLinks={STATIC_LINKS}
            appliances={appliances}
            locations={LOCATIONS}
        />
    );
}
