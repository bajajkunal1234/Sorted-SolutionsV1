'use client'

import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'
import './FAQSection.css'

export default function FAQSection({
    title = "Frequently Asked Questions",
    subtitle = "Find answers to common questions",
    faqs = []
}) {
    const [expandedFAQ, setExpandedFAQ] = useState(null)

    const toggleFAQ = (index) => {
        setExpandedFAQ(expandedFAQ === index ? null : index)
    }

    if (!faqs || faqs.length === 0) {
        return null
    }

    return (
        <section className="services-faq-section">
            <div className="services-faq-header">
                <HelpCircle size={40} className="services-faq-header-icon" />
                <h2 className="services-faq-title">{title}</h2>
                {subtitle && <p className="services-faq-subtitle">{subtitle}</p>}
            </div>

            <div className="services-faq-container">
                {faqs.map((faq, index) => {
                    const isExpanded = expandedFAQ === index

                    return (
                        <div
                            key={index}
                            className={`services-faq-item ${isExpanded ? 'expanded' : ''}`}
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <button
                                className="services-faq-question"
                                onClick={() => toggleFAQ(index)}
                                aria-expanded={isExpanded}
                                type="button"
                            >
                                <span className="services-question-text">{faq.question}</span>
                                <ChevronDown
                                    size={22}
                                    className={`services-faq-chevron ${isExpanded ? 'rotated' : ''}`}
                                />
                            </button>

                            <div
                                className={`services-faq-answer ${isExpanded ? 'show' : ''}`}
                                aria-hidden={!isExpanded}
                            >
                                <div className="services-answer-content">
                                    <p>{faq.answer}</p>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="services-faq-footer">
                <p className="services-footer-question">Still have questions?</p>
                <a
                    href="tel:+918928895590"
                    className="services-contact-button"
                    aria-label="Call customer support"
                >
                    Contact Support
                </a>
            </div>
        </section>
    )
}
