'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import './HeroSection.css'

/**
 * HeroSection — accepts an optional `heroSettings` object from Supabase
 * (populated via the admin Page Builder).
 *
 * heroSettings shape:
 * {
 *   title?: string,
 *   subtitle?: string,
 *   bg_type: 'gradient' | 'solid' | 'image',
 *   bg_color_from?: string,
 *   bg_color_to?: string,
 *   bg_image_url?: string,
 *   overlay_opacity?: number   // 0..0.95, for image bg only
 * }
 *
 * If heroSettings is null/undefined, falls back to the original CSS gradient.
 */
export default function HeroSection({
    title,
    subtitle,
    category,
    location = null,
    currentService = null,
    quickNavCategories = ['AC', 'WM', 'Ovens', 'Refrigerator', 'RO', 'HOB'],
    heroSettings = null     // dynamic settings from Supabase
}) {
    const categoryMap = {
        'AC': 'ac-repair',
        'WM': 'washing-machine-repair',
        'Ovens': 'oven-repair',
        'Refrigerator': 'refrigerator-repair',
        'RO': 'water-purifier-repair',
        'HOB': 'hob-repair'
    }

    const locationServiceMap = {
        'AC': { slug: 'ac', full: 'Air Conditioner' },
        'WM': { slug: 'wm', full: 'Washing Machine' },
        'Ovens': { slug: 'oven', full: 'Oven' },
        'Refrigerator': { slug: 'refrigerator', full: 'Refrigerator' },
        'RO': { slug: 'waterpurifier', full: 'Water Purifier' },
        'HOB': { slug: 'hob', full: 'HOB Stoves' }
    }

    const getButtonText = (cat) => {
        if (location) return `${locationServiceMap[cat]?.full || cat} in ${location}`
        return cat
    }

    const getButtonLink = (cat) => {
        if (location) {
            const locationSlug = location.toLowerCase().replace(/\s+/g, '-')
            return `/location/${locationSlug}/${locationServiceMap[cat]?.slug || cat}`
        }
        return `/services/${categoryMap[cat] || cat}`
    }

    const isButtonActive = (cat) => {
        if (currentService) return locationServiceMap[cat]?.slug === currentService
        return categoryMap[cat] === category
    }

    // ── Resolve display title / subtitle ─────────────────────────────────────
    const displayTitle = (heroSettings?.title?.trim()) ? heroSettings.title : title
    const displaySubtitle = (heroSettings?.subtitle?.trim()) ? heroSettings.subtitle : subtitle

    // ── Resolve background style ─────────────────────────────────────────────
    const buildBgStyle = () => {
        if (!heroSettings) return {}    // falls back to .hero-gradient CSS class

        const { bg_type, bg_color_from, bg_color_to, bg_image_url, overlay_opacity } = heroSettings

        if (bg_type === 'image' && bg_image_url) {
            return {
                backgroundImage: `url(${bg_image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
                backgroundRepeat: 'no-repeat'
            }
        }
        if (bg_type === 'solid') {
            return { background: bg_color_from || '#6366f1' }
        }
        // gradient (default)
        return {
            background: `linear-gradient(135deg, ${bg_color_from || '#6366f1'} 0%, ${bg_color_to || '#4f46e5'} 100%)`
        }
    }

    const hasCustomBg = !!heroSettings
    const bgStyle = buildBgStyle()
    const overlayOpacity = heroSettings?.bg_type === 'image' ? (heroSettings?.overlay_opacity ?? 0.5) : 0

    return (
        <div className="hero-section" style={hasCustomBg ? bgStyle : {}}>
            {/* Background: use CSS gradient when no custom settings, overlay for image mode */}
            {!hasCustomBg && <div className="hero-gradient" />}
            {hasCustomBg && overlayOpacity > 0 && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 0,
                    backgroundColor: `rgba(0,0,0,${overlayOpacity})`
                }} />
            )}

            {/* Content */}
            <div className="hero-content">
                {/* Branding */}
                <div className="hero-branding">
                    <h3 className="company-name">SORTED SOLUTIONS</h3>
                    <div className="brand-tagline">Expert Appliance Repair Services</div>
                </div>

                {/* Main Title */}
                <h1 className="hero-title">{displayTitle}</h1>
                {displaySubtitle && <p className="hero-subtitle">{displaySubtitle}</p>}

                {/* Quick Navigation Tabs */}
                <div className="quick-nav-tabs">
                    {quickNavCategories.map((cat) => {
                        const isActive = isButtonActive(cat)
                        return (
                            <Link
                                key={cat}
                                href={getButtonLink(cat)}
                                className={`quick-nav-tab ${isActive ? 'active' : ''} ${location ? 'location-tab' : ''}`}
                            >
                                <span className="tab-text">{getButtonText(cat)}</span>
                                {isActive && <ArrowRight size={16} />}
                            </Link>
                        )
                    })}
                </div>
            </div>

            {/* Decorative Circles */}
            <div className="hero-decoration">
                <div className="decoration-circle decoration-1" />
                <div className="decoration-circle decoration-2" />
                <div className="decoration-circle decoration-3" />
            </div>
        </div>
    )
}
