'use client'

import { useState, useEffect } from 'react';
import { X, MessageCircle, Copy, Check, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

/**
 * DocumentWhatsAppPopup
 * Props:
 *  - document: { quote_number, invoice_number, items, total_amount, subtotal, cgst, sgst, igst, total_tax }
 *  - type: 'quotation' | 'invoice'
 *  - job: { id, job_number, customer_name, customer_phone (optional) }
 *  - onClose: () => void
 */
export default function DocumentWhatsAppPopup({ document: docProp, type = 'quotation', job, onClose }) {
    const [copied, setCopied] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        let active = true;
        async function fetchPrintSettings() {
            try {
                const res = await fetch('/api/admin/print-settings');
                const resData = await res.json();
                if (resData.success && resData.data && active) {
                    setSettings(resData.data);
                }
            } catch (err) {
                console.error('Failed to fetch print settings:', err);
            }
        }
        fetchPrintSettings();
        return () => { active = false; };
    }, []);

    if (!docProp || !job) return null;

    const baseUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '';
    const trackingUrl = `${baseUrl}/customer/dashboard`;

    const lineItems = (docProp.items || [])
        .filter(i => i.description)
        .map(i => `  • ${i.description} (${i.qty || 1} × ₹${(i.rate || 0).toLocaleString()}) = ₹${Number(((i.qty || 1) * (i.rate || 0)).toFixed(0)).toLocaleString()}`)
        .join('\n');

    const grandTotal = (docProp.total_amount || 0).toLocaleString();
    const docNum = type === 'invoice' ? docProp.invoice_number : docProp.quote_number;
    const jobNum = job.job_number || job.id?.slice(0, 8) || '';
    const customerName = job.customer_name || 'Customer';

    const isInvoice = type === 'invoice';

    const [customContent, setCustomContent] = useState('');
    const [loadingTemplate, setLoadingTemplate] = useState(true);

    useEffect(() => {
        let active = true;
        async function fetchTemplate() {
            try {
                const res = await fetch('/api/notifications/templates');
                const data = await res.json();
                if (data.success && active) {
                    const targetType = isInvoice ? 'invoice_whatsapp' : 'quotation_whatsapp';
                    // Find default template or any template of the target type
                    const template = data.data.find(t => t.channel === 'whatsapp' && t.type === targetType && t.is_default) ||
                                     data.data.find(t => t.channel === 'whatsapp' && t.type === targetType);
                    if (template && template.content) {
                        setCustomContent(template.content);
                    }
                }
            } catch (e) {
                console.error('Error fetching whatsapp template:', e);
            } finally {
                if (active) setLoadingTemplate(false);
            }
        }
        fetchTemplate();
        return () => { active = false; };
    }, [isInvoice]);

    const fallbackTemplate = isInvoice ? `Hello {customer_name}! 👋

We've prepared your final invoice for service request (Job #{job_number}).

📋 *Invoice {invoice_number}*

Subtotal: {subtotal}
CGST: {cgst}
SGST: {sgst}
*Total Amount: {total_amount}*

📱 View & track your service request here:
{tracking_url}

Thank you for choosing us! Feel free to call us for any queries.

— Sorted Solutions` : `Hello {customer_name}! 👋

We've prepared your repair estimate for service request (Job #{job_number}).

📋 *Quotation {quote_number}*

📱 View & track your service request here:
{tracking_url}

Please review and let us know if you'd like to proceed. Feel free to call us for any queries.

— Sorted Solutions`;

    const compileTemplate = (content) => {
        if (!content) return '';
        let result = content;
        
        // Remove *Items:* and *Total Amount:* sections dynamically if type is quotation
        if (type === 'quotation') {
            result = result.replace(/\*Items:\*\s*\n?\{\s*line_items\s*\}\s*\n?/gi, '');
            result = result.replace(/\*Total Amount:\s*\{\s*total_amount\s*\}\*\s*\n?/gi, '');
            result = result.replace(/Subtotal:\s*\{\s*subtotal\s*\}\s*\n?/gi, '');
            result = result.replace(/CGST:\s*\{\s*cgst\s*\}\s*\n?/gi, '');
            result = result.replace(/SGST:\s*\{\s*sgst\s*\}\s*\n?/gi, '');
            result = result.replace(/\n{3,}/g, '\n\n');
        }
        
        const replacements = {
            customer_name: customerName,
            job_number: jobNum,
            invoice_number: docNum || '',
            quote_number: docNum || '',
            line_items: lineItems || '  (See details in the app)',
            subtotal: `₹${(docProp.subtotal || docProp.total_amount || 0).toLocaleString()}`,
            cgst: docProp.cgst > 0 ? `₹${(docProp.cgst || 0).toFixed(2)}` : '₹0.00',
            sgst: docProp.sgst > 0 ? `₹${(docProp.sgst || 0).toFixed(2)}` : '₹0.00',
            total_amount: `₹${grandTotal}`,
            tracking_url: trackingUrl
        };
        
        Object.entries(replacements).forEach(([key, val]) => {
            const regex = new RegExp(`\\{\\s*${key}\\s*\\}`, 'gi');
            result = result.replace(regex, val);
        });
        
        return result;
    };

    const message = compileTemplate(customContent || fallbackTemplate);

    // Robust extraction and normalization of customer phone number to prevent duplicate country codes
    const rawPhone = job.customer_phone || 
                     job.customerPhone || 
                     job.mobile || 
                     job.phone || 
                     job.customer?.phone || 
                     job.customer?.mobile || 
                     '';
    
    let phoneDigits = rawPhone.replace(/\D/g, '');
    if (phoneDigits.length === 12 && phoneDigits.startsWith('91')) {
        phoneDigits = phoneDigits.slice(2);
    } else if (phoneDigits.length === 11 && phoneDigits.startsWith('0')) {
        phoneDigits = phoneDigits.slice(1);
    }
    
    const waUrl = `https://wa.me/${phoneDigits.length === 10 ? '91' + phoneDigits : phoneDigits}?text=${encodeURIComponent(message)}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
        }
    };

    // High-Fidelity Client-side A4 PDF Generator using html2pdf.js and global print setup templates
    const generateInvoicePDF = async (downloadOnly = false) => {
        setGeneratingPdf(true);
        try {
            const html2pdf = (await import('html2pdf.js')).default;

            // Prepare transaction object for printing, matching the DB fields used by the print inject engine
            const itemForPrint = {
                ...docProp,
                account_name: job.customer_name || docProp.account_name || '',
                account_phone: job.customer_phone || docProp.account_phone || '',
                account_address: job.customer_address || job.address || docProp.account_address || docProp.billing_address || '',
                job_number: job.job_number || docProp.job_number || '',
                date: docProp.created_at || docProp.date || new Date().toISOString()
            };

            const tabType = type === 'invoice' ? 'sales' : 'quotations';
            
            // Invoke the global generator injected by public/scripts/_print_func_inject.js
            let printHtml = '';
            if (typeof window !== 'undefined' && window.generatePrintHtml) {
                printHtml = window.generatePrintHtml(itemForPrint, tabType, settings);
            } else {
                throw new Error('Print template engine not loaded.');
            }

            // Remove print window scripts from the HTML code so print dialog doesn't pop up during PDF rendering
            const cleanHtml = printHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

            // Create an isolated sandboxed iframe to mount and render the print HTML, preventing style leakage
            const iframe = window.document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.left = '-9999px';
            iframe.style.top = '-9999px';
            iframe.style.width = '794px';  // A4 size width at 96 DPI
            iframe.style.height = '1123px'; // A4 size height at 96 DPI
            window.document.body.appendChild(iframe);

            const iframeDoc = iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(cleanHtml);
            iframeDoc.close();

            // Force print margins to 0 and page width to 794px for high-fidelity edge-to-edge PDF generation
            const styleOverride = iframeDoc.createElement('style');
            styleOverride.innerHTML = `
                @page { size: A4; margin: 0 !important; }
                html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    width: 794px !important;
                    background-color: #ffffff !important;
                    background: #ffffff !important;
                    color: #1e293b !important;
                }
                /* Override any global dark mode leaks during canvas cloning */
                * {
                    --bg-primary: #ffffff !important;
                    --bg-secondary: #f8fafc !important;
                    --bg-tertiary: #f1f5f9 !important;
                    --bg-elevated: #ffffff !important;
                    --text-primary: #0f172a !important;
                    --text-secondary: #475569 !important;
                    --text-tertiary: #64748b !important;
                    --border-primary: #e2e8f0 !important;
                    color-scheme: light !important;
                }
            `;
            iframeDoc.head.appendChild(styleOverride);

            // Move all style tags from iframe head to iframe body so they are cloned by html2pdf
            const styleTags = iframeDoc.head.querySelectorAll('style');
            styleTags.forEach(tag => {
                iframeDoc.body.appendChild(tag);
            });

            // Wait a brief delay for remote images (logo, signature) and stylesheets to load in the iframe
            await new Promise((resolve) => setTimeout(resolve, 600));

            const filename = `${type === 'invoice' ? 'Invoice' : 'Quotation'}_${docNum}.pdf`;

            const opt = {
                margin: 0,
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2, 
                    useCORS: true, 
                    logging: false,
                    letterRendering: true
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            const element = iframeDoc.body;
            
            if (downloadOnly) {
                const blob = await html2pdf().set(opt).from(element).output('blob');
                window.document.body.removeChild(iframe);

                if (typeof window !== 'undefined' && window.triggerNativeDownload) {
                    const handled = await window.triggerNativeDownload(blob, filename);
                    if (handled) return;
                }

                // Fallback for standard browsers
                const downloadUrl = URL.createObjectURL(blob);
                const a = window.document.createElement('a');
                a.href = downloadUrl;
                a.download = filename;
                window.document.body.appendChild(a);
                a.click();
                window.document.body.removeChild(a);
                URL.revokeObjectURL(downloadUrl);
            } else {
                const blob = await html2pdf().set(opt).from(element).output('blob');
                window.document.body.removeChild(iframe);
                return {
                    blob,
                    filename
                };
            }
        } catch (err) {
            console.error('Error generating PDF:', err);
            alert('Failed to generate PDF invoice: ' + err.message);
        } finally {
            setGeneratingPdf(false);
        }
    };

    const handleWhatsAppShare = async (e) => {
        if (e) e.preventDefault();
        setGeneratingPdf(true);

        try {
            const pdfData = await generateInvoicePDF(false);
            if (!pdfData) {
                window.open(waUrl, '_blank');
                return;
            }

            const { blob, filename } = pdfData;
            const pdfFile = new File([blob], filename, { type: 'application/pdf' });

            // Check if Web Share API is supported and can share the PDF file
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                try {
                    await navigator.share({
                        files: [pdfFile],
                        title: isInvoice ? `Invoice ${docNum}` : `Quotation ${docNum}`,
                        text: message
                    });
                    return; // Success share
                } catch (shareErr) {
                    console.log('Web Share API sharing cancelled or failed, running fallback:', shareErr);
                }
            }

            // Fallback: download PDF and redirect to WhatsApp URL
            const downloadUrl = URL.createObjectURL(blob);
            const a = window.document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            window.document.body.appendChild(a);
            a.click();
            window.document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);

            // Notify user of manual action needed
            alert(`PDF downloaded successfully as ${filename}.\n\nWhatsApp will open now. Please select the customer and attach this PDF file to the chat manually.`);

            window.open(waUrl, '_blank');
        } catch (err) {
            console.error('Error sharing PDF on WhatsApp:', err);
            window.open(waUrl, '_blank');
        } finally {
            setGeneratingPdf(false);
        }
    };

    return (
        <div 
            onClick={e => e.stopPropagation()}
            style={{
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
                            📤 Send {isInvoice ? 'Invoice' : 'Quotation'}
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
                        {isInvoice ? 'Invoice created successfully!' : 'Quotation saved — Job status set to Quotation Sent'}
                    </span>
                </div>

                {/* Tracking link & QR Code */}
                <div style={{
                    background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)',
                    borderRadius: 12, padding: '16px', marginBottom: 20,
                    display: 'flex', alignItems: 'center', gap: '16px'
                }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                            📱 Customer Tracking Link
                        </div>
                        <div style={{ fontSize: 13, color: '#cbd5e1', wordBreak: 'break-all', fontFamily: 'monospace', marginBottom: 8 }}>
                            {trackingUrl}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            Customer can scan the QR to view this {isInvoice ? 'invoice' : 'estimate'} on their phone.
                        </div>
                    </div>
                    <div style={{
                        padding: '8px', background: '#ffffff', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <QRCodeSVG value={trackingUrl} size={80} level="L" />
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
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            transition: 'all 0.2s'
                        }}
                    >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                    
                    <button
                        onClick={() => generateInvoicePDF(true)}
                        disabled={generatingPdf}
                        style={{
                            flex: 1, padding: '14px', borderRadius: 14,
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#94a3b8',
                            fontSize: 14, fontWeight: 700, cursor: generatingPdf ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            transition: 'all 0.2s'
                        }}
                    >
                        <Download size={18} />
                        PDF
                    </button>

                    <button
                        onClick={handleWhatsAppShare}
                        disabled={generatingPdf}
                        style={{
                            flex: 2, padding: '14px', borderRadius: 14,
                            background: 'linear-gradient(135deg, #25d366, #128c7e)',
                            border: 'none', color: '#ffffff',
                            fontSize: 14, fontWeight: 700, cursor: generatingPdf ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            boxShadow: '0 8px 24px rgba(37,211,102,0.3)', transition: 'all 0.2s'
                        }}
                    >
                        <MessageCircle size={18} />
                        {generatingPdf ? 'Generating...' : 'Send via WhatsApp'}
                    </button>
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
