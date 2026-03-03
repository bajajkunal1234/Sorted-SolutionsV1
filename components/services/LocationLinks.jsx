'use client'

import { MapPin } from 'lucide-react'
import './LocationLinks.css'

export default function LocationLinks({
    title = "We are Right In your Neighbourhood",
    subtitle = "Find us in your area",
    category,
    dynamicLocalities = null
}) {
    // Build location list from admin-configured data only (no hardcoded defaults)
    let locationList = []
    if (dynamicLocalities && dynamicLocalities.length > 0) {
        locationList = dynamicLocalities.map(l => ({
            name: typeof l === 'string' ? l : (l.name || l),
            slug: typeof l === 'string' ? l.toLowerCase().replace(/\s+/g, '-') : (l.slug || l.name?.toLowerCase().replace(/\s+/g, '-'))
        }))
    }

    // Hide section entirely if no localities configured
    if (locationList.length === 0) return null;

    return (
        <section className="location-links">
            <div className="location-header">
                <MapPin size={40} className="header-icon" />
                <h2 className="location-title">{title}</h2>
                {subtitle && <p className="location-subtitle">{subtitle}</p>}
            </div>

            <div className="locations-grid">
                {locationList.map((location, index) => {
                    const linkText = category
                        ? `${category.replace(/-/g, ' ')} in ${location.name}`
                        : `Services in ${location.name}`

                    return (
                        <div
                            key={location.slug || index}
                            className="location-link-card non-clickable"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <MapPin size={20} className="card-icon" />
                            <span className="card-text">{linkText}</span>
                        </div>
                    )
                })}
            </div>
        </section>
    )
}
