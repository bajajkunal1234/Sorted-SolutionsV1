'use client'

import Link from 'next/link'
import { MapPin } from 'lucide-react'
import './LocationLinks.css'

export default function LocationLinks({
    title = "We are Right In your Neighbourhood",
    subtitle = "Find us in your area",
    category,
    locations = []
}) {
    // Default Mumbai locations if none provided
    const defaultLocations = [
        { name: 'Andheri', slug: 'andheri' },
        { name: 'Malad', slug: 'malad' },
        { name: 'Ghatkopar', slug: 'ghatkopar' },
        { name: 'Parel', slug: 'parel' },
        { name: 'Mumbai Central', slug: 'mumbai-central' },
        { name: 'Bandra', slug: 'bandra' },
        { name: 'Kurla', slug: 'kurla' },
        { name: 'Dadar', slug: 'dadar' },
        { name: 'Borivali', slug: 'borivali' },
        { name: 'Kandivali', slug: 'kandivali' },
        { name: 'Goregaon', slug: 'goregaon' },
        { name: 'Powai', slug: 'powai' }
    ]

    const locationList = locations.length > 0 ? locations : defaultLocations

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
                        <Link
                            key={location.slug}
                            href={`/location/${location.slug}`}
                            className="location-link-card"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <MapPin size={20} className="card-icon" />
                            <span className="card-text">{linkText}</span>
                        </Link>
                    )
                })}
            </div>

            <div className="location-cta">
                <p className="cta-text">Don't see your area?</p>
                <button className="cta-button">Contact Us</button>
            </div>
        </section>
    )
}
