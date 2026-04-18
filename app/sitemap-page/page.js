/**
 * Human-readable sitemap at /sitemap-page
 * Server Component — fetches ONLY ACTIVE pages directly from page_settings table.
 * No hardcoded logic here — if it's not in the DB, it won't render.
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

const STATIC_LINKS = [
    { label: 'Home',                  url: '/' },
    { label: 'Book a Repair',         url: '/booking' },
    { label: 'Contact Us',            url: '/contact' },
    { label: 'Terms & Conditions',    url: '/terms' },
    { label: 'Privacy Policy',        url: '/privacy' },
    { label: 'Accessibility',         url: '/accessibility' },
];

const KNOWN_CATS = [
    'ac-repair', 'washing-machine-repair', 'refrigerator-repair',
    'oven-repair', 'hob-repair', 'water-purifier-repair',
];

const KNOWN_LOCS = [
    'andheri', 'malad', 'jogeshwari', 'kandivali', 'goregaon',
    'ville-parle', 'santacruz', 'bandra', 'khar', 'mahim',
    'dadar', 'powai', 'saki-naka', 'ghatkopar', 'kurla',
];

export default async function SitemapPage() {
    noStore();

    const supabase = createServerSupabase();
    let categories = [];
    let subcategories = [];
    let locations = [];
    let sublocations = [];

    if (supabase) {
        // Source of truth: only active pages in the DB
        const { data, error } = await supabase
            .from('page_settings')
            .select('page_id')
            .limit(2000);

        if (data && !error) {
            data.forEach(page => {
                const id = page.page_id;
                
                if (id.startsWith('cat-')) {
                    const slug = id.replace('cat-', '');
                    categories.push({ label: slug, url: `/services/${slug}`, slug });
                } 
                else if (id.startsWith('sub-')) {
                    const rest = id.replace('sub-', '');
                    const cat = KNOWN_CATS.find(c => rest.startsWith(c + '-'));
                    if (cat) {
                        const subSlug = rest.slice(cat.length + 1);
                        subcategories.push({ catSlug: cat, label: subSlug, url: `/services/${cat}/${subSlug}`, slug: subSlug });
                    }
                }
                else if (id.startsWith('loc-')) {
                    const slug = id.replace('loc-', '');
                    locations.push({ label: slug, url: `/location/${slug}`, slug });
                }
                else if (id.startsWith('sloc-')) {
                    const rest = id.replace('sloc-', '');
                    const loc = KNOWN_LOCS.find(l => rest.startsWith(l + '-'));
                    if (loc) {
                        const catSlug = rest.slice(loc.length + 1);
                        sublocations.push({ locSlug: loc, catSlug, label: `${catSlug} in ${loc}`, url: `/location/${loc}/${catSlug}` });
                    }
                }
            });
        }
    }

    return (
        <SitemapViewer
            staticLinks={STATIC_LINKS}
            categories={categories}
            subcategories={subcategories}
            locations={locations}
            sublocations={sublocations}
        />
    );
}
