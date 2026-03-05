'use client'

import Link from 'next/link'
import './ServicesGrid.css'

const TAG_STYLES = {
    seasonal: { label: '❄️ Seasonal', bg: '#1d4ed8', color: '#fff' },
    popular: { label: '🔥 Popular', bg: '#16a34a', color: '#fff' },
    emergency: { label: '🚨 Emergency', bg: '#dc2626', color: '#fff' },
};

/**
 * ServicesGrid — shown on all service pages.
 * Shows cross-category services with category prefix in name, tag badge, price, and Book Now link.
 */
export default function ServicesGrid({
    title = "Popular Services",
    subtitle = "Click any service to book instantly",
    services = [],   // [{ id, name, price, tag, categoryId, subcategoryId, categorySlug, categoryName }]
    currentCategory = null,
}) {
    if (!services || services.length === 0) return null

    const handleSameCategoryBook = (e, service) => {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('bookingPreselect', {
            detail: {
                categoryId: service.categoryId,
                subcategoryId: service.subcategoryId,
                issueId: service.id,
                issueName: service.name
            }
        }))
        const bookingEl = document.getElementById('booking')
        if (bookingEl) bookingEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    return (
        <section className="services-grid-section" id="popular">
            <div className="services-grid-container">
                <div className="services-grid-header">
                    <h2 className="services-grid-title">{title}</h2>
                    {subtitle && <p className="services-grid-subtitle">{subtitle}</p>}
                </div>

                <div className="services-carousel-wrapper">
                    <div className="services-grid">
                        {services.map((service, index) => {
                            const catName = service.categoryName
                                ? service.categoryName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                                : null;
                            const displayName = catName ? `${catName} – ${service.name}` : service.name;

                            const isCrossSell = service.categorySlug && service.categorySlug !== currentCategory;
                            const bookHref = isCrossSell ? `/services/${service.categorySlug}` : null;

                            const tagInfo = service.tag ? TAG_STYLES[service.tag] : null;

                            return (
                                <div
                                    key={service.id || index}
                                    className="service-card"
                                    style={{ animationDelay: `${index * 0.04}s`, position: 'relative' }}
                                >
                                    {/* Tag badge */}
                                    {tagInfo && (
                                        <div style={{
                                            position: 'absolute', top: '10px', right: '10px',
                                            backgroundColor: tagInfo.bg, color: tagInfo.color,
                                            fontSize: '10px', fontWeight: 700, padding: '3px 8px',
                                            borderRadius: '999px', letterSpacing: '0.04em',
                                            textTransform: 'uppercase'
                                        }}>
                                            {tagInfo.label}
                                        </div>
                                    )}

                                    <div className="service-card-icon">🔧</div>
                                    <div className="service-card-name">{displayName}</div>
                                    {service.price && (
                                        <div className="service-card-price">
                                            <span className="price-label">Starts at</span>
                                            <span className="price-value">₹{service.price}</span>
                                        </div>
                                    )}
                                    {isCrossSell ? (
                                        <Link href={bookHref} className="service-book-btn">
                                            Book Now →
                                        </Link>
                                    ) : (
                                        <button
                                            className="service-book-btn"
                                            onClick={(e) => handleSameCategoryBook(e, service)}
                                        >
                                            Book Now →
                                        </button>
                                    )}
                                </div>
                            )
                        })}

                        {/* Explore More CTA card — always last */}
                        <Link href="/services" className="service-card service-card--cta" style={{ animationDelay: `${services.length * 0.04}s` }}>
                            <div className="service-cta-icon">🛠️</div>
                            <div className="service-cta-title">Explore All Services</div>
                            <div className="service-cta-sub">View our full range of appliance repair services across Mumbai</div>
                            <div className="service-cta-arrow">→</div>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}

