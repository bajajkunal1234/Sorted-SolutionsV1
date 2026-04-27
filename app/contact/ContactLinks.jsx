'use client';

import { Phone, MessageSquare } from 'lucide-react';

const cardStyle = {
    background: 'var(--bg-secondary,#1a1a2e)',
    border: '1.5px solid var(--border-primary,#2d2d3a)',
    borderRadius: '16px',
    padding: '24px',
    transition: 'border-color 0.2s',
    height: '100%',
};
const iconWrap = (bg) => ({
    width: '44px', height: '44px', borderRadius: '12px',
    background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '16px',
});
const cardTitle = { fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary,#6b7280)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' };
const cardValue = { fontSize: '16px', fontWeight: 700, color: 'var(--text-primary,#fff)', marginBottom: '4px' };
const cardMeta  = { fontSize: '13px', color: 'var(--text-secondary,#94a3b8)' };

function push(event) {
    if (typeof window !== 'undefined') {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event });
    }
}

/** Phone card — fires custom_call_click into GTM dataLayer */
export function PhoneCard() {
    return (
        <a href="tel:+918928895590" style={{ textDecoration: 'none' }}
            onClick={() => push('custom_call_click')}
        >
            <div style={cardStyle}>
                <div style={iconWrap('#6366f1')}><Phone size={22} color="#fff" /></div>
                <h3 style={cardTitle}>Call / WhatsApp</h3>
                <p style={cardValue}>+91 89288 95590</p>
                <p style={cardMeta}>Mon – Sun, 8 AM – 8 PM</p>
            </div>
        </a>
    );
}

/** WhatsApp card — fires custom_whatsapp_click into GTM dataLayer */
export function WhatsAppCard() {
    return (
        <a href="https://wa.me/918928895590" target="_blank" rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
            onClick={() => push('custom_whatsapp_click')}
        >
            <div style={cardStyle}>
                <div style={iconWrap('#22c55e')}><MessageSquare size={22} color="#fff" /></div>
                <h3 style={cardTitle}>WhatsApp</h3>
                <p style={cardValue}>Chat with us directly</p>
                <p style={cardMeta}>Quick responses guaranteed</p>
            </div>
        </a>
    );
}
