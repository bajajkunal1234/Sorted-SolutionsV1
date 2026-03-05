'use client'

import Link from 'next/link'
import './ServicesGrid.css'

/**
 * ServicesGrid — shown on all service pages.
 * Each card has an issue name (prefixed with category), price badge, and a "Book Now" link.
 * If the service belongs to a different category (cross-sell), "Book Now" navigates to that
 * category's page. If same category, it scrolls to the #booking section.
 */
export default function ServicesGrid({
    title = "Popular Services",
    subtitle = "Click any service to book instantly",
    services = [],   // [{ id, name, price, categoryId, subcategoryId, categorySlug, categoryName }]
    currentCategory = null,  // slug of the current page's category
}) {
    if (!services || services.length === 0) return null

    const handleSameCategoryBook = (e, service) => {
        e.preventDefault()
        // Fire custom event so QuickBookingForm can pre-fill itself
        window.dispatchEvent(new CustomEvent('bookingPreselect', {
            detail: {
                categoryId: service.categoryId,
                subcategoryId: service.subcategoryId,
                issueId: service.id,
                issueName: service.name
            }
        }))
        // Scroll to the #booking section
        const bookingEl = document.getElementById('booking')
        if (bookingEl) {
            bookingEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    return (
        <section className="services-grid-section" id="popular">
            <div className="services-grid-container">
                <div className="services-grid-header">
                    <h2 className="services-grid-title">{title}</h2>
                    {subtitle && <p className="services-grid-subtitle">{subtitle}</p>}
                </div>

                <div className="services-grid">
                    {services.map((service, index) => {
                        // Build a display name that includes category context
                        const catName = service.categoryName
                            ? service.categoryName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                            : null;
                        const displayName = catName ? `${catName} – ${service.name}` : service.name;

                        // Determine if this service belongs to a different category
                        const isCrossSell = service.categorySlug && service.categorySlug !== currentCategory;
                        const bookHref = isCrossSell ? `/services/${service.categorySlug}` : null;

                        return (
                            <div
                                key={service.id || index}
                                className="service-card"
                                style={{ animationDelay: `${index * 0.04}s` }}
                            >
                                <div className="service-card-icon">🔧</div>
                                <div className="service-card-name">{displayName}</div>
                                {service.price && (
                                    <div className="service-card-price">
                                        <span className="price-label">Starts at</span>
                                        <span className="price-value">₹{service.price}</span>
                                    </div>
                                )}
                                {isCrossSell ? (
                                    <Link
                                        href={bookHref}
                                        className="service-book-btn"
                                    >
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
                </div>
            </div>
        </section>
    )
}

