'use client'

import { useState, useEffect, useRef } from 'react'
import {
    Search, BarChart2, Tag, Megaphone, MapPin, Code,
    CheckCircle, Loader2, Copy, ExternalLink, ChevronDown, ChevronUp,
    Globe, FileText, Hash, Plus, X
} from 'lucide-react'

// ─── Helper: CopyButton ───────────────────────────────────────────────────────
function CopyButton({ value }) {
    const [copied, setCopied] = useState(false)
    return (
        <button
            title="Copy"
            onClick={() => { navigator.clipboard.writeText(value || ''); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: copied ? '#10b981' : 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}
        >
            {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
        </button>
    )
}

// ─── Helper: FieldInput ───────────────────────────────────────────────────────
function FieldInput({ label, value, onChange, placeholder, hint, monospace, multiline, color }) {
    const Tag = multiline ? 'textarea' : 'input'
    return (
        <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{label}</label>
            <div style={{ display: 'flex', alignItems: multiline ? 'flex-start' : 'center', gap: '4px' }}>
                <Tag
                    type="text"
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    rows={multiline ? 3 : undefined}
                    style={{
                        flex: 1, padding: '9px 12px', resize: multiline ? 'vertical' : undefined,
                        border: `1px solid ${value ? (color || '#4285f4') + '60' : 'var(--border-primary)'}`,
                        borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-primary)', fontSize: '13px',
                        fontFamily: monospace ? 'monospace' : undefined, transition: 'border-color 0.2s'
                    }}
                />
                {!multiline && value && <CopyButton value={value} />}
            </div>
            {hint && (
                <div style={{ display: 'grid', gap: '3px', marginTop: '6px' }}>
                    {hint.split('\n').map((line, i) => {
                        const isEffect = line.startsWith('✅')
                        const isWhere = line.startsWith('📍')
                        return (
                            <div key={i} style={{
                                padding: '4px 8px', borderRadius: '5px',
                                backgroundColor: isEffect ? '#10b98110' : isWhere ? 'var(--bg-elevated)' : 'transparent',
                                border: isEffect ? '1px solid #10b98125' : isWhere ? '1px solid var(--border-primary)' : 'none'
                            }}>
                                <span style={{ fontSize: '11px', lineHeight: 1.5, color: isEffect ? '#10b981' : 'var(--text-tertiary)' }}>{line}</span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ─── Helper: SectionCard ─────────────────────────────────────────────────────
function SectionCard({ icon: Icon, color, label, description, helpUrl, defaultOpen = false, children }) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div style={{ border: `1px solid ${open ? color + '40' : 'var(--border-primary)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden', transition: 'border-color 0.2s' }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: open ? `${color}08` : 'var(--bg-elevated)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
                <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', flexShrink: 0, backgroundColor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} style={{ color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{label}</span>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-tertiary)' }}>{description}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {helpUrl && (
                        <a href={helpUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color, display: 'flex', alignItems: 'center' }} title="Open dashboard">
                            <ExternalLink size={13} />
                        </a>
                    )}
                    {open ? <ChevronUp size={16} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />}
                </div>
            </button>
            {open && (
                <div style={{ padding: '16px 18px', display: 'grid', gap: '14px', backgroundColor: 'var(--bg-primary)' }}>
                    {children}
                </div>
            )}
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GoogleAPIsSettings() {
    const [values, setValues] = useState({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState('')
    const [newKeyword, setNewKeyword] = useState('')

    useEffect(() => {
        fetch('/api/settings/google-apis')
            .then(r => r.json())
            .then(d => { if (d.success) setValues(d.data || {}) })
            .catch(() => setError('Failed to load settings'))
            .finally(() => setLoading(false))
    }, [])

    const set = (key, val) => { setValues(prev => ({ ...prev, [key]: val })); setSaved(false) }

    const handleAddKeyword = () => {
        if (!newKeyword.trim()) return
        const list = [...(values.seoKeywords || []), newKeyword.trim()]
        set('seoKeywords', list)
        setNewKeyword('')
    }
    const handleRemoveKeyword = (i) => set('seoKeywords', (values.seoKeywords || []).filter((_, idx) => idx !== i))

    const handleSave = async () => {
        setSaving(true); setError('')
        try {
            const res = await fetch('/api/settings/google-apis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
            const data = await res.json()
            if (data.success) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
            else setError(data.error || 'Save failed')
        } catch { setError('Network error') }
        finally { setSaving(false) }
    }

    if (loading) return <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '40px', color: 'var(--text-tertiary)' }}><Loader2 size={18} className="animate-spin" /> Loading settings...</div>

    const kws = values.seoKeywords || []

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', backgroundColor: '#4285f408', border: '1px solid #4285f430', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '28px' }}>🔗</div>
                <div>
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Google APIs & Integrations + SEO</h2>
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        All tracking tags, search console, schema markup, meta tags, and SEO keywords — managed in one place and auto-injected on every page.
                    </p>
                </div>
            </div>

            {error && <div style={{ padding: '12px', backgroundColor: '#ef444415', border: '1px solid #ef444430', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '13px' }}>{error}</div>}

            {/* ── GOOGLE TAGS ─────────────────────────────────────── */}
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', paddingLeft: '4px' }}>
                Google Tracking Tags
            </div>

            <SectionCard icon={Tag} color="#4285f4" label="Google Tag Manager (GTM)" description="Recommended. One container that manages all other tags — no future code changes needed." helpUrl="https://tagmanager.google.com">
                <FieldInput label="GTM Container ID" value={values.gtmId} onChange={v => set('gtmId', v)} placeholder="GTM-XXXXXXX" monospace color="#4285f4"
                    hint={"📍 Where: GTM dashboard → Admin → Container Settings → Container ID\n✅ Effect: Google's tag container loads on every page. Add GA4, Ads, and any tag from GTM without touching code."} />
            </SectionCard>

            <SectionCard icon={BarChart2} color="#fbbc04" label="Google Analytics 4 (GA4)" description="Tracks visitors, sessions, page views, bounce rate, traffic sources, and booking funnel." helpUrl="https://analytics.google.com">
                <FieldInput label="GA4 Measurement ID" value={values.ga4Id} onChange={v => set('ga4Id', v)} placeholder="G-XXXXXXXXXX" monospace color="#fbbc04"
                    hint={"📍 Where: Google Analytics → Admin → Data Streams → your site → Measurement ID\n✅ Effect: Every visit and interaction logs in GA4. Skip if using GTM — add GA4 via GTM instead."} />
                <FieldInput label="GA4 Property ID (for Analytics dashboard)" value={values.ga4PropertyId} onChange={v => set('ga4PropertyId', v)} placeholder="properties/123456789" monospace color="#fbbc04"
                    hint={"📍 Where: Google Analytics → Admin → Property Settings → Property ID (number only) — prepend 'properties/'\n✅ Effect: Enables the Website Analytics dashboard to pull live sessions, page views, bounce rate and traffic sources from GA4 server-side."} />
                <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        GA4 Service Account JSON (for Analytics dashboard)
                    </label>
                    <textarea
                        value={values.ga4ServiceAccountJson || ''}
                        onChange={e => set('ga4ServiceAccountJson', e.target.value)}
                        placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  "client_email": "...",\n  "private_key": "-----BEGIN PRIVATE KEY-----\\n..."\n}'}
                        rows={6}
                        style={{ width: '100%', padding: '9px 12px', border: `1px solid ${values.ga4ServiceAccountJson ? '#fbbc0460' : 'var(--border-primary)'}`, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'grid', gap: '3px', marginTop: '6px' }}>
                        <div style={{ padding: '4px 8px', borderRadius: '5px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>📍 Where: Google Cloud Console → IAM → Service Accounts → Create → Keys → Add Key → JSON. Grant the account "Viewer" role in GA4 property settings.</span>
                        </div>
                        <div style={{ padding: '4px 8px', borderRadius: '5px', backgroundColor: '#10b98110', border: '1px solid #10b98125' }}>
                            <span style={{ fontSize: '11px', color: '#10b981' }}>✅ Effect: Unlocks live traffic stats in the Website Analytics dashboard — sessions, users, top pages, bounce rate, traffic sources.</span>
                        </div>
                    </div>
                </div>
            </SectionCard>


            <SectionCard icon={Megaphone} color="#34a853" label="Google Ads Conversion Tracking" description="Reports bookings back to Ads so Google can auto-optimise your campaigns for more conversions." helpUrl="https://ads.google.com">
                <FieldInput label="Google Ads Conversion ID" value={values.adsConversionId} onChange={v => set('adsConversionId', v)} placeholder="AW-XXXXXXXXXX" monospace color="#34a853"
                    hint={"📍 Where: Google Ads → Tools → Measurement → Conversions → Tag setup → Global site tag (the AW-... part)\n✅ Effect: Global Ads tag loads on all pages — enables conversion measurement and remarketing."} />
                <FieldInput label="Conversion Label" value={values.adsConversionLabel} onChange={v => set('adsConversionLabel', v)} placeholder="xxxxxxxxxxxxxxxx" monospace color="#34a853"
                    hint={"📍 Where: Same snippet — the value after the slash (AW-XXXXXX/THIS_PART)\n✅ Effect: Every booking fires a conversion event. Reports show cost-per-booking; Smart Bidding optimises automatically."} />
            </SectionCard>

            <SectionCard icon={Search} color="#ea4335" label="Google Search Console" description="Verifies ownership so Google shares ranking data, crawl errors, Core Web Vitals, and sitemap tools." helpUrl="https://search.google.com/search-console">
                <FieldInput label="Meta Verification Tag Content" value={values.searchConsoleVerification} onChange={v => set('searchConsoleVerification', v)} placeholder="XXXXXXXXXXXX" monospace color="#ea4335"
                    hint={"📍 Where: Search Console → Settings → Ownership Verification → HTML tag → copy ONLY the content=\"...\" value\n✅ Effect: Unlocks the full Search Console dashboard — keyword positions, click-through rates, crawl errors, sitemap submission."} />
            </SectionCard>

            <SectionCard icon={MapPin} color="#0f9d58" label="Google My Business (GMB)" description="Your Business profile drives map pack rankings. Linking it here strengthens local SEO schema signals." helpUrl="https://business.google.com">
                <FieldInput label="GMB Profile URL" value={values.gmbProfileUrl} onChange={v => set('gmbProfileUrl', v)} placeholder="https://maps.google.com/?cid=..." color="#0f9d58"
                    hint={"📍 Where: Open your Business Profile on Maps → Share → Copy link\n✅ Effect: Added to LocalBusiness schema as a sameAs reference — tells Google this site and your Maps listing are the same business."} />
                <FieldInput label="Place ID (optional)" value={values.gmbPlaceId} onChange={v => set('gmbPlaceId', v)} placeholder="ChIJ..." monospace color="#0f9d58"
                    hint={"📍 Where: developers.google.com/maps/documentation/places/web-service/place-id\n✅ Effect: Enables future integrations to pull live GMB reviews onto the website."} />
            </SectionCard>

            {/* ── SCHEMA ─────────────────────────────────────────── */}
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', paddingLeft: '4px', marginTop: '4px' }}>
                Structured Data (Schema Markup)
            </div>

            <SectionCard icon={Code} color="#9c27b0" label="LocalBusiness Schema" description="JSON-LD injected on every page. May surface phone, address, price range and service areas directly in search results." helpUrl="https://schema.org/LocalBusiness">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <FieldInput label="Business Name" value={values.schemaName} onChange={v => set('schemaName', v)} placeholder="Sorted Solutions" color="#9c27b0" hint="✅ Effect: Google uses this as the official business name in search results and the Knowledge Panel." />
                    <FieldInput label="Website URL" value={values.schemaUrl} onChange={v => set('schemaUrl', v)} placeholder="https://sortedsolutions.in" color="#9c27b0" hint="✅ Effect: The canonical URL anchoring all schema data to your domain." />
                    <FieldInput label="Phone Number" value={values.schemaPhone} onChange={v => set('schemaPhone', v)} placeholder="+91 9876543210" color="#9c27b0" hint="✅ Effect: May appear as a clickable call button in Google Search results on mobile." />
                    <FieldInput label="Email" value={values.schemaEmail} onChange={v => set('schemaEmail', v)} placeholder="hello@sortedsolutions.in" color="#9c27b0" hint="✅ Effect: Included in the business entity data Google stores about your site." />
                    <FieldInput label="Street Address" value={values.schemaAddress} onChange={v => set('schemaAddress', v)} placeholder="A138 Orchard Mall, Royal Palms" color="#9c27b0" hint="✅ Effect: Helps Google confirm your physical location for map pack eligibility." />
                    <FieldInput label="City" value={values.schemaCity} onChange={v => set('schemaCity', v)} placeholder="Mumbai" color="#9c27b0" />
                    <FieldInput label="State" value={values.schemaState} onChange={v => set('schemaState', v)} placeholder="Maharashtra" color="#9c27b0" />
                    <FieldInput label="Pincode" value={values.schemaPincode} onChange={v => set('schemaPincode', v)} placeholder="400063" color="#9c27b0" />
                    <FieldInput label="Price Range" value={values.schemaPriceRange} onChange={v => set('schemaPriceRange', v)} placeholder="₹₹" color="#9c27b0" hint="✅ Effect: Shown in results to indicate pricing tier. ₹ = budget, ₹₹ = moderate, ₹₹₹ = premium." />
                    <FieldInput label="Opening Hours" value={values.schemaOpeningHours} onChange={v => set('schemaOpeningHours', v)} placeholder="Mo-Su 08:00-20:00" color="#9c27b0" hint="✅ Effect: Shown below your business name in search results." />
                </div>
                <FieldInput label="Latitude" value={values.schemaLat} onChange={v => set('schemaLat', v)} placeholder="19.1663" color="#9c27b0" />
                <FieldInput label="Longitude" value={values.schemaLng} onChange={v => set('schemaLng', v)} placeholder="72.8526" color="#9c27b0" />
                <FieldInput label="Areas Served (comma separated)" value={values.schemaAreaServed} onChange={v => set('schemaAreaServed', v)} placeholder="Bandra, Andheri, Malad, Goregaon" color="#9c27b0"
                    hint="✅ Effect: Tells Google the geographic scope of your services — helps pages rank in searches from those areas." />
            </SectionCard>

            {/* ── SEO META TAGS ───────────────────────────────────── */}
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', paddingLeft: '4px', marginTop: '4px' }}>
                SEO Meta Tags
            </div>

            <SectionCard icon={Globe} color="#3b82f6" label="Homepage Meta Tags" description="Title, meta description, and Open Graph tags for the homepage — used by Google and social platforms." helpUrl="https://search.google.com/test/rich-results">
                <FieldInput label="Page Title" value={values.homepageTitle} onChange={v => set('homepageTitle', v)}
                    placeholder="Sorted Solutions - Home Appliance Repair Services in Mumbai" color="#3b82f6"
                    hint={"📍 Keep under 60 characters for best display in search results.\n✅ Effect: Shown as the blue clickable headline in Google search results."} />
                <FieldInput label="Meta Description" value={values.homepageDescription} onChange={v => set('homepageDescription', v)} multiline
                    placeholder="Professional repair services for AC, Washing Machine, Refrigerator, Microwave & more. Same-day service across Mumbai." color="#3b82f6"
                    hint={"📍 Keep under 160 characters.\n✅ Effect: The grey summary text shown below your title in search results — key for click-through rate."} />
                <FieldInput label="Meta Keywords (comma separated)" value={values.homepageKeywords} onChange={v => set('homepageKeywords', v)}
                    placeholder="appliance repair mumbai, ac repair, washing machine repair" color="#3b82f6"
                    hint="📍 Not used by Google for ranking but still read by some other search engines." />
                <FieldInput label="Open Graph Title (for social sharing)" value={values.ogTitle} onChange={v => set('ogTitle', v)}
                    placeholder="Sorted Solutions - Expert Home Appliance Repair" color="#3b82f6"
                    hint="✅ Effect: The title shown when your site is shared on WhatsApp, Facebook, LinkedIn, Twitter." />
                <FieldInput label="Open Graph Description" value={values.ogDescription} onChange={v => set('ogDescription', v)} multiline
                    placeholder="Get your appliances fixed by certified technicians. Same-day service available." color="#3b82f6" />
                <FieldInput label="Open Graph Image URL" value={values.ogImage} onChange={v => set('ogImage', v)}
                    placeholder="/og-image-homepage.jpg" color="#3b82f6"
                    hint="📍 Recommended size: 1200×630px. Will be shown when the page is shared on social media." />
            </SectionCard>

            <SectionCard icon={FileText} color="#10b981" label="Service & Location Page Meta Templates" description="Auto-filled title/description templates for all service and location pages. Use {Service}, {service}, {Location}, {location} as placeholders.">
                <FieldInput label="Title Template" value={values.servicePageTitleTemplate} onChange={v => set('servicePageTitleTemplate', v)} monospace
                    placeholder="{Service} Repair in {Location} | Sorted Solutions" color="#10b981"
                    hint={"📍 Example output: AC Repair in Andheri | Sorted Solutions\n✅ Effect: Auto-generates unique titles for every service × location combination page."} />
                <FieldInput label="Description Template" value={values.servicePageDescTemplate} onChange={v => set('servicePageDescTemplate', v)} multiline monospace
                    placeholder="Professional {service} repair services in {location}. Certified technicians, genuine parts, 30-day warranty. Book now!" color="#10b981"
                    hint="✅ Effect: Generates unique meta descriptions for each page, preventing duplicate content penalties." />
                <FieldInput label="Keywords Template" value={values.servicePageKeywordsTemplate} onChange={v => set('servicePageKeywordsTemplate', v)} monospace
                    placeholder="{service} repair {location}, {service} service, {service} technician" color="#10b981" />
            </SectionCard>

            {/* ── SEO KEYWORDS ────────────────────────────────────── */}
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', paddingLeft: '4px', marginTop: '4px' }}>
                Target Keywords Library
            </div>

            <SectionCard icon={Hash} color="#ec4899" label={`SEO Keywords (${kws.length})`} description="Your tracked target keywords. Useful for content planning, meta tags reference and reporting." defaultOpen={false}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text" value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddKeyword()}
                        placeholder="Add keyword and press Enter..."
                        style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '13px' }}
                    />
                    <button onClick={handleAddKeyword} style={{ padding: '9px 16px', backgroundColor: '#ec4899', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, fontSize: '13px' }}>
                        <Plus size={15} /> Add
                    </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {kws.map((kw, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', backgroundColor: '#ec489910', border: '1px solid #ec489930', borderRadius: '99px', fontSize: '13px' }}>
                            <span>{kw}</span>
                            <button onClick={() => handleRemoveKeyword(i)} style={{ background: 'none', border: 'none', color: '#ec4899', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={13} /></button>
                        </div>
                    ))}
                    {kws.length === 0 && <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>No keywords added yet</span>}
                </div>
            </SectionCard>

            {/* ── SAVE ────────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
                <button
                    onClick={handleSave} disabled={saving}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 28px', borderRadius: 'var(--radius-md)', backgroundColor: saved ? '#10b981' : 'var(--color-primary)', color: 'white', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 700, transition: 'background-color 0.3s', opacity: saving ? 0.7 : 1 }}
                >
                    {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : saved ? <><CheckCircle size={16} /> Saved!</> : 'Save All Settings'}
                </button>
            </div>

            <style>{`.animate-spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}

