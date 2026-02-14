'use client'

import { useState } from 'react';
import { Star, MessageSquare, QrCode, Send, CheckCircle } from 'lucide-react';

function RequestFeedback({ job, onComplete, onSkip }) {
    const [feedbackSent, setFeedbackSent] = useState(false);

    const handleSendWhatsApp = () => {
        const message = `Thank you for choosing our service! We hope you're satisfied with the ${job.product.type} repair. Please take a moment to review us on Google: https://g.page/r/YOUR_BUSINESS_ID/review`;
        window.open(`https://wa.me/${job.mobile.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
        setFeedbackSent(true);
    };

    const handleComplete = () => {
        onComplete({
            feedbackRequested: feedbackSent,
            timestamp: new Date().toISOString()
        });
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

            <div style={{
                padding: 'var(--spacing-lg)',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-md)',
                textAlign: 'center'
            }}>
                <Star size={48} color="#f59e0b" style={{ margin: '0 auto var(--spacing-sm)' }} />
                <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                    Help us grow!
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                    Request {job.customerName} to leave a review on Google
                </div>
            </div>

            {/* Send Options */}
            {!feedbackSent ? (
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                        <button
                            onClick={handleSendWhatsApp}
                            className="btn"
                            style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: '#25D366',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 'var(--spacing-xs)'
                            }}
                        >
                            <MessageSquare size={24} />
                            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Send via WhatsApp</span>
                        </button>
                        <button
                            onClick={() => setFeedbackSent(true)}
                            className="btn btn-secondary"
                            style={{
                                padding: 'var(--spacing-md)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 'var(--spacing-xs)'
                            }}
                        >
                            <QrCode size={24} />
                            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Show QR Code</span>
                        </button>
                    </div>

                    {/* QR Code Display (if selected) */}
                    {feedbackSent && (
                        <div style={{
                            padding: 'var(--spacing-lg)',
                            backgroundColor: 'white',
                            borderRadius: 'var(--radius-md)',
                            textAlign: 'center',
                            border: '1px solid var(--border-primary)',
                            marginBottom: 'var(--spacing-md)'
                        }}>
                            <div style={{
                                width: '200px',
                                height: '200px',
                                margin: '0 auto',
                                backgroundColor: '#f3f4f6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)',
                                color: '#6b7280'
                            }}>
                                <div>
                                    <QrCode size={48} style={{ margin: '0 auto var(--spacing-sm)' }} />
                                    <div>Google Review QR</div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--spacing-xs)' }}>
                                        (Integration pending)
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginTop: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: '#6b7280' }}>
                                Scan to leave a review
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--spacing-md)',
                    textAlign: 'center',
                    border: '2px solid #10b981'
                }}>
                    <CheckCircle size={32} color="#10b981" style={{ margin: '0 auto var(--spacing-sm)' }} />
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: '#10b981' }}>
                        Feedback request sent!
                    </div>
                </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <button
                    onClick={onSkip}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '10px' }}
                >
                    Skip
                </button>
                <button
                    onClick={handleComplete}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '10px', backgroundColor: '#10b981' }}
                >
                    ✓ Complete Job
                </button>
            </div>
        </div>
    );
}

export default RequestFeedback;

