'use client'

import { useState, useEffect } from 'react';
import { X, MessageCircle, Copy, Check, ExternalLink, QrCode, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// Helper to convert image URL to base64 safely
const loadImageBase64 = (url) => {
    return new Promise((resolve) => {
        if (!url) return resolve(null);
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = window.document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            try {
                const dataURL = canvas.toDataURL('image/png');
                resolve(dataURL);
            } catch {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
};

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

    // Client-side A4 PDF Generator
    const generateInvoicePDF = async (downloadOnly = false) => {
        setGeneratingPdf(true);
        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            const compName = settings?.company_name || 'Sorted Solutions';
            const compAddress = settings?.company_address || '123 Tech Park, Sector 5, India';
            const compPhone = settings?.company_phone || '+91 99999 99999';
            const compEmail = settings?.company_email || 'info@sortedsolutions.in';
            const compGst = settings?.gst_number || '';
            const showLogo = settings?.show_logo && settings?.logo_url;
            const signatureUrl = settings?.include_signature && settings?.signature_url;

            // Load images safely with crossOrigin
            let logoBase64 = null;
            let signatureBase64 = null;
            if (showLogo) {
                logoBase64 = await loadImageBase64(settings.logo_url);
            }
            if (signatureUrl) {
                signatureBase64 = await loadImageBase64(settings.signature_url);
            }

            let y = 50;

            // Top decorative bar
            doc.setFillColor(30, 41, 59);
            doc.rect(40, y, 515, 6, 'F');
            y += 25;

            // Document Title Header
            doc.setFont('Helvetica', 'bold').setFontSize(22).setTextColor(30, 41, 59);
            doc.text(isInvoice ? 'INVOICE' : 'QUOTATION', 555, y + 15, { align: 'right' });

            // Company Logo or Name
            if (logoBase64) {
                doc.addImage(logoBase64, 'PNG', 40, y, 120, 36);
                y += 45;
            } else {
                doc.setFont('Helvetica', 'bold').setFontSize(16).setTextColor(15, 23, 42);
                doc.text(compName, 40, y + 12);
                y += 25;
            }

            // Company details text
            doc.setFont('Helvetica', 'normal').setFontSize(9).setTextColor(100, 116, 139);
            const compAddrLines = doc.splitTextToSize(compAddress, 260);
            compAddrLines.forEach(line => {
                doc.text(line, 40, y);
                y += 12;
            });
            if (compPhone || compEmail) {
                doc.text(`${compPhone} | ${compEmail}`, 40, y);
                y += 12;
            }
            if (compGst && settings?.invoice_show_gst) {
                doc.setFont('Helvetica', 'bold');
                doc.text(`GSTIN: ${compGst}`, 40, y);
                y += 12;
            }

            // Document metadata right column
            let metaY = 70 + 25;
            doc.setFont('Helvetica', 'normal').setFontSize(9).setTextColor(71, 85, 105);
            doc.text(`${isInvoice ? 'Invoice' : 'Quotation'} No: ${docNum || ''}`, 555, metaY, { align: 'right' });
            metaY += 14;
            const dateStr = docProp.created_at ? new Date(docProp.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
            doc.text(`Date: ${dateStr}`, 555, metaY, { align: 'right' });
            metaY += 14;
            
            if (isInvoice) {
                const dueDateVal = docProp.due_date ? new Date(docProp.due_date).toLocaleDateString('en-GB') : new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-GB');
                doc.text(`Due Date: ${dueDateVal}`, 555, metaY, { align: 'right' });
            }

            y = Math.max(y + 10, metaY + 20);

            // Divider line
            doc.setDrawColor(226, 232, 240);
            doc.line(40, y, 555, y);
            y += 18;

            // Bill To details
            doc.setFont('Helvetica', 'bold').setFontSize(10).setTextColor(100, 116, 139);
            doc.text('BILL TO', 40, y);
            y += 16;

            doc.setFont('Helvetica', 'bold').setFontSize(11).setTextColor(15, 23, 42);
            doc.text(customerName, 40, y);
            y += 14;

            doc.setFont('Helvetica', 'normal').setFontSize(9).setTextColor(71, 85, 105);
            const customerPhone = job.customer_phone || '';
            if (customerPhone) {
                doc.text(`Phone: ${customerPhone}`, 40, y);
                y += 14;
            }

            const customerAddr = job.customer_address || job.address || '';
            if (customerAddr) {
                const custAddrLines = doc.splitTextToSize(customerAddr, 250);
                custAddrLines.forEach(line => {
                    doc.text(line, 40, y);
                    y += 12;
                });
            }
            y += 15;

            // Items Table Header
            doc.setFillColor(241, 245, 249);
            doc.rect(40, y, 515, 20, 'F');
            doc.setFont('Helvetica', 'bold').setFontSize(9).setTextColor(71, 85, 105);
            doc.text('Description', 45, y + 13);
            doc.text('Qty', 350, y + 13);
            doc.text('Rate', 430, y + 13);
            doc.text('Amount (INR)', 555, y + 13, { align: 'right' });
            y += 20;

            // Table Rows
            const docItems = docProp.items || [];
            doc.setFont('Helvetica', 'normal').setFontSize(9).setTextColor(51, 65, 85);
            doc.setDrawColor(241, 245, 249);
            
            docItems.forEach((item) => {
                if (!item.description) return;
                const qtyVal = item.qty || 1;
                const rateVal = item.rate || 0;
                const amtVal = qtyVal * rateVal;

                const descLines = doc.splitTextToSize(item.description, 290);
                const rowH = Math.max(20, descLines.length * 12 + 6);

                if (y + rowH > 730) {
                    doc.addPage();
                    y = 50;
                    doc.setFillColor(241, 245, 249);
                    doc.rect(40, y, 515, 20, 'F');
                    doc.setFont('Helvetica', 'bold').setFontSize(9).setTextColor(71, 85, 105);
                    doc.text('Description', 45, y + 13);
                    doc.text('Qty', 350, y + 13);
                    doc.text('Rate', 430, y + 13);
                    doc.text('Amount (INR)', 555, y + 13, { align: 'right' });
                    y += 20;
                    doc.setFont('Helvetica', 'normal').setFontSize(9).setTextColor(51, 65, 85);
                }

                descLines.forEach((line, idx) => {
                    doc.text(line, 45, y + 13 + (idx * 12));
                });
                
                doc.text(qtyVal.toString(), 350, y + 13);
                doc.text(`₹${rateVal.toLocaleString()}`, 430, y + 13);
                doc.text(`₹${amtVal.toLocaleString()}`, 555, y + 13, { align: 'right' });

                doc.line(40, y + rowH, 555, y + rowH);
                y += rowH;
            });

            y += 12;

            // Totals section
            if (y + 100 > 730) {
                doc.addPage();
                y = 50;
            }

            doc.setFont('Helvetica', 'normal').setFontSize(9).setTextColor(71, 85, 105);
            doc.text('Subtotal:', 350, y);
            const subtotalVal = docProp.subtotal || docProp.total_amount || 0;
            doc.text(`₹${subtotalVal.toLocaleString()}`, 555, y, { align: 'right' });
            y += 14;

            if (docProp.cgst > 0) {
                doc.text(`CGST (${settings?.gst_breakdown?.cgstRate || 9}%):`, 350, y);
                doc.text(`₹${(docProp.cgst || 0).toLocaleString()}`, 555, y, { align: 'right' });
                y += 14;
            }
            if (docProp.sgst > 0) {
                doc.text(`SGST (${settings?.gst_breakdown?.sgstRate || 9}%):`, 350, y);
                doc.text(`₹${(docProp.sgst || 0).toLocaleString()}`, 555, y, { align: 'right' });
                y += 14;
            }
            if (docProp.igst > 0) {
                doc.text(`IGST (${settings?.gst_breakdown?.igstRate || 18}%):`, 350, y);
                doc.text(`₹${(docProp.igst || 0).toLocaleString()}`, 555, y, { align: 'right' });
                y += 14;
            }

            doc.setDrawColor(203, 213, 225);
            doc.line(350, y - 2, 555, y - 2);

            doc.setFont('Helvetica', 'bold').setFontSize(11).setTextColor(15, 23, 42);
            doc.text('Grand Total:', 350, y + 4);
            doc.text(`₹${(docProp.total_amount || 0).toLocaleString()}`, 555, y + 4, { align: 'right' });
            y += 35;

            // Footer (Terms and Signature)
            let footerY = 700;
            if (y > 600) {
                doc.addPage();
                y = 50;
            } else {
                footerY = Math.max(680, y + 40);
            }

            const invoiceTerms = settings?.invoice_terms || [];
            if (settings?.show_terms && invoiceTerms.length > 0) {
                doc.setFont('Helvetica', 'bold').setFontSize(8).setTextColor(100, 116, 139);
                doc.text('TERMS & CONDITIONS', 40, footerY - 50);
                
                doc.setFont('Helvetica', 'normal').setFontSize(7).setTextColor(100, 116, 139);
                let termY = footerY - 40;
                invoiceTerms.slice(0, 4).forEach((term, idx) => {
                    doc.text(`${idx + 1}. ${term}`, 40, termY);
                    termY += 10;
                });
            }

            if (settings?.include_signature) {
                if (signatureBase64) {
                    doc.addImage(signatureBase64, 'PNG', 430, footerY - 60, 100, 35);
                }
                doc.setFont('Helvetica', 'normal').setFontSize(7).setTextColor(100, 116, 139);
                doc.text(`For ${compName}`, 480, footerY - 65, { align: 'center' });
                
                doc.setFont('Helvetica', 'bold').setFontSize(8).setTextColor(30, 41, 59);
                doc.text('Authorized Signatory', 480, footerY - 15, { align: 'center' });
                doc.setDrawColor(203, 213, 225);
                doc.line(420, footerY - 22, 540, footerY - 22);
            }

            const filename = `${type === 'invoice' ? 'Invoice' : 'Quotation'}_${docNum}.pdf`;
            
            if (downloadOnly) {
                doc.save(filename);
            } else {
                return {
                    blob: doc.output('blob'),
                    filename
                };
            }
        } catch (err) {
            console.error('Error generating PDF:', err);
            alert('Failed to generate PDF: ' + err.message);
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

            // Check if Web Share API can share the PDF file
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
