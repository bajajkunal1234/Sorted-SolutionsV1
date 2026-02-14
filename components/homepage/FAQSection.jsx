import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './FAQSection.css';

function FAQSection() {
    const [openFaq, setOpenFaq] = useState(null);

    const faqs = [
        { id: 1, question: 'What areas do you serve?', answer: 'We serve all major areas in Mumbai including Andheri, Dadar, Ghatkopar, Mumbai Central, Kurla, and Parel.' },
        { id: 2, question: 'How quickly can you send a technician?', answer: 'We typically send a technician within 2-4 hours of booking, depending on your location and availability.' },
        { id: 3, question: 'Do you provide warranty on repairs?', answer: 'Yes, we provide a 30-day warranty on all repairs and genuine spare parts.' },
        { id: 4, question: 'What payment methods do you accept?', answer: 'We accept cash, UPI, credit/debit cards, and digital wallets.' }
    ];

    return (
        <section className="faq-section">
            <div className="section-container">
                <h2 className="section-title">Frequently Asked Questions</h2>
                <div className="faq-list">
                    {faqs.map((faq) => (
                        <div key={faq.id} className={`faq-item ${openFaq === faq.id ? 'open' : ''}`}>
                            <button
                                className="faq-question"
                                onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                            >
                                <span>{faq.question}</span>
                                <ChevronDown size={20} className="faq-icon" />
                            </button>
                            {openFaq === faq.id && (
                                <div className="faq-answer">{faq.answer}</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default FAQSection;



