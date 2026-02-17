'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { brandLogos } from '@/data/servicePageContent'
import './BrandLogos.css'

export default function BrandLogos({
    title = "Brands We Serve",
    subtitle = "Trusted by leading appliance manufacturers",
    selectedBrandIds = [] // New prop
}) {
    const [logos, setLogos] = useState(brandLogos)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/settings/brand-logos')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data && data.data.length > 0) {
                    // Filter logos if specific IDs are provided via admin
                    if (selectedBrandIds && selectedBrandIds.length > 0) {
                        const filtered = data.data.filter(b => selectedBrandIds.includes(b.id))
                        setLogos(filtered)
                    } else {
                        setLogos(data.data)
                    }
                }
            })
            .catch(error => console.error('Error fetching brand logos:', error))
            .finally(() => setLoading(false))
    }, [selectedBrandIds])

    const sizeClasses = {
        small: 'logo-small',
        medium: 'logo-medium',
        large: 'logo-large'
    }

    if (loading) {
        return (
            <section className="brand-logos">
                <div className="logos-header">
                    <h2 className="logos-title">{title}</h2>
                    {subtitle && <p className="logos-subtitle">{subtitle}</p>}
                </div>
                <div className="logos-grid">
                    <p style={{ textAlign: 'center', padding: '2rem' }}>Loading...</p>
                </div>
            </section>
        )
    }

    return (
        <section className="brand-logos">
            <div className="logos-header">
                <h2 className="logos-title">{title}</h2>
                {subtitle && <p className="logos-subtitle">{subtitle}</p>}
            </div>

            <div className="logos-grid">
                {logos.map((brand, index) => (
                    <div
                        key={brand.name}
                        className={`logo-item ${sizeClasses[brand.size] || 'logo-medium'}`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                    >
                        <div className="logo-placeholder">
                            <span className="logo-text">{brand.name}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="logos-footer">
                <p className="footer-note">
                    ...and many more! We service all major brands with genuine spare parts.
                </p>
            </div>
        </section>
    )
}
