'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import './HeroSection.css'

export default function HeroSection({
    title,
    subtitle,
    category,
    quickNavCategories = ['AC', 'WM', 'Ovens', 'Refrigerator', 'RO', 'HOB']
}) {
    const categoryMap = {
        'AC': 'ac-repair',
        'WM': 'washing-machine-repair',
        'Ovens': 'oven-repair',
        'Refrigerator': 'refrigerator-repair',
        'RO': 'water-purifier-repair',
        'HOB': 'hob-repair'
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
                        const isActive = categoryMap[cat] === category
                        return (
                            <Link
                                key={cat}
                                href={`/services/${categoryMap[cat]}`}
                                className={`quick-nav-tab ${isActive ? 'active' : ''}`}
                            >
                                {cat}
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
