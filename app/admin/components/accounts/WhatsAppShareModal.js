'use client'

import { useState, useEffect, useRef } from 'react';
import { X, MessageCircle, Download, Copy, CheckCircle, ExternalLink, Phone } from 'lucide-react';

/**
 * WhatsApp Share Modal
 * ─────────────────────────────────────────────────────────────────
 * Shows a per-type message preview, lets admin edit it inline,
 * then opens WhatsApp with the text pre-filled.
 * Also offers a "Download PDF" button (uses the same print engine
 * but saves as PDF instead of sending to printer).
 *
 * Props:
 *   item       – the transaction / voucher record
 *   tab        – 'sales' | 'purchases' | 'quotations' | 'receipts' | 'payments'
 *   onClose    – close callback
 *   onPrint    – callback to trigger the print/PDF generator (same as pressing Print)
 *   printSettings – the printSettingsRef.current object (company info)
 */

// ── Default message templates per document type ────────────────────────────────
const DEFAULT_TEMPLATES = {
    sales: (vars) =>
`Dear ${vars.customer_name},

Your *Tax Invoice* has been created.

🧾 Invoice No: *${vars.ref_number}*
📅 Date: ${vars.date}
💰 Amount: *₹${vars.amount}*
${vars.status ? `📌 Status: ${vars.status}` : ''}

${vars.items_summary ? `Items:\n${vars.items_summary}\n` : ''}${vars.notes ? `Notes: ${vars.notes}\n` : ''}
Thank you for your business! 🙏
— ${vars.company_name}`,

    purchases: (vars) =>
`Dear ${vars.customer_name},

Your *Purchase Invoice* has been recorded.

🧾 Invoice No: *${vars.ref_number}*
📅 Date: ${vars.date}
💰 Amount: *₹${vars.amount}*

Thank you!
— ${vars.company_name}`,

    quotations: (vars) =>
`Dear ${vars.customer_name},

We have prepared a *Quotation* for you.

📋 Quote No: *${vars.ref_number}*
📅 Date: ${vars.date}
💰 Total: *₹${vars.amount}*
${vars.valid_until ? `⏰ Valid Until: ${vars.valid_until}` : ''}

${vars.items_summary ? `Scope of Work:\n${vars.items_summary}\n` : ''}Please review and let us know if you'd like to proceed.

— ${vars.company_name}
📞 ${vars.company_phone}`,

    receipts: (vars) =>
`Dear ${vars.customer_name},

We have received your payment. 

🧾 Receipt No: *${vars.ref_number}*
📅 Date: ${vars.date}
💰 Amount Received: *₹${vars.amount}*
💳 Mode: ${vars.payment_mode || 'Cash'}
${vars.notes ? `📝 Reference: ${vars.notes}` : ''}

Thank you for your timely payment! ✅
— ${vars.company_name}`,

    payments: (vars) =>
`Dear ${vars.customer_name},

A payment has been made on your behalf.

🧾 Payment Ref: *${vars.ref_number}*
📅 Date: ${vars.date}
💰 Amount: *₹${vars.amount}*
💳 Mode: ${vars.payment_mode || 'Cash'}
${vars.notes ? `📝 Note: ${vars.notes}` : ''}

— ${vars.company_name}`,
};

// Build items summary (max 5 lines to keep WhatsApp message readable)
function buildItemsSummary(items) {
    if (!Array.isArray(items) || items.length === 0) return '';
    return items.slice(0, 5).map((it, i) =>
        `  ${i + 1}. ${it.description || it.name || 'Item'} × ${it.qty || it.quantity || 1} — ₹${Number(it.total || it.amount || 0).toLocaleString('en-IN')}`
    ).join('\n') + (items.length > 5 ? `\n  ...+${items.length - 5} more` : '');
}

export default function WhatsAppShareModal({ item, tab, onClose, onPrint, printSettings }) {
    const ps = printSettings || {};
    const ref = item.invoice_number || item.quote_number || item.receipt_number || item.payment_number || item.id || '';
    const amount = Number(item.total_amount || item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const date = item.date ? new Date(item.date).toLocaleDateString('en-GB') : '';
    const validUntil = item.valid_until ? new Date(item.valid_until).toLocaleDateString('en-GB') : '';

    const vars = {
        customer_name: item.account_name || 'Customer',
        ref_number: ref,
        date,
        amount,
        status: item.status || '',
        payment_mode: item.payment_mode || '',
        notes: item.notes || '',
        valid_until: validUntil,
        items_summary: buildItemsSummary(item.items),
        company_name: ps.company_name || 'Sorted Solutions',
        company_phone: ps.company_phone || '',
    };

    const templateFn = DEFAULT_TEMPLATES[tab] || DEFAULT_TEMPLATES.sales;
    const [message, setMessage] = useState(() => templateFn(vars));
    const [phone, setPhone] = useState('');
    const [copied, setCopied] = useState(false);
    const [fetchingPhone, setFetchingPhone] = useState(false);
    const textareaRef = useRef(null);

    // Try to fetch the account's phone number
    useEffect(() => {
        if (!item.account_id) return;
        setFetchingPhone(true);
        fetch(`/api/admin/accounts?id=${item.account_id}`)
            .then(r => r.json())
            .then(d => {
                const p = d?.data?.mobile || d?.data?.phone || '';
                if (p) setPhone(p.replace(/\D/g, '').slice(-10)); // keep last 10 digits
            })
            .catch(() => {})
            .finally(() => setFetchingPhone(false));
    }, [item.account_id]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
            textareaRef.current?.select();
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleOpenWhatsApp = () => {
        const cleanPhone = phone.replace(/\D/g, '');
        const phoneParam = cleanPhone ? `91${cleanPhone}` : '';
        const url = `https://wa.me/${phoneParam}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    // PDF download: reuse the print function, but user picks "Save as PDF" in the print dialog
    const handleDownloadPDF = () => {
        if (onPrint) onPrint();
        // A brief note to user
        setTimeout(() => {
            alert('The document will open in a new tab/print dialog.\n\nTo save as PDF:\n• Chrome/Edge: Change "Destination" to "Save as PDF"\n• Then download and share the PDF file on WhatsApp.');
        }, 500);
    };

    const docTypeLabel = {
        sales: 'Tax Invoice',
        purchases: 'Purchase Invoice',
        quotations: 'Quotation',
        receipts: 'Receipt',
        payments: 'Payment',
    }[tab] || 'Document';

    return (
        <div style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1100, padding: '20px'
        }} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div style={{
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-xl)',
                width: '100%', maxWidth: '560px',
                boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
                display: 'flex', flexDirection: 'column',
                maxHeight: '90vh', overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <MessageCircle size={22} color="#fff" />
                        <div>
                            <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>
                                Share via WhatsApp
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', marginTop: '1px' }}>
                                {docTypeLabel} · {ref}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#fff' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '20px', overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Phone number */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Customer Phone Number
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, padding: '8px 12px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                                <Phone size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                                    placeholder={fetchingPhone ? 'Looking up...' : 'Enter 10-digit mobile number...'}
                                    style={{ border: 'none', background: 'none', outline: 'none', width: '100%', fontSize: '14px', color: 'var(--text-primary)' }}
                                    maxLength={10}
                                />
                            </div>
                            {phone && (
                                <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    +91 {phone}
                                </span>
                            )}
                        </div>
                        {!phone && !fetchingPhone && (
                            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                Leave blank to open WhatsApp without a pre-selected contact.
                            </p>
                        )}
                    </div>

                    {/* Message editor */}
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Message (editable)
                            </label>
                            <button
                                onClick={() => setMessage(templateFn(vars))}
                                style={{ fontSize: '11px', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px' }}
                            >
                                ↺ Reset to default
                            </button>
                        </div>

                        {/* WhatsApp bubble preview */}
                        <div style={{
                            background: '#e5ddd5',
                            borderRadius: '12px',
                            padding: '12px',
                            marginBottom: '8px',
                            minHeight: '120px',
                            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0)',
                            backgroundSize: '20px 20px'
                        }}>
                            <div style={{
                                background: '#d9fdd3',
                                borderRadius: '12px 12px 2px 12px',
                                padding: '10px 14px',
                                maxWidth: '90%',
                                marginLeft: 'auto',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                                whiteSpace: 'pre-wrap',
                                fontSize: '13px',
                                lineHeight: '1.5',
                                color: '#111b21',
                                fontFamily: 'system-ui, -apple-system, sans-serif',
                                wordBreak: 'break-word'
                            }}>
                                {message || <span style={{ color: '#94a3b8' }}>Message preview...</span>}
                            </div>
                        </div>

                        <textarea
                            ref={textareaRef}
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            rows={8}
                            className="form-input"
                            style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px', resize: 'vertical', lineHeight: 1.6 }}
                            placeholder="Type your WhatsApp message here..."
                        />
                        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                            {message.length} characters · Use *bold* and _italic_ for WhatsApp formatting
                        </p>
                    </div>

                    {/* PDF note */}
                    <div style={{
                        padding: '10px 14px',
                        backgroundColor: 'rgba(99,102,241,0.06)',
                        border: '1px solid rgba(99,102,241,0.2)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5
                    }}>
                        <strong style={{ color: 'var(--text-primary)' }}>📎 To share the PDF:</strong> Click "Save as PDF" below to open the document → in the print dialog, set destination to <em>Save as PDF</em> → then attach that file to WhatsApp.
                    </div>
                </div>

                {/* Footer actions */}
                <div style={{
                    padding: '16px 20px',
                    borderTop: '1px solid var(--border-primary)',
                    display: 'flex', gap: '10px', flexWrap: 'wrap'
                }}>
                    <button
                        onClick={handleCopy}
                        className="btn btn-secondary"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minWidth: '100px' }}
                    >
                        {copied ? <><CheckCircle size={15} color="#22c55e" /> Copied!</> : <><Copy size={15} /> Copy Text</>}
                    </button>

                    <button
                        onClick={handleDownloadPDF}
                        className="btn btn-secondary"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minWidth: '120px' }}
                    >
                        <Download size={15} /> Save as PDF
                    </button>

                    <button
                        onClick={handleOpenWhatsApp}
                        style={{
                            flex: 2,
                            padding: '10px 20px',
                            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                            border: 'none', borderRadius: 'var(--radius-md)',
                            color: '#fff', fontWeight: 700, fontSize: '14px',
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: '8px',
                            minWidth: '160px',
                            boxShadow: '0 4px 12px rgba(34,197,94,0.35)',
                            transition: 'opacity 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                        <MessageCircle size={17} />
                        Open WhatsApp
                        <ExternalLink size={13} style={{ opacity: 0.8 }} />
                    </button>
                </div>
            </div>
        </div>
    );
}
