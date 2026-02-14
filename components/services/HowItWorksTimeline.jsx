'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { howItWorksStages } from '@/data/servicePageContent'
import './HowItWorksTimeline.css'

export default function HowItWorksTimeline({
    title = "How It Works",
    subtitle = "Simple steps to get your appliance fixed"
}) {
    const [stages, setStages] = useState(howItWorksStages) // Fallback to static data
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Fetch from Supabase API
        fetch('/api/settings/how-it-works')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data && data.data.length > 0) {
                    setStages(data.data)
                }
            })
            .catch(error => {
                console.error('Error fetching How It Works stages:', error)
                // Keep using static data as fallback
            })
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <section className="how-it-works-timeline">
                <div className="timeline-header">
                    <h2 className="timeline-title">{title}</h2>
                    {subtitle && <p className="timeline-subtitle">{subtitle}</p>}
                </div>
                <div className="timeline-container">
                    <p style={{ textAlign: 'center', padding: '2rem' }}>Loading...</p>
                </div>
            </section>
        )
    }

    return (
        <section className="how-it-works-timeline">
            <div className="timeline-header">
                <h2 className="timeline-title">{title}</h2>
                {subtitle && <p className="timeline-subtitle">{subtitle}</p>}
            </div>

            <div className="timeline-container">
                <div className="timeline-line"></div>

                {stages.map((stage, index) => (
                    <div
                        key={stage.stage}
                        className={`timeline-item ${index % 2 === 0 ? 'left' : 'right'}`}
                        style={{ animationDelay: `${index * 0.2}s` }}
                    >
                        <div className="timeline-content">
                            <div className="stage-number">
                                <span>{stage.stage}</span>
                            </div>

                            <div className="stage-icon">
                                {stage.icon}
                            </div>

                            <h3 className="stage-title">{stage.title}</h3>
                            <p className="stage-description">{stage.description}</p>

                            {stage.image && (
                                <div className="stage-image-wrapper">
                                    <div className="stage-image-placeholder">
                                        <span className="placeholder-text">Illustration</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="timeline-dot"></div>
                    </div>
                ))}
            </div>

            <div className="timeline-cta">
                <p className="cta-text">Ready to get started?</p>
                <button className="cta-button">Book Your Service Now</button>
            </div>
        </section>
    )
}
