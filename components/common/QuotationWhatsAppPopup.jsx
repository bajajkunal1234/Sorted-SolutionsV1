'use client'

import { useState } from 'react';
import { X, MessageCircle, Copy, Check, ExternalLink } from 'lucide-react';

/**
 * QuotationWhatsAppPopup
 * Props:
 *  - quotation: { quote_number, items, total_amount, subtotal, cgst, sgst, igst, total_tax }
 *  - job: { id, job_number, customer_name, customer_phone (optional) }
 *  - onClose: () => void
 */
export default function QuotationWhatsAppPopup({ quotation, job, onClose }) {
    const [copied, setCopied] = useState(false);

    if (!quotation || !job) return null;

    // Build the public tracking link – points to the customer app services tab
    // The customer logs in and sees their job + quotation details there
    const baseUrl = typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.host}`
        : '';
    const trackingUrl = `${baseUrl}/customer/dashboard`;

    // Format line items
    const lineItems = (quotation.items || [])
        .filter(i => i.description)
        .map(i => {
            const itemTotal = ((i.qty || 1) * (i.rate || 0)).toFixed(0);
            return `  • ${i.description} (${i.qty || 1} × ₹${(i.rate || 0).toLocaleString()}) = ₹${Number(itemTotal).toLocaleString()}`;
        })
        .join('\n');

    const grandTotal = (quotation.total_amount || 0).toLocaleString();
    const quoteNum = quotation.quote_number || '';
    const jobNum = job.job_number || job.id?.slice(0, 8) || '';
    const customerName = job.customer_name || 'Customer';

    const message = `Hello ${customerName}! 👋

We've prepared a repair estimate for your service request (Job #${jobNum}).

📋 *Quotation ${quoteNum}*

*Items:*
${lineItems || '  (See details in the app)'}

${quotation.cgst > 0 ? `Subtotal: ₹${(quotation.subtotal || 0).toLocaleString()}
CGST: ₹${(quotation.cgst || 0).toFixed(2)}
SGST: ₹${(quotation.sgst || 0).toFixed(2)}
` : ''}*Total Amount: ₹${grandTotal}*

📱 View & track your service request here:
${trackingUrl}

Please review and let us know if you'd like to proceed. Feel free to call us for any queries!

— Sorted Solutions`;

    const phone = job.customer_phone ? job.customer_phone.replace(/\D/g, '') : '';
    const waUrl = `https://wa.me/${phone ? '91' + phone : ''}?text=${encodeURIComponent(message)}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 9999, padding: '0'
        }}>
            <div style={{
                background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                borderRadius: '28px 28px 0 0',
                width: '100%', maxWidth: '640px',
                maxHeight: '90vh', overflowY: 'auto',
                boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderBottom: 'none',
                padding: '24px'
            }}>
                {/* Drag handle */}
                <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 24px' }} />

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#f8fafc' }}>
                            📤 Send Quotation
                        </h2>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                            Share via WhatsApp with a tracking link
                        </p>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8',
                        borderRadius: '50%', width: 32, height: 32,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                    }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Status badge */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 12,
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                    marginBottom: 20
                }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>
                        Quotation saved — Job status set to Quotation Sent
                    </span>
                </div>

                {/* Tracking link */}
                <div style={{
                    background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)',
                    borderRadius: 12, padding: '12px 14px', marginBottom: 20
                }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                        📱 Customer Tracking Link
                    </div>
                    <div style={{ fontSize: 13, color: '#cbd5e1', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                        {trackingUrl}
                    </div>
                </div>

                {/* Message Preview */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 12, padding: '14px', marginBottom: 20,
                    maxHeight: 240, overflowY: 'auto'
                }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                        Message Preview
                    </div>
                    <pre style={{
                        margin: 0, fontSize: 12, color: '#94a3b8',
                        whiteSpace: 'pre-wrap', lineHeight: 1.6, fontFamily: 'inherit'
                    }}>
                        {message}
                    </pre>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={handleCopy}
                        style={{
                            flex: 1, padding: '14px', borderRadius: 14,
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                            color: copied ? '#10b981' : '#94a3b8',
                            fontSize: 14, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            transition: 'all 0.2s'
                        }}
                    >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            flex: 2, padding: '14px', borderRadius: 14,
                            background: 'linear-gradient(135deg, #25d366, #128c7e)',
                            border: 'none', color: '#ffffff',
                            fontSize: 14, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            textDecoration: 'none', boxShadow: '0 8px 24px rgba(37,211,102,0.3)'
                        }}
                    >
                        <MessageCircle size={18} />
                        Send via WhatsApp
                    </a>
                </div>

                <button
                    onClick={onClose}
                    style={{
                        width: '100%', padding: '12px', borderRadius: 12, marginTop: 10,
                        background: 'transparent', border: 'none',
                        color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer'
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    );
}
