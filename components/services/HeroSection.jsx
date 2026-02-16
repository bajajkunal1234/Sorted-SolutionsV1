'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import './HeroSection.css'

export default function HeroSection({
    title,
    subtitle,
    category,
    location = null, // Location name for location pages
    currentService = null, // Current service slug for sub-location pages
    quickNavCategories = ['AC', 'WM', 'Ovens', 'Refrigerator', 'RO', 'HOB']
}) {
    // Service mapping for regular service pages
    const categoryMap = {
        'AC': 'ac-repair',
        'WM': 'washing-machine-repair',
        'Ovens': 'oven-repair',
        'Refrigerator': 'refrigerator-repair',
        'RO': 'water-purifier-repair',
        'HOB': 'hob-repair'
    }

    // Service mapping for location pages
    const locationServiceMap = {
        'AC': { slug: 'ac', full: 'Air Conditioner' },
        'WM': { slug: 'wm', full: 'Washing Machine' },
        'Ovens': { slug: 'oven', full: 'Oven' },
        'Refrigerator': { slug: 'refrigerator', full: 'Refrigerator' },
        'RO': { slug: 'waterpurifier', full: 'Water Purifier' },
        'HOB': { slug: 'hob', full: 'HOB Stoves' }
    }

    // Generate button text based on context
    const getButtonText = (cat) => {
        if (location) {
            // Location page: show full name with location
            return `${locationServiceMap[cat].full} in ${location}`
        }
        // Regular service page: show short name
        return cat
    }

    // Generate link URL based on context
    const getButtonLink = (cat) => {
        if (location) {
            // Location page: link to sub-location page
            const locationSlug = location.toLowerCase().replace(/\s+/g, '-')
            return `/location/${locationSlug}/${locationServiceMap[cat].slug}`
        }
        // Regular service page: link to service category page
        return `/services/${categoryMap[cat]}`
    }

    // Check if button is active
    const isButtonActive = (cat) => {
        if (currentService) {
            // Sub-location page: check against current service
            return locationServiceMap[cat].slug === currentService
        }
        // Service page: check against category
        return categoryMap[cat] === category
    }

    return (
        <div className="hero-section">
            {/* Background Gradient */}
            <div className="hero-gradient"></div>

            {/* Content */}
            <div className="hero-content">
                {/* Branding */}
                <div className="hero-branding">
                    <h3 className="company-name">SORTED SOLUTIONS</h3>
                    <div className="brand-tagline">Expert Appliance Repair Services</div>
                </div>

                {/* Main Title */}
                <h1 className="hero-title">{title}</h1>
                {subtitle && <p className="hero-subtitle">{subtitle}</p>}

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

            {/* Decorative Elements */}
            <div className="hero-decoration">
                <div className="decoration-circle decoration-1"></div>
                <div className="decoration-circle decoration-2"></div>
                <div className="decoration-circle decoration-3"></div>
            </div>
        </div>
    )
}
