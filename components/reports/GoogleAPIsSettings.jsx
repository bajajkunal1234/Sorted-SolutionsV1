'use client'

import { useState, useEffect } from 'react'
import {
    Search, BarChart2, Tag, Megaphone, MapPin, Code,
    CheckCircle, Loader2, Copy, ExternalLink, ChevronDown, ChevronUp, Info
} from 'lucide-react'

const SECTIONS = [
    {
        id: 'gtm',
        icon: Tag,
        color: '#4285f4',
        label: 'Google Tag Manager (GTM)',
        description: 'Recommended starting point. One container tag that manages all your other Google tags (GA4, Ads, etc.) from GTM dashboard — no more code changes needed.',
        helpUrl: 'https://tagmanager.google.com',
        fields: [
            {
                key: 'gtmId',
                label: 'GTM Container ID',
                placeholder: 'GTM-XXXXXXX',
                hint: '📍 Where: GTM dashboard → Admin → Container Settings → Container ID\n✅ Effect: Google\'s tag container loads on every page. You can then add GA4, Ads, and any other tag from your GTM dashboard without touching code.'
            }
        ]
    },
    {
        id: 'ga4',
        icon: BarChart2,
        color: '#fbbc04',
        label: 'Google Analytics 4 (GA4)',
        description: 'Tracks all visitor sessions, page views, bounce rates, cities, device types, and booking funnel events. Required to see real traffic data in Google Analytics.',
        helpUrl: 'https://analytics.google.com',
        fields: [
            {
                key: 'ga4Id',
                label: 'GA4 Measurement ID',
                placeholder: 'G-XXXXXXXXXX',
                hint: '📍 Where: Google Analytics → Admin → Data Streams → your site → Measurement ID\n✅ Effect: Every page visit, user session, and interaction gets logged in your GA4 account. You\'ll see real-time visitors, traffic sources, and how users move through your site. Skip this if you\'re using GTM (add GA4 via GTM instead).'
            }
        ]
    },
    {
        id: 'ads',
        icon: Megaphone,
        color: '#34a853',
        label: 'Google Ads Conversion Tracking',
        description: 'Tells Google Ads when someone books a service after clicking your ad. This data lets Google automatically optimise who sees your ads to get more bookings at lower cost.',
        helpUrl: 'https://ads.google.com',
        fields: [
            {
                key: 'adsConversionId',
                label: 'Google Ads Conversion ID',
                placeholder: 'AW-XXXXXXXXXX',
                hint: '📍 Where: Google Ads → Tools & Settings → Measurement → Conversions → the conversion action → Tag setup → Global site tag — copy the AW-... part\n✅ Effect: The Google Ads global tag loads on all pages, enabling conversion measurement and remarketing audiences.'
            },
            {
                key: 'adsConversionLabel',
                label: 'Conversion Label',
                placeholder: 'xxxxxxxxxxxxxxxx',
                hint: '📍 Where: Same tag snippet as above — the value after the slash (AW-XXXXXX/THIS_PART)\n✅ Effect: When combined with the Conversion ID, Google Ads records a booking conversion every time someone completes a booking. Your campaign reports will show cost-per-booking and Google Smart Bidding will optimise for bookings automatically.'
            }
        ]
    },
    {
        id: 'searchConsole',
        icon: Search,
        color: '#ea4335',
        label: 'Google Search Console',
        description: 'Verifies ownership of your site so Google shares keyword ranking data, indexing errors, Core Web Vitals, and lets you submit sitemaps for faster indexing.',
        helpUrl: 'https://search.google.com/search-console',
        fields: [
            {
                key: 'searchConsoleVerification',
                label: 'Meta Verification Tag Content',
                placeholder: 'XXXXXXXXXXXX',
                hint: '📍 Where: Search Console → Settings → Ownership Verification → HTML tag → copy ONLY the content="..." value (not the full tag)\n✅ Effect: Google confirms you own this site and unlocks the full Search Console dashboard — keyword positions, click-through rates, crawl errors, and sitemap submission.'
            }
        ]
    },
    {
        id: 'gmb',
        icon: MapPin,
        color: '#0f9d58',
        label: 'Google My Business (GMB)',
        description: 'Your Google Business profile drives local search rankings and the map pack. Linking it here connects it to the schema markup for stronger local SEO signals.',
        helpUrl: 'https://business.google.com',
        fields: [
            {
                key: 'gmbProfileUrl',
                label: 'GMB Profile URL',
                placeholder: 'https://maps.google.com/?cid=...',
                hint: '📍 Where: Open your Business Profile on Google Maps → Share → Copy link\n✅ Effect: Added to the LocalBusiness schema as a "sameAs" reference — tells Google this website and your Maps listing are the same business, strengthening local search trust.'
            },
            {
                key: 'gmbPlaceId',
                label: 'Place ID (optional)',
                placeholder: 'ChIJ...',
                hint: '📍 Where: Find at developers.google.com/maps/documentation/places/web-service/place-id\n✅ Effect: Can be used in future integrations to pull your live GMB reviews and ratings directly onto the website.'
            }
        ]
    },
    {
        id: 'schema',
        icon: Code,
        color: '#9c27b0',
        label: 'Schema / Structured Data (LocalBusiness)',
        description: 'JSON-LD markup injected invisibly on every page. Google reads it to understand your business and may show star ratings, address, phone number, and service areas directly in search results (rich results).',
        helpUrl: 'https://schema.org/LocalBusiness',
        fields: [
            { key: 'schemaName', label: 'Business Name', placeholder: 'Sorted Solutions', hint: '✅ Effect: Google uses this as the official business name in search results and the Knowledge Panel.' },
            { key: 'schemaPhone', label: 'Phone Number', placeholder: '+91 9876543210', hint: '✅ Effect: May appear as a clickable call button directly in Google Search results on mobile.' },
            { key: 'schemaEmail', label: 'Email', placeholder: 'hello@sortedsolutions.in', hint: '✅ Effect: Included in the business entity data Google stores about your site.' },
            { key: 'schemaAddress', label: 'Street Address', placeholder: '123, Main Street, Bandra', hint: '✅ Effect: Helps Google confirm your physical location, boosting local search rankings and map pack eligibility.' },
            { key: 'schemaCity', label: 'City', placeholder: 'Mumbai', hint: '' },
            { key: 'schemaState', label: 'State', placeholder: 'Maharashtra', hint: '' },
            { key: 'schemaPincode', label: 'Pincode', placeholder: '400050', hint: '' },
            { key: 'schemaAreaServed', label: 'Areas Served (comma separated)', placeholder: 'Bandra, Andheri, Malad, Goregaon', hint: '✅ Effect: Google understands the geographic scope of your services, helping your pages rank in searches from those areas even without separate location pages.' },
            { key: 'schemaPriceRange', label: 'Price Range', placeholder: '₹₹', hint: '✅ Effect: Shown in search results to help users know your pricing tier. ₹ = budget, ₹₹ = moderate, ₹₹₹ = premium.' },
            { key: 'schemaUrl', label: 'Website URL', placeholder: 'https://sortedsolutions.in', hint: '✅ Effect: The canonical URL of your business — anchors all schema data to your domain.' }
        ]
    }
]

function CopyButton({ value }) {
    const [copied, setCopied] = useState(false)
    return (
        <button
            onClick={() => { navigator.clipboard.writeText(value || ''); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            title="Copy to clipboard"
            style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                color: copied ? '#10b981' : 'var(--text-tertiary)', display: 'flex', alignItems: 'center'
            }}
        >
            {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
        </button>
    )
}

function SectionCard({ section, values, onChange }) {
    const [open, setOpen] = useState(true)
    const Icon = section.icon
    const allFilled = section.fields.every(f => values[f.key])

    return (
        <div style={{
            border: `1px solid ${open ? section.color + '40' : 'var(--border-primary)'}`,
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            transition: 'border-color 0.2s'
        }}>
            {/* Header */}
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 18px', background: open ? `${section.color}08` : 'var(--bg-elevated)',
                    border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s'
                }}
            >
                <div style={{
                    width: '36px', height: '36px', borderRadius: 'var(--radius-md)', flexShrink: 0,
                    backgroundColor: `${section.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <Icon size={18} style={{ color: section.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{section.label}</span>
                        {allFilled && (
                            <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '99px', backgroundColor: '#10b98120', color: '#10b981', fontWeight: 700 }}>
                                CONFIGURED
                            </span>
                        )}
                    </div>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{section.description}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <a
                        href={section.helpUrl} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ color: section.color, display: 'flex', alignItems: 'center' }}
                        title="Open dashboard"
                    >
                        <ExternalLink size={13} />
                    </a>
                    {open ? <ChevronUp size={16} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />}
                </div>
            </button>

            {/* Fields */}
            {open && (
                <div style={{ padding: '16px 18px', display: 'grid', gap: '14px', backgroundColor: 'var(--bg-primary)' }}>
                    {section.fields.map(field => (
                        <div key={field.key}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                                {field.label}
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input
                                    type="text"
                                    value={values[field.key] || ''}
                                    onChange={e => onChange(field.key, e.target.value)}
                                    placeholder={field.placeholder}
                                    style={{
                                        flex: 1, padding: '9px 12px',
                                        border: `1px solid ${values[field.key] ? section.color + '60' : 'var(--border-primary)'}`,
                                        borderRadius: 'var(--radius-md)',
                                        backgroundColor: 'var(--bg-elevated)',
                                        color: 'var(--text-primary)', fontSize: '13px',
                                        fontFamily: 'monospace', transition: 'border-color 0.2s'
                                    }}
                                />
                                {values[field.key] && <CopyButton value={values[field.key]} />}
                            </div>
                            {field.hint && (
                                <div style={{ display: 'grid', gap: '4px', marginTop: '7px' }}>
                                    {field.hint.split('\n').map((line, i) => {
                                        const isEffect = line.startsWith('✅')
                                        const isWhere = line.startsWith('📍')
                                        return (
                                            <div key={i} style={{
                                                display: 'flex', alignItems: 'flex-start', gap: '6px',
                                                padding: '5px 8px', borderRadius: '6px',
                                                backgroundColor: isEffect ? '#10b98110' : isWhere ? 'var(--bg-elevated)' : 'transparent',
                                                border: isEffect ? '1px solid #10b98125' : isWhere ? '1px solid var(--border-primary)' : 'none'
                                            }}>
                                                <span style={{ fontSize: '11px', lineHeight: 1.5, color: isEffect ? '#10b981' : 'var(--text-tertiary)' }}>
                                                    {line}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function GoogleAPIsSettings() {
    const [values, setValues] = useState({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        fetch('/api/settings/google-apis')
            .then(r => r.json())
            .then(d => { if (d.success) setValues(d.data || {}) })
            .catch(() => setError('Failed to load settings'))
            .finally(() => setLoading(false))
    }, [])

    const handleChange = (key, val) => {
        setValues(prev => ({ ...prev, [key]: val }))
        setSaved(false)
    }

    const handleSave = async () => {
        setSaving(true)
        setError('')
        try {
            const res = await fetch('/api/settings/google-apis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            })
            const data = await res.json()
            if (data.success) {
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
            } else {
                setError(data.error || 'Save failed')
            }
        } catch {
            setError('Network error')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '40px', color: 'var(--text-tertiary)' }}>
            <Loader2 size={18} className="animate-spin" /> Loading Google API settings...
        </div>
    )

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px',
                backgroundColor: '#4285f408',
                border: '1px solid #4285f430',
                borderRadius: 'var(--radius-lg)',
                display: 'flex', alignItems: 'center', gap: '12px'
            }}>
                <div style={{ fontSize: '28px' }}>🔗</div>
                <div>
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Google APIs &amp; Integrations
                    </h2>
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Configure all Google tracking, analytics and schema tags. These are injected automatically into every page of the live website.
                    </p>
                </div>
            </div>

            {error && (
                <div style={{ padding: '12px', backgroundColor: '#ef444415', border: '1px solid #ef444430', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '13px' }}>
                    {error}
                </div>
            )}

            {/* Section Cards */}
            {SECTIONS.map(section => (
                <SectionCard
                    key={section.id}
                    section={section}
                    values={values}
                    onChange={handleChange}
                />
            ))}

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '11px 28px', borderRadius: 'var(--radius-md)',
                        backgroundColor: saved ? '#10b981' : 'var(--color-primary)',
                        color: 'white', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: '14px', fontWeight: 700, transition: 'background-color 0.3s',
                        opacity: saving ? 0.7 : 1
                    }}
                >
                    {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> :
                        saved ? <><CheckCircle size={16} /> Saved!</> : 'Save All Settings'}
                </button>
            </div>

            <style>{`
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}
