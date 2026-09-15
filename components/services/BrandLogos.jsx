'use client'

import { useState, useEffect } from 'react'
import './BrandLogos.css'

export default function BrandLogos({
    title = "Brands We Serve",
    subtitle = "",
    selectedBrandIds = null // null = not configured (show all); [] = explicitly empty (show none); [ids] = filter
}) {
    // Replace "Trusted" with "Experienced" (e.g. "Trusted to Repair..." -> "Experienced to Repair...")
    const displayTitle = (title || "Brands We Serve").replace(/\bTrusted\b/g, 'Experienced');

    // If subtitle is the old manufacturer trust claim, suppress it
    const displaySubtitle = subtitle === "Trusted by leading appliance manufacturers" ? "" : subtitle;

    // isMounted prevents any render until after React hydration completes.
    // This avoids #425 text-content mismatch because the server has no brand data
    // but the old code tried to render a static import list on first paint.
    const [isMounted, setIsMounted] = useState(false)
    const [logos, setLogos] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setIsMounted(true)

        // If explicitly set to an empty array, show nothing — admin deselected all
        if (Array.isArray(selectedBrandIds) && selectedBrandIds.length === 0) {
            setLogos([])
            setLoading(false)
            return
        }

        fetch('/api/settings/brand-logos')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data && data.data.length > 0) {
                    if (Array.isArray(selectedBrandIds) && selectedBrandIds.length > 0) {
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

    // Don't render anything until client-side hydration is complete
    if (!isMounted) return null

    if (loading) {
        return (
            <section className="brand-logos">
                <div className="logos-header">
                    <h2 className="logos-title">{displayTitle}</h2>
                    {displaySubtitle && <p className="logos-subtitle">{displaySubtitle}</p>}
                </div>
                <div className="logos-marquee-wrapper">
                    <div className="logos-marquee-track logos-marquee-loading">
                        <p>Loading brands...</p>
                    </div>
                </div>
            </section>
        )
    }

    if (!logos || logos.length === 0) return null;

    // Duplicate logos for seamless infinite loop
    const duplicated = [...logos, ...logos, ...logos]

    return (
        <section className="brand-logos">
            <div className="logos-header">
                <h2 className="logos-title">{displayTitle}</h2>
                {displaySubtitle && <p className="logos-subtitle">{displaySubtitle}</p>}
            </div>

            <div className="logos-marquee-wrapper">
                {/* Fade edges */}
                <div className="logos-marquee-fade logos-marquee-fade-left" />
                <div className="logos-marquee-fade logos-marquee-fade-right" />

                <div className="logos-marquee-track">
                    {duplicated.map((brand, index) => (
                        <div
                            key={`${brand.id || brand.name}-${index}`}
                            className="logo-item"
                        >
                            {brand.logo_url ? (
                                <img
                                    src={brand.logo_url}
                                    alt={brand.name}
                                    className="brand-logo-img"
                                />
                            ) : (
                                <div className="logo-placeholder">
                                    <span className="logo-text">{brand.name}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="logos-footer">
                <p className="footer-note">
                    Sorted Solutions is an independent repair provider and is not affiliated with, or authorized by, any appliance brands.
                </p>
            </div>
        </section>
    )
}
