'use client';

/** Tracked "Call To Book" button for the 404 page — fires custom_call_click into GTM dataLayer */
export default function CallToBookButton() {
    return (
        <a
            href="tel:+918928895590"
            onClick={() => {
                if (typeof window !== 'undefined') {
                    window.dataLayer = window.dataLayer || [];
                    window.dataLayer.push({ event: 'custom_call_click' });
                }
            }}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '12px 24px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff', fontWeight: 700, fontSize: '15px',
                textDecoration: 'none'
            }}
        >
            📞 Call To Book
        </a>
    );
}
