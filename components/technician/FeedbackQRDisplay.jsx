'use client'

import { QrCode, Star, MessageSquare, CheckCircle } from 'lucide-react';

function FeedbackQRDisplay({ job, onComplete, onSkip }) {
    const handleWhatsAppFeedback = () => {
        const message = `Thank you for choosing our service! We'd love to hear your feedback about the ${job.product.brand} ${job.product.model} service. Please rate us: https://g.page/r/YOUR_GOOGLE_REVIEW_LINK`;
        window.open(`https://wa.me/${job.mobile.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');

        setTimeout(() => {
            if (window.confirm('Has the customer scanned the QR code or received the WhatsApp message?')) {
                onComplete({ method: 'whatsapp' });
            }
        }, 2000);
    };

    return (
        <div style={{
            padding: 'var(--spacing-lg)',
            backgroundColor: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-primary)'
        }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <Star size={20} color="#f59e0b" />
                Request Customer Feedback
            </h3>

            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                Help us improve! Request the customer to leave a review.
            </p>

            {/* QR Code Display */}
            <div style={{
                padding: 'var(--spacing-xl)',
                backgroundColor: 'white',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                marginBottom: 'var(--spacing-md)',
                border: '1px solid var(--border-primary)'
            }}>
                <div style={{
                    width: '250px',
                    height: '250px',
                    margin: '0 auto',
                    backgroundColor: '#fef3c7',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 'var(--spacing-sm)',
                    border: '2px dashed #f59e0b'
                }}>
                    <QrCode size={64} color="#f59e0b" />
                    <Star size={32} color="#f59e0b" />
                    <div style={{ fontSize: 'var(--font-size-sm)', color: '#92400e', fontWeight: 600 }}>
                        Google Review QR
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: '#78350f' }}>
                        (Managed in Admin Panel)
                    </div>
                </div>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-md)' }}>
                    Ask customer to scan this QR code to leave a Google review
                </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                <button
                    onClick={handleWhatsAppFeedback}
                    className="btn"
                    style={{ padding: 'var(--spacing-md)', backgroundColor: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                    <MessageSquare size={16} />
                    Send via WhatsApp
                </button>
                <button
                    onClick={() => onComplete({ method: 'qr' })}
                    className="btn btn-primary"
                    style={{ padding: 'var(--spacing-md)', backgroundColor: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                    <CheckCircle size={16} />
                    Customer Scanned QR - Complete Job
                </button>
                <button
                    onClick={onSkip}
                    className="btn btn-secondary"
                    style={{ padding: 'var(--spacing-sm)' }}
                >
                    Skip Feedback - Complete Job
                </button>
            </div>
        </div>
    );
}

export default FeedbackQRDisplay;

