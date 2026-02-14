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

    if (faqs.length === 0) {
        return null
    }

    return (
        <section className="faq-section">
            <div className="faq-header">
                <HelpCircle size={40} className="faq-header-icon" />
                <h2 className="faq-title">{title}</h2>
                {subtitle && <p className="faq-subtitle">{subtitle}</p>}
            </div>

            <div className="faq-container">
                {faqs.map((faq, index) => {
                    const isExpanded = expandedFAQ === index

                    return (
                        <div
                            key={index}
                            className={`faq-item ${isExpanded ? 'expanded' : ''}`}
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <button
                                className="faq-question"
                                onClick={() => toggleFAQ(index)}
                                aria-expanded={isExpanded}
                            >
                                <span className="question-text">{faq.question}</span>
                                <ChevronDown
                                    size={24}
                                    className={`faq-chevron ${isExpanded ? 'rotated' : ''}`}
                                />
                            </button>

                            <div className={`faq-answer ${isExpanded ? 'show' : ''}`}>
                                <div className="answer-content">
                                    <p>{faq.answer}</p>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="faq-footer">
                <p className="footer-question">Still have questions?</p>
                <button className="contact-button">Contact Support</button>
            </div>
        </section>
    )
}
