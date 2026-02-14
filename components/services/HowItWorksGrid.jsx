'use client'

import { useState, useEffect } from 'react'
import { howItWorksStages } from '@/data/servicePageContent'
import './HowItWorksGrid.css'

export default function HowItWorksGrid({
    title = "How It Works",
    subtitle = "Your repair journey in 4 simple steps"
}) {
    const [stages, setStages] = useState(howItWorksStages)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/settings/how-it-works')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data && data.data.length > 0) {
                    setStages(data.data)
                }
            })
            .catch(error => console.error('Error fetching stages:', error))
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <section className="how-it-works-grid">
                <div className="grid-header">
                    <h2 className="grid-title">{title}</h2>
                    {subtitle && <p className="grid-subtitle">{subtitle}</p>}
                </div>
                <div className="grid-container">
                    <p style={{ textAlign: 'center', padding: '2rem' }}>Loading...</p>
                </div>
            </section>
        )
    }

    return (
        <section className="how-it-works-grid">
            <div className="grid-header">
                <h2 className="grid-title">{title}</h2>
                {subtitle && <p className="grid-subtitle">{subtitle}</p>}
            </div>

            <div className="stages-grid">
                {stages.map((stage, index) => (
                    <div
                        key={stage.stage}
                        className="stage-card"
                        style={{ animationDelay: `${index * 0.15}s` }}
                    >
                        <div className="card-badge">
                            Step {stage.stage}
                        </div>

                        <div className="card-icon-large">
                            {stage.icon}
                        </div>

                        <h3 className="card-stage-title">{stage.title}</h3>
                        <p className="card-stage-description">{stage.description}</p>

                        <div className="card-connector">
                            {index < stages.length - 1 && (
                                <div className="connector-arrow">→</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid-footer">
                <div className="footer-highlight">
                    <span className="highlight-icon">⚡</span>
                    <span className="highlight-text">
                        Most repairs completed within 24 hours!
                    </span>
                </div>
            </div>
        </section>
    )
}
