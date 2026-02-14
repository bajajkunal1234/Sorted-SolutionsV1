'use client'

import { useState } from 'react'
import './ServiceFAQ.css'

export default function ServiceFAQ({ category, subcategory, location, sublocation }) {
    const [openIndex, setOpenIndex] = useState(null)

    // TODO: Fetch FAQs from Supabase based on page type
    const faqs = [
        {
            question: 'How quickly can you send a technician?',
            answer: 'We can send a technician to your doorstep within 90 minutes of booking during our operating hours (8 AM - 8 PM).'
        },
        {
            question: 'Do you provide a warranty on repairs?',
            answer: 'Yes, we provide a 90-day warranty on all repairs and spare parts used.'
        },
        {
            question: 'What are your service charges?',
            answer: 'We charge a transparent diagnosis fee starting from ₹199. The final repair cost depends on the issue and parts required.'
        },
        {
            question: 'Do you service all brands?',
            answer: 'Yes, we service all major brands including Samsung, LG, Whirlpool, Daikin, Bosch, and more.'
        },
        {
            question: 'How can I track my technician?',
            answer: 'You can track your technician in real-time through our customer app or website dashboard.'
        },
    ]

    return (
        <section className="faq-section">
            <div className="container">
                <h2 className="section-title">Frequently Asked Questions</h2>
                <div className="faq-list">
                    {faqs.map((faq, idx) => (
                        <div key={idx} className="faq-item">
                            <button
                                className={`faq-question ${openIndex === idx ? 'active' : ''}`}
                                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                            >
                                {faq.question}
                                <span className="faq-icon">{openIndex === idx ? '−' : '+'}</span>
                            </button>
                            {openIndex === idx && (
                                <div className="faq-answer">
                                    {faq.answer}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}



