'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { howItWorksStages } from '@/data/servicePageContent'
import './HowItWorksAccordion.css'

export default function HowItWorksAccordion({
    title = "How It Works",
    subtitle = "Click to expand each step"
}) {
    const [stages, setStages] = useState(howItWorksStages)
    const [loading, setLoading] = useState(true)
    const [expandedIndex, setExpandedIndex] = useState(0)

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

    const toggleStage = (stageNumber) => {
        setExpandedIndex(expandedIndex === stageNumber ? null : stageNumber)
    }

    if (loading) {
        return (
            <section className="how-it-works-accordion">
                <div className="accordion-header">
                    <h2 className="accordion-title">{title}</h2>
                    {subtitle && <p className="accordion-subtitle">{subtitle}</p>}
                </div>
                <div className="accordion-container">
                    <p style={{ textAlign: 'center', padding: '2rem' }}>Loading...</p>
                </div>
            </section>
        )
    }

    return (
        <section className="how-it-works-accordion">
            <div className="accordion-header">
                <h2 className="accordion-title">{title}</h2>
                {subtitle && <p className="accordion-subtitle">{subtitle}</p>}
            </div>

            <div className="accordion-container">
                {stages.map((stage) => {
                    const isExpanded = expandedStage === stage.stage

                    return (
                        <div
                            key={stage.stage}
                            className={`accordion-item ${isExpanded ? 'expanded' : ''}`}
                        >
                            <button
                                className="accordion-trigger"
                                onClick={() => toggleStage(stage.stage)}
                                aria-expanded={isExpanded}
                            >
                                <div className="trigger-left">
                                    <div className="stage-number-badge">
                                        {isExpanded ? <Check size={20} /> : stage.stage}
                                    </div>
                                    <div className="stage-icon-small">{stage.icon}</div>
                                    <h3 className="trigger-title">{stage.title}</h3>
                                </div>

                                <ChevronDown
                                    size={24}
                                    className={`chevron ${isExpanded ? 'rotated' : ''}`}
                                />
                            </button>

                            <div className={`accordion-content ${isExpanded ? 'show' : ''}`}>
                                <div className="content-inner">
                                    <p className="content-description">{stage.description}</p>

                                    <div className="content-features">
                                        <div className="feature-item">
                                            <Check size={16} className="feature-check" />
                                            <span>Quick and easy process</span>
                                        </div>
                                        <div className="feature-item">
                                            <Check size={16} className="feature-check" />
                                            <span>Professional service</span>
                                        </div>
                                        <div className="feature-item">
                                            <Check size={16} className="feature-check" />
                                            <span>Transparent pricing</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="accordion-footer">
                <p className="footer-text">
                    Have questions? <a href="#" className="footer-link">Contact our support team</a>
                </p>
            </div>
        </section>
    )
}
