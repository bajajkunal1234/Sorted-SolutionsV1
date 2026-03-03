'use client'

import { useState } from 'react'
import './ServicesGrid.css'

/**
 * ServicesGrid — shown on all service pages.
 * Each card has an issue name, price badge, and a "Book Now" button.
 * Clicking "Book Now" pre-fills the QuickBookingForm with the correct
 * appliance, appliance type, and issue — identical to IssuesSection behaviour.
 */
export default function ServicesGrid({
    title = "Popular Services",
    subtitle = "Click any service to book instantly",
    services = [],   // [{ id, name, price, categoryId, subcategoryId }]
}) {
    const [selectedId, setSelectedId] = useState(null)

    const handleBookNow = (service) => {
        setSelectedId(service.id)

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

    if (!services || services.length === 0) return null

    return (
        <section className="services-grid-section" id="popular">
            <div className="services-grid-container">
                <div className="services-grid-header">
                    <h2 className="services-grid-title">{title}</h2>
                    {subtitle && <p className="services-grid-subtitle">{subtitle}</p>}
                </div>

                <div className="services-grid">
                    {services.map((service, index) => (
                        <div
                            key={service.id || index}
                            className={`service-card ${selectedId === service.id ? 'service-card--selected' : ''}`}
                            style={{ animationDelay: `${index * 0.04}s` }}
                        >
                            <div className="service-card-icon">🔧</div>
                            <div className="service-card-name">{service.name}</div>
                            {service.price && (
                                <div className="service-card-price">
                                    <span className="price-label">Starts at</span>
                                    <span className="price-value">₹{service.price}</span>
                                </div>
                            )}
                            <button
                                className={`service-book-btn ${selectedId === service.id ? 'service-book-btn--active' : ''}`}
                                onClick={() => handleBookNow(service)}
                            >
                                {selectedId === service.id ? '✓ Booking Selected' : 'Book Now →'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
