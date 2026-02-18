'use client'

import { useState, useEffect } from 'react';
import './WhyChooseUsSection.css';

function WhyChooseUsSection() {
    const [hoveredZone, setHoveredZone] = useState(null);
    const [features, setFeatures] = useState({
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
                id: 'service',
                title: 'Premium Service',
                features: ['On-time Guarantee', 'Certified Techs', 'Quality Parts'],
                icon: '⭐',
                color: '#8b5cf6',
                size: 'large'
            },
            {
                id: 'warranty',
                title: '90-Day Warranty',
                features: ['Parts Coverage', 'Free Callbacks', 'Genuine Spares'],
                icon: '🛡️',
                color: '#ec4899',
                size: 'medium'
            },
            {
                id: 'tech',
                title: 'Smart Technology',
                features: ['Real-time Tracking', 'Live Map View', 'Instant Updates'],
                icon: '📍',
                color: '#6366f1',
                size: 'large'
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
        brands: ['Samsung', 'Daikin', 'Siemens', 'Bosch', 'LG', 'Voltas', 'Bajaj', 'Haier', 'Mitsubishi', 'Faber'],
        brandsConfig: {
            sectionTitle: 'Trusted by Leading Brands',
            disclaimerText: '*These trademarks or logos are used for illustration purposes only & we disclaim any specific connection with the brand in this regard.'
        }
    });
    const [horizontalScroll, setHorizontalScroll] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch dynamic zones/features
                const resF = await fetch('/api/settings/why-choose-us');
                const dataF = await resF.json();
                if (dataF.success && dataF.data?.length > 0) {
                    const zones = dataF.data.map(f => ({
                        id: f.id,
                        title: f.title,
                        features: [f.description], // Map description to first feature bullet
                        icon: f.icon,
                        color: '#6366f1', // Default color, can be enhanced later
                        size: 'medium'
                    }));
                    setFeatures(prev => ({ ...prev, zones }));
                }

                // Fetch configs
                const resConfig = await fetch('/api/settings/section-configs?id=why-choose-us');
                const dataConfig = await resConfig.json();
                if (dataConfig.success && dataConfig.data) {
                    setHorizontalScroll(dataConfig.data.extra_config?.horizontal_scroll ?? true);
                }

                // Fetch brands
                const resB = await fetch('/api/settings/brands');
                const dataB = await resB.json();
                if (dataB.success && dataB.data?.length > 0) {
                    setFeatures(prev => ({ ...prev, brands: dataB.data }));
                }

                // Fetch brands config
                const resBC = await fetch('/api/settings/section-configs?id=brand-logos-config');
                const dataBC = await resBC.json();
                if (dataBC.success && dataBC.data?.value) {
                    setFeatures(prev => ({ ...prev, brandsConfig: dataBC.data.value }));
                }
            } catch (error) {
                console.error('Error fetching Why Choose Us data:', error);
            }
        };
        fetchData();
    }, []);

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
                    <div className="ticker-label">{features.brandsConfig?.sectionTitle || 'Trusted by Leading Brands'}</div>
                    <div className="ticker-wrapper">
                        <div className="ticker-track">
                            {(features.brands.length > 0 ? [...features.brands, ...features.brands, ...features.brands] : []).map((brand, index) => (
                                <div key={index} className="ticker-item">
                                    {typeof brand === 'string' ? brand : brand.name}
                                </div>
                            ))}
                        </div>
                    </div>
                    {features.brandsConfig?.disclaimerText && (
                        <div className="ticker-disclaimer">
                            {features.brandsConfig.disclaimerText}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

export default WhyChooseUsSection;



