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
        description: 'Single container tag that manages all other tags. Recommended — add your GTM ID and all other Google tracking loads via GTM dashboard.',
        helpUrl: 'https://tagmanager.google.com',
        fields: [
            { key: 'gtmId', label: 'GTM Container ID', placeholder: 'GTM-XXXXXXX', hint: 'Found in GTM dashboard → container settings' }
        ]
    },
    {
        id: 'ga4',
        icon: BarChart2,
        color: '#fbbc04',
        label: 'Google Analytics 4 (GA4)',
        description: 'Tracks visitors, sessions, page views, and behaviour. If you have GTM, you can add GA4 via GTM instead.',
        helpUrl: 'https://analytics.google.com',
        fields: [
            { key: 'ga4Id', label: 'GA4 Measurement ID', placeholder: 'G-XXXXXXXXXX', hint: 'Admin → Data streams → Measurement ID' }
        ]
    },
    {
        id: 'ads',
        icon: Megaphone,
        color: '#34a853',
        label: 'Google Ads',
        description: 'Conversion tracking lets Google Ads know when someone books after clicking your ad, so it can optimise campaigns.',
        helpUrl: 'https://ads.google.com',
        fields: [
            { key: 'adsConversionId', label: 'Google Ads Conversion ID', placeholder: 'AW-XXXXXXXXXX', hint: 'Tools & Settings → Measurement → Conversions → Tag setup → Global site tag' },
            { key: 'adsConversionLabel', label: 'Conversion Label', placeholder: 'xxxxxxxxxxxxxxxx', hint: 'Found alongside the Conversion ID in the tag snippet' }
        ]
    },
    {
        id: 'searchConsole',
        icon: Search,
        color: '#ea4335',
        label: 'Google Search Console',
        description: 'Verifies your website with Google so you can track keyword rankings, submit sitemaps, and fix indexing issues.',
        helpUrl: 'https://search.google.com/search-console',
        fields: [
            { key: 'searchConsoleVerification', label: 'Meta Verification Tag Content', placeholder: 'XXXXXXXXXXXX', hint: 'Search Console → Settings → Ownership verification → HTML tag → copy only the content="..." value' }
        ]
    },
    {
        id: 'gmb',
        icon: MapPin,
        color: '#0f9d58',
        label: 'Google My Business (GMB)',
        description: 'Your business profile for local search and Google Maps. Link it here for reference and for structured data.',
        helpUrl: 'https://business.google.com',
        fields: [
            { key: 'gmbProfileUrl', label: 'GMB Profile URL', placeholder: 'https://maps.google.com/?cid=...', hint: 'Share button on your Google Business profile → Copy link' },
            { key: 'gmbPlaceId', label: 'Place ID (optional)', placeholder: 'ChIJ...', hint: 'Find it at: developers.google.com/maps/documentation/places/web-service/place-id' }
        ]
    },
    {
        id: 'schema',
        icon: Code,
        color: '#9c27b0',
        label: 'Schema / Structured Data (LocalBusiness)',
        description: 'JSON-LD schema markup that tells Google about your business. Enables rich results (star ratings, FAQs, phone in search). Injected automatically on all pages.',
        helpUrl: 'https://schema.org/LocalBusiness',
        fields: [
            { key: 'schemaName', label: 'Business Name', placeholder: 'Sorted Solutions', hint: 'Exact business name as registered' },
            { key: 'schemaPhone', label: 'Phone Number', placeholder: '+91 9876543210', hint: 'Primary contact number' },
            { key: 'schemaEmail', label: 'Email', placeholder: 'hello@sortedsolutions.in', hint: 'Business contact email' },
            { key: 'schemaAddress', label: 'Street Address', placeholder: '123, Main Street, Bandra', hint: 'Full street address' },
            { key: 'schemaCity', label: 'City', placeholder: 'Mumbai', hint: '' },
            { key: 'schemaState', label: 'State', placeholder: 'Maharashtra', hint: '' },
            { key: 'schemaPincode', label: 'Pincode', placeholder: '400050', hint: '' },
            { key: 'schemaAreaServed', label: 'Areas Served (comma separated)', placeholder: 'Bandra, Andheri, Malad, Goregaon', hint: 'Used in schema and helps local SEO' },
            { key: 'schemaPriceRange', label: 'Price Range', placeholder: '₹₹', hint: '₹ = budget, ₹₹ = moderate, ₹₹₹ = premium' },
            { key: 'schemaUrl', label: 'Website URL', placeholder: 'https://sortedsolutions.in', hint: 'Your canonical website domain' }
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
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', marginTop: '5px' }}>
                                    <Info size={11} style={{ color: 'var(--text-tertiary)', marginTop: '1px', flexShrink: 0 }} />
                                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{field.hint}</span>
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
