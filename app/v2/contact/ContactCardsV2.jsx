'use client';

import { Phone, Mail, MessageSquare, Clock } from 'lucide-react';

function pushGtm(event) {
    if (typeof window !== 'undefined') {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event });
    }
}

export default function ContactCardsV2() {
    return (
        <div className="v2-contact-grid">
            {/* Phone Card */}
            <a
                href="tel:+918928895590"
                className="v2-contact-item-card"
                onClick={() => pushGtm('custom_call_click')}
            >
                <div className="v2-contact-icon-bubble" style={{ background: '#eff6ff', color: '#2563eb' }}>
                    <Phone size={20} />
                </div>
                <span className="v2-contact-label">Call Us</span>
                <span className="v2-contact-val">+91 89288 95590</span>
                <span className="v2-contact-sub">Mon – Sun, 8 AM – 8 PM</span>
            </a>

            {/* Email Card */}
            <a
                href="mailto:support@sortedsolutions.in"
                className="v2-contact-item-card"
            >
                <div className="v2-contact-icon-bubble" style={{ background: '#ecfdf5', color: '#059669' }}>
                    <Mail size={20} />
                </div>
                <span className="v2-contact-label">Email Support</span>
                <span className="v2-contact-val" style={{ fontSize: 13.5, wordBreak: 'break-all' }}>support@sortedsolutions.in</span>
                <span className="v2-contact-sub">Replies within 4 hours</span>
            </a>

            {/* WhatsApp Card */}
            <a
                href="https://wa.me/918928895590?text=Hello%20Sorted%20Solutions%2C%20I%20need%20assistance%20with%20an%20appliance%20repair."
                target="_blank"
                rel="noopener noreferrer"
                className="v2-contact-item-card"
                onClick={() => pushGtm('custom_whatsapp_click')}
            >
                <div className="v2-contact-icon-bubble" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                    <MessageSquare size={20} />
                </div>
                <span className="v2-contact-label">WhatsApp</span>
                <span className="v2-contact-val">Chat on WhatsApp</span>
                <span className="v2-contact-sub">Instant quick response</span>
            </a>

            {/* Business Hours Card */}
            <div className="v2-contact-item-card">
                <div className="v2-contact-icon-bubble" style={{ background: '#fef3c7', color: '#d97706' }}>
                    <Clock size={20} />
                </div>
                <span className="v2-contact-label">Working Hours</span>
                <span className="v2-contact-val">8:00 AM – 8:00 PM</span>
                <span className="v2-contact-sub">7 Days a Week (Mon – Sun)</span>
            </div>
        </div>
    );
}
