/**
 * Human-readable sitemap at /sitemap-page
 * Shows all site URLs grouped by type in a beautiful visual layout.
 * Google uses /sitemap.xml — this page is for humans.
 */

import { createServerSupabase } from '@/lib/supabase-server';
import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = {
    title: 'Sitemap | Sorted Solutions',
    description: 'Complete sitemap of all pages on Sorted Solutions — appliance repair services across Mumbai.',
};

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://sortedsolutions.in').replace(/\/$/, '');

const LOCATIONS = [
    'andheri', 'malad', 'jogeshwari', 'kandivali', 'goregaon',
    'ville-parle', 'santacruz', 'bandra', 'khar', 'mahim',
    'dadar', 'powai', 'saki-naka', 'ghatkopar', 'kurla',
];

async function fetchAppliances() {
    try {
        const supabase = createServerSupabase();
        if (!supabase) return [];
        const { data: cats } = await supabase.from('booking_categories').select('id, name, slug').order('display_order', { ascending: true });
        if (!cats?.length) return [];
        const { data: subs } = await supabase.from('booking_subcategories').select('id, name, slug, category_id').order('display_order', { ascending: true });
        return cats.map(cat => ({
            name: cat.name,
            slug: cat.slug,
            subcategories: (subs || []).filter(s => s.category_id === cat.id).map(s => ({
                name: s.name,
                slug: s.slug || s.name.toLowerCase().replace(/\s+/g, '-'),
            })),
        }));
    } catch {
        return [
            { name: 'AC Repair', slug: 'ac-repair', subcategories: [{ name: 'Split AC', slug: 'split-ac' }, { name: 'Window AC', slug: 'window-ac' }] },
            { name: 'Washing Machine', slug: 'washing-machine-repair', subcategories: [{ name: 'Front Load', slug: 'front-load' }, { name: 'Top Load', slug: 'top-load' }] },
            { name: 'Refrigerator', slug: 'refrigerator-repair', subcategories: [{ name: 'Single Door', slug: 'single-door' }, { name: 'Double Door', slug: 'double-door' }] },
            { name: 'Oven Repair', slug: 'oven-repair', subcategories: [{ name: 'Microwave', slug: 'microwave-oven' }, { name: 'OTG', slug: 'otg-oven' }] },
            { name: 'Water Purifier', slug: 'water-purifier-repair', subcategories: [{ name: 'Domestic RO', slug: 'domestic-ro' }, { name: 'Commercial RO', slug: 'commercial-ro' }] },
            { name: 'HOB Repair', slug: 'hob-repair', subcategories: [{ name: 'Gas Stove', slug: 'gas-stove' }, { name: 'Built-in HOB', slug: 'built-in-hob' }] },
        ];
    }
}

function toLabel(slug) {
    return slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export default async function SitemapPage() {
    noStore();
    const appliances = await fetchAppliances();

    const staticLinks = [
        { label: 'Home', url: '/' },
        { label: 'Book a Repair', url: '/booking' },
        { label: 'Contact Us', url: '/contact' },
        { label: 'Terms & Conditions', url: '/terms' },
        { label: 'Privacy Policy', url: '/privacy' },
        { label: 'Accessibility Statement', url: '/accessibility' },
    ];

    const totalUrls = 6
        + appliances.length
        + appliances.reduce((a, c) => a + c.subcategories.length, 0)
        + LOCATIONS.length
        + LOCATIONS.length * appliances.length;

    return (
        <div style={{ fontFamily: "'Inter', system-ui, sans-serif", minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderBottom: '1px solid #1e293b', padding: '40px 0 32px' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🗺️</div>
                                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>Site Map</h1>
                            </div>
                            <p style={{ margin: 0, color: '#94a3b8', fontSize: 15 }}>
                                Complete directory of all pages on <strong style={{ color: '#818cf8' }}>sortedsolutions.in</strong>
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 18px', textAlign: 'center' }}>
                                <div style={{ fontSize: 22, fontWeight: 800, color: '#6366f1' }}>{totalUrls}+</div>
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Total Pages</div>
                            </div>
                            <a href="/sitemap.xml" target="_blank" style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', textDecoration: 'none', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                📄 XML Sitemap
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 24px 60px' }}>

                {/* Static Pages */}
                <Section title="Main Pages" emoji="🏠" count={staticLinks.length} accent="#6366f1">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                        {staticLinks.map(l => (
                            <SitemapCard key={l.url} label={l.label} url={l.url} accent="#6366f1" />
                        ))}
                    </div>
                </Section>

                {/* Service Category Pages */}
                <Section title="Service Category Pages" emoji="🔧" count={appliances.length} accent="#10b981">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                        {appliances.map(a => (
                            <SitemapCard key={a.slug} label={`${a.name} Repair`} url={`/services/${a.slug}`} accent="#10b981" />
                        ))}
                    </div>
                </Section>

                {/* Subcategory Pages */}
                <Section title="Service Subcategory Pages" emoji="⚙️" count={appliances.reduce((a, c) => a + c.subcategories.length, 0)} accent="#f59e0b">
                    {appliances.map(a => (
                        <div key={a.slug} style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 }}>
                                {a.name}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
                                {a.subcategories.map(s => (
                                    <SitemapCard key={s.slug} label={s.name} url={`/services/${a.slug}/${s.slug}`} accent="#f59e0b" small />
                                ))}
                            </div>
                        </div>
                    ))}
                </Section>

                {/* Location Pages */}
                <Section title="Location Pages" emoji="📍" count={LOCATIONS.length} accent="#ec4899">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                        {LOCATIONS.map(loc => (
                            <SitemapCard key={loc} label={toLabel(loc)} url={`/location/${loc}`} accent="#ec4899" small />
                        ))}
                    </div>
                </Section>

                {/* Sub-location Pages */}
                <Section title="Service × Location Pages" emoji="🗺️" count={LOCATIONS.length * appliances.length} accent="#0ea5e9">
                    <p style={{ color: '#64748b', fontSize: 13, marginTop: 0, marginBottom: 16 }}>
                        Every service available in every location — {appliances.length} services × {LOCATIONS.length} locations
                    </p>
                    {appliances.map(a => (
                        <div key={a.slug} style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 }}>
                                {a.name}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
                                {LOCATIONS.map(loc => (
                                    <SitemapCard key={loc} label={`${a.name} in ${toLabel(loc)}`} url={`/location/${loc}/${a.slug}`} accent="#0ea5e9" small />
                                ))}
                            </div>
                        </div>
                    ))}
                </Section>

            </div>
        </div>
    );
}

function Section({ title, emoji, count, accent, children }) {
    return (
        <div style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: `2px solid ${accent}22` }}>
                <span style={{ fontSize: 18 }}>{emoji}</span>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{title}</h2>
                <span style={{ marginLeft: 'auto', background: `${accent}22`, color: accent, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
                    {count} pages
                </span>
            </div>
            {children}
        </div>
    );
}

function SitemapCard({ label, url, accent, small }) {
    return (
        <a
            href={url}
            style={{
                display: 'block',
                padding: small ? '8px 12px' : '12px 16px',
                background: '#1e293b',
                border: `1px solid #334155`,
                borderRadius: 8,
                textDecoration: 'none',
                transition: 'border-color 0.15s, background 0.15s',
                cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.background = `${accent}11`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.background = '#1e293b'; }}
        >
            <div style={{ fontSize: small ? 12 : 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {label}
            </div>
            <div style={{ fontSize: 11, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {url}
            </div>
        </a>
    );
}
