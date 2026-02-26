'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import './OtherLocationsSection.css'

export default function OtherLocationsSection({
    title = "Other Locations",
    subtitle = "Explore more services near you",
    locations = []
}) {
    if (!locations || locations.length === 0) return null;

    return (
        <section className="other-locations-section">
            <div className="locations-header">
                <h2 className="locations-title">{title}</h2>
                {subtitle && <p className="locations-subtitle">{subtitle}</p>}
            </div>

            <div className="locations-grid">
                {locations.map((loc, index) => {
                    // Handle both explicit objects and implicit structure
                    const locationTitle = loc.title || loc.name || 'Location';
                    const locationUrl = loc.url || '#';
                    const locationId = loc.id || `loc-${index}`;

                    return (
                        <Link
                            key={locationId}
                            href={locationUrl}
                            className="location-pill"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <span>{locationTitle}</span>
                            <ArrowRight size={18} className="arrow-icon" />
                        </Link>
                    )
                })}
            </div>
        </section>
    )
}
