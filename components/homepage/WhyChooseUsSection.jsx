'use client'

import { useState } from 'react';
import './WhyChooseUsSection.css';

function WhyChooseUsSection() {
    const [hoveredZone, setHoveredZone] = useState(null);

    const features = {
        hero: {
            title: 'Why Choose Sorted Solutions?',
            subtitle: 'Premium features that make us stand out',
            stats: [
                { value: '50K+', label: 'Happy Customers', icon: '👥' },
                { value: '4.8★', label: 'Rating', icon: '⭐' },
                { value: '90 Days', label: 'Warranty', icon: '🛡️' },
                { value: '2 Hours', label: 'Response', icon: '⚡' }
            ]
        },
        zones: [
            {
                id: 'tech',
                title: 'Smart Technology',
                features: ['Real-time Tracking', 'Live Map View', 'GPS Navigation'],
                icon: '📍',
                color: '#6366f1',
                size: 'large'
            },
            {
                id: 'wallet',
                title: 'Digital Wallet',
                features: ['Cashless Payments', 'Auto Invoicing', 'Transaction History'],
                icon: '💳',
                color: '#10b981',
                size: 'medium'
            },
            {
                id: 'property',
                title: 'Multi-Property',
                features: ['Manage All Homes', 'Separate Histories', 'Quick Switch'],
                icon: '🏠',
                color: '#f59e0b',
                size: 'medium'
            },
            {
                id: 'service',
                title: 'Premium Service',
                features: ['On-time Guarantee', 'Certified Techs', 'Quality Parts'],
                icon: '⭐',
                color: '#8b5cf6',
                size: 'large'
            },
            {
                id: 'warranty',
                title: 'Extended Warranty',
                features: ['90-Day Coverage', 'Free Callbacks', 'Parts Guarantee'],
                icon: '🛡️',
                color: '#ec4899',
                size: 'medium'
            },
            {
                id: 'support',
                title: '24/7 Support',
                features: ['Always Available', 'Quick Response', 'Expert Help'],
                icon: '💬',
                color: '#14b8a6',
                size: 'small'
            }
        ],
        brands: ['Samsung', 'Daikin', 'Siemens', 'Bosch', 'LG', 'Voltas', 'Bajaj', 'Haier', 'Mitsubishi', 'Faber']
    };

    return (
        <section className="why-choose-creative">
            <div className="creative-container-why">
                {/* Animated Background Grid */}
                <div className="grid-background">
                    {[...Array(20)].map((_, i) => (
                        <div key={i} className="grid-line" style={{ animationDelay: `${i * 0.1}s` }}></div>
                    ))}
                </div>

                {/* Hero Stats Bar */}
                <div className="stats-hero">
                    <h2 className="why-title">{features.hero.title}</h2>
                    <p className="why-subtitle">{features.hero.subtitle}</p>
                    <div className="stats-bar">
                        {features.hero.stats.map((stat, index) => (
                            <div key={index} className="stat-item" style={{ animationDelay: `${index * 0.1}s` }}>
                                <span className="stat-icon">{stat.icon}</span>
                                <div className="stat-content">
                                    <div className="stat-value">{stat.value}</div>
                                    <div className="stat-label">{stat.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bento Grid Layout */}
                <div className="bento-grid">
                    {features.zones.map((zone) => (
                        <div
                            key={zone.id}
                            className={`bento-zone bento-${zone.size} ${hoveredZone === zone.id ? 'hovered' : ''}`}
                            onMouseEnter={() => setHoveredZone(zone.id)}
                            onMouseLeave={() => setHoveredZone(null)}
                            style={{ '--zone-color': zone.color }}
                        >
                            <div className="bento-bg" style={{ background: zone.color }}></div>
                            <div className="bento-content">
                                <div className="bento-icon">{zone.icon}</div>
                                <h3 className="bento-title">{zone.title}</h3>
                                <ul className="bento-features">
                                    {zone.features.map((feature, idx) => (
                                        <li key={idx}>
                                            <span className="feature-dot">•</span>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bento-glow" style={{ background: zone.color }}></div>
                        </div>
                    ))}
                </div>

                {/* Brands Ticker */}
                <div className="brands-ticker">
                    <div className="ticker-label">Trusted by Leading Brands</div>
                    <div className="ticker-wrapper">
                        <div className="ticker-track">
                            {[...features.brands, ...features.brands, ...features.brands].map((brand, index) => (
                                <div key={index} className="ticker-item">
                                    {brand}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default WhyChooseUsSection;



