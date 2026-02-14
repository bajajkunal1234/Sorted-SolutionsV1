'use client'

import { useState, useEffect } from 'react'
import {
    Clock, History, Wallet, Building2, Map, MapPin, Package, Star
} from 'lucide-react'
import { whyChooseUsFeatures } from '@/data/servicePageContent'
import './WhyChooseUs.css'

const iconMap = {
    Clock, History, Wallet, Building2, Map, MapPin, Package, Star
}

export default function WhyChooseUs({
    title = "Why Choose Us?",
    subtitle = "Experience the difference with our premium services"
}) {
    const [features, setFeatures] = useState(whyChooseUsFeatures)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/settings/why-choose-us')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data && data.data.length > 0) {
                    setFeatures(data.data)
                }
            })
            .catch(error => console.error('Error fetching features:', error))
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <section className="why-choose-us">
                <div className="why-header">
                    <h2 className="why-title">{title}</h2>
                    {subtitle && <p className="why-subtitle">{subtitle}</p>}
                </div>
                <div className="features-scroll-container">
                    <p style={{ textAlign: 'center', padding: '2rem' }}>Loading...</p>
                </div>
            </section>
        )
    }

    return (
        <section className="why-choose-us">
            <div className="why-header">
                <h2 className="why-title">{title}</h2>
                {subtitle && <p className="why-subtitle">{subtitle}</p>}
            </div>

            <div className="features-scroll-container">
                <div className="features-scroll">
                    {features.map((feature, index) => {
                        const IconComponent = iconMap[feature.icon] || Star

                        return (
                            <div
                                key={feature.id}
                                className="feature-card"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <div className="feature-icon-wrapper">
                                    <IconComponent size={32} className="feature-icon" />
                                </div>

                                <h3 className="feature-title">{feature.title}</h3>
                                <p className="feature-description">{feature.description}</p>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="scroll-hint">
                <span className="hint-text">← Scroll to see more →</span>
            </div>
        </section>
    )
}
