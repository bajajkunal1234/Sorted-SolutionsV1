'use client'

import { useState, useEffect } from 'react';
import { Printer, Save, Eye, Plus, Trash2, CheckCircle, Building2, ExternalLink } from 'lucide-react';
import { printSettingsAPI } from '@/lib/adminAPI';

function PrintSetup() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    // Company info is read-only here — edit via Company Details button
    const [companyPreview, setCompanyPreview] = useState({ name: '', email: '', gst: '' });
    const [settings, setSettings] = useState({
        showLogo: true,
        showGST: true,
        showTerms: true,
        paperSize: 'A4',
        fontSize: 'medium',
        includeSignature: true,
        templateStyle: 'modern-boxes',
        gstBreakdown: {
            showCGST: true,
            showSGST: true,
            showIGST: false,
            cgstRate: 9,
            sgstRate: 9,
            igstRate: 18
        }
    });

    const [invoiceTerms, setInvoiceTerms] = useState([]);
    const [quotationTerms, setQuotationTerms] = useState([]);
    const [rentalTerms, setRentalTerms] = useState([]);
    const [amcTerms, setAmcTerms] = useState([]);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setIsLoading(true);
            const data = await printSettingsAPI.get();
            if (data) {
                // Store company info for the preview card only
                setCompanyPreview({
                    name: data.company_name || '',
                    email: data.company_email || '',
                    gst: data.gst_number || ''
                });
                setSettings({
                    showLogo: data.show_logo ?? true,
                    showGST: data.show_gst ?? true,
                    showTerms: data.show_terms ?? true,
                    paperSize: data.paper_size || 'A4',
                    fontSize: data.font_size || 'medium',
                    includeSignature: data.include_signature ?? true,
                    templateStyle: data.template_style || 'modern-boxes',
                    gstBreakdown: data.gst_breakdown || {
                        showCGST: true, showSGST: true, showIGST: false, cgstRate: 9, sgstRate: 9, igstRate: 18
                    }
                });
                setInvoiceTerms(data.invoice_terms || []);
                setQuotationTerms(data.quotation_terms || []);
                setRentalTerms(data.rental_terms || []);
                setAmcTerms(data.amc_terms || []);
            }
        } catch (error) {
            console.error('Failed to load print settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const [showPreview, setShowPreview] = useState(false);
    const [previewType, setPreviewType] = useState('invoice');

    const templateStyles = [
        { id: 'modern-boxes', name: 'Modern (Dark Header)', description: 'Dark navy header with white company text — clean and professional' },
        { id: 'classic-lines', name: 'Classic Lines', description: 'Traditional line separators, light and minimal' },
        { id: 'minimal-clean', name: 'Minimal Clean', description: 'Ultra-minimal with subtle borders, great for modern businesses' },
        { id: 'professional-grid', name: 'Professional Grid', description: 'Structured two-column header, grid-based layout' }
    ];


    const handleSave = async () => {
        try {
            setIsSaving(true);
            // Merge layout prefs on top of existing saved data (preserves company info)
            const existing = await printSettingsAPI.get() || {};
            const payload = {
                ...existing,
                show_logo: settings.showLogo,
                show_gst: settings.showGST,
                show_terms: settings.showTerms,
                paper_size: settings.paperSize,
                font_size: settings.fontSize,
                include_signature: settings.includeSignature,
                template_style: settings.templateStyle,
                gst_breakdown: settings.gstBreakdown,
                invoice_terms: invoiceTerms,
                quotation_terms: quotationTerms,
                rental_terms: rentalTerms,
                amc_terms: amcTerms
            };
            await printSettingsAPI.update(payload);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            alert('Failed to save settings: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // ── Terms CRUD helpers ───────────────────────────────────────────────────
    const makeTermsHandlers = (getter, setter) => ({
        add: (defaultText) => setter([...getter, defaultText]),
        update: (i, v) => { const a = [...getter]; a[i] = v; setter(a); },
        delete: (i) => setter(getter.filter((_, idx) => idx !== i))
    });

    const invoiceH = makeTermsHandlers(invoiceTerms, setInvoiceTerms);
    const quotationH = makeTermsHandlers(quotationTerms, setQuotationTerms);
    const rentalH = makeTermsHandlers(rentalTerms, setRentalTerms);
    const amcH = makeTermsHandlers(amcTerms, setAmcTerms);

    if (isLoading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading print settings...
            </div>
        );
    }

    // ── Shared style for section cards ────────────────────────────────────────
    const card = {
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-lg)'
    };

    const label = (text, required) => (
        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px', color: 'var(--text-primary)' }}>
            {text}{required && <span style={{ color: 'var(--color-danger)', marginLeft: '2px' }}>*</span>}
        </label>
    );

    const checkRow = (checked, onChange, text) => (
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer', padding: '6px 0' }}>
            <input type="checkbox" checked={checked} onChange={onChange} style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }} />
            <span style={{ fontSize: 'var(--font-size-sm)' }}>{text}</span>
        </label>
    );

    const TermsBlock = ({ title, items, handlers, defaultText }) => (
        <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>{title}</h4>
                <button className="btn btn-secondary" onClick={() => handlers.add(defaultText)} style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Plus size={14} /> Add Term
                </button>
            </div>
            {items.length === 0 && (
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontStyle: 'italic', margin: 0 }}>
                    No terms yet. Click "Add Term" to add one.
                </p>
            )}
            <div style={{ display: 'grid', gap: 'var(--spacing-sm)', maxHeight: '220px', overflow: 'auto' }}>
                {items.map((term, index) => (
                    <div key={index} style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                        <span style={{ minWidth: '20px', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', textAlign: 'right' }}>{index + 1}.</span>
                        <input
                            type="text"
                            value={term}
                            onChange={(e) => handlers.update(index, e.target.value)}
                            className="form-input"
                            style={{ flex: 1, fontSize: 'var(--font-size-xs)', padding: '6px 10px' }}
                            placeholder="Enter term..."
                        />
                        <button onClick={() => handlers.delete(index)} style={{ padding: '4px', border: 'none', background: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}>
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, marginBottom: '2px' }}>Print Setup</h3>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', margin: 0 }}>
                        Company branding, GST settings, and T&C for invoices, quotations, rentals and AMC
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                    {['invoice', 'quotation', 'rental', 'amc'].map(type => (
                        <button key={type} className="btn btn-secondary" onClick={() => { setPreviewType(type); setShowPreview(true); }} style={{ padding: '8px 14px', fontSize: 'var(--font-size-xs)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Eye size={14} /> {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                    ))}
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        {saveSuccess ? <><CheckCircle size={16} /> Saved!</> : <><Save size={16} />{isSaving ? 'Saving...' : 'Save Settings'}</>}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>

                    {/* ── LEFT COLUMN ──────────────────────────────────────── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>

                        {/* Company Info — read-only summary, edited via Company Details button */}
                        <div style={{ ...card, display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-md)', backgroundColor: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.2)' }}>
                            <Building2 size={28} style={{ color: '#6366f1', flexShrink: 0, marginTop: 2 }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>Company Information</h4>
                                    <a
                                        href="#"
                                        onClick={e => { e.preventDefault(); document.querySelector('[data-company-details-btn]')?.click(); }}
                                        style={{ fontSize: 'var(--font-size-xs)', color: '#6366f1', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500, textDecoration: 'none' }}
                                    >
                                        <ExternalLink size={12} /> Edit in Company Details
                                    </a>
                                </div>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                                    {companyPreview.name
                                        ? <><strong style={{ color: 'var(--text-primary)' }}>{companyPreview.name}</strong>{companyPreview.email && ` · ${companyPreview.email}`}{companyPreview.gst && ` · GSTIN: ${companyPreview.gst}`}</>
                                        : <span style={{ fontStyle: 'italic', color: 'var(--text-tertiary)' }}>No company details saved yet. Click "Company Details" in the top-right of this page.</span>
                                    }
                                </p>
                            </div>
                        </div>

                        {/* GST Breakdown */}
                        <div style={card}>
                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>GST Breakdown on Invoices</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                {[
                                    { key: 'showCGST', rateKey: 'cgstRate', label: 'Show CGST (Central GST)' },
                                    { key: 'showSGST', rateKey: 'sgstRate', label: 'Show SGST (State GST)' },
                                    { key: 'showIGST', rateKey: 'igstRate', label: 'Show IGST (Integrated GST)' }
                                ].map(({ key, rateKey, label: l }) => (
                                    <div key={key}>
                                        {checkRow(
                                            settings.gstBreakdown[key],
                                            e => setSettings(p => ({ ...p, gstBreakdown: { ...p.gstBreakdown, [key]: e.target.checked } })),
                                            l
                                        )}
                                        {settings.gstBreakdown[key] && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginLeft: '28px', marginTop: '4px' }}>
                                                <input
                                                    type="number"
                                                    value={settings.gstBreakdown[rateKey]}
                                                    onChange={e => setSettings(p => ({ ...p, gstBreakdown: { ...p.gstBreakdown, [rateKey]: parseFloat(e.target.value) || 0 } }))}
                                                    className="form-input"
                                                    style={{ width: '90px' }}
                                                    min="0" max="100" step="0.5"
                                                    placeholder="Rate %"
                                                />
                                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>%</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Print Options */}
                        <div style={card}>
                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>Print Options</h4>
                            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                    <div>
                                        {label('Paper Size')}
                                        <select value={settings.paperSize} onChange={e => setSettings(p => ({ ...p, paperSize: e.target.value }))} className="form-input" style={{ width: '100%' }}>
                                            <option value="A4">A4 (210 × 297 mm)</option>
                                            <option value="A5">A5 (148 × 210 mm)</option>
                                            <option value="Letter">Letter (216 × 279 mm)</option>
                                        </select>
                                    </div>
                                    <div>
                                        {label('Font Size')}
                                        <select value={settings.fontSize} onChange={e => setSettings(p => ({ ...p, fontSize: e.target.value }))} className="form-input" style={{ width: '100%' }}>
                                            <option value="small">Small (12px)</option>
                                            <option value="medium">Medium (14px)</option>
                                            <option value="large">Large (16px)</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {checkRow(settings.showLogo, e => setSettings(p => ({ ...p, showLogo: e.target.checked })), 'Show company logo on documents')}
                                    {checkRow(settings.showGST, e => setSettings(p => ({ ...p, showGST: e.target.checked })), 'Show GSTIN on header')}
                                    {checkRow(settings.showTerms, e => setSettings(p => ({ ...p, showTerms: e.target.checked })), 'Show Terms & Conditions on documents')}
                                    {checkRow(settings.includeSignature, e => setSettings(p => ({ ...p, includeSignature: e.target.checked })), 'Include signature section at bottom')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT COLUMN ─────────────────────────────────────── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>

                        {/* Template Styles */}
                        <div style={card}>
                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>Invoice Template Style</h4>
                            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                {templateStyles.map(tmpl => (
                                    <div
                                        key={tmpl.id}
                                        onClick={() => setSettings(p => ({ ...p, templateStyle: tmpl.id }))}
                                        style={{
                                            padding: 'var(--spacing-md)',
                                            backgroundColor: settings.templateStyle === tmpl.id ? 'rgba(99,102,241,0.08)' : 'var(--bg-secondary)',
                                            border: `2px solid ${settings.templateStyle === tmpl.id ? '#6366f1' : 'var(--border-primary)'}`,
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--spacing-sm)'
                                        }}
                                    >
                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${settings.templateStyle === tmpl.id ? '#6366f1' : 'var(--border-primary)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {settings.templateStyle === tmpl.id && <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#6366f1' }} />}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>{tmpl.name}</div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>{tmpl.description}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Terms blocks */}
                        <TermsBlock title="Invoice Terms & Conditions" items={invoiceTerms} handlers={invoiceH} defaultText="New invoice term..." />
                        <TermsBlock title="Quotation Terms & Conditions" items={quotationTerms} handlers={quotationH} defaultText="New quotation term..." />
                        <TermsBlock title="Rental Agreement Terms" items={rentalTerms} handlers={rentalH} defaultText="New rental term..." />
                        <TermsBlock title="AMC Agreement Terms" items={amcTerms} handlers={amcH} defaultText="New AMC term..." />
                    </div>
                </div>
            </div>

            {/* ── Preview Modal ──────────────────────────────────────────── */}
            {showPreview && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 'var(--spacing-md)' }}>
                    <div style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '900px', width: '100%', maxHeight: '92vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
                        {/* Modal Header */}
                        <div style={{ padding: 'var(--spacing-md)', backgroundColor: '#1e293b', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)', position: 'sticky', top: 0 }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>
                                    {previewType.charAt(0).toUpperCase() + previewType.slice(1)} Preview
                                </h3>
                                <p style={{ margin: '2px 0 0', fontSize: 'var(--font-size-xs)', color: '#94a3b8' }}>
                                    Template: {templateStyles.find(t => t.id === settings.templateStyle)?.name} · {settings.paperSize} · Font {settings.fontSize}
                                </p>
                            </div>
                            <button onClick={() => setShowPreview(false)} style={{ padding: '6px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* The actual preview document */}
                        <InvoicePreview settings={settings} previewType={previewType}
                            terms={previewType === 'invoice' ? invoiceTerms : previewType === 'quotation' ? quotationTerms : previewType === 'rental' ? rentalTerms : amcTerms}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Reusable preview component (also referenced by SetupInvoiceModal concept) ─
function InvoicePreview({ settings, previewType, terms }) {
    const fontSize = settings.fontSize === 'small' ? '12px' : settings.fontSize === 'large' ? '16px' : '14px';
    const tStyle = settings.templateStyle;

    const themeColor = tStyle === 'modern-boxes' ? '#1e293b' : tStyle === 'classic-lines' ? '#374151' : tStyle === 'minimal-clean' ? '#6366f1' : '#1e40af';
    const accentColor = tStyle === 'modern-boxes' ? '#6366f1' : tStyle === 'classic-lines' ? '#10b981' : tStyle === 'minimal-clean' ? '#6366f1' : '#1e40af';

    const headerStyle = tStyle === 'modern-boxes'
        ? { backgroundColor: themeColor, color: '#fff', padding: '24px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }
        : tStyle === 'professional-grid'
            ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '24px 30px', borderBottom: `3px solid ${themeColor}` }
            : { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 30px', borderBottom: tStyle === 'classic-lines' ? `2px solid ${themeColor}` : `1px solid #e2e8f0` };

    const companyTextColor = tStyle === 'modern-boxes' ? '#fff' : '#1e293b';
    const companySubColor = tStyle === 'modern-boxes' ? 'rgba(255,255,255,0.75)' : '#64748b';

    const docTitle = previewType === 'invoice' ? 'TAX INVOICE' : previewType === 'quotation' ? 'QUOTATION' : previewType === 'rental' ? 'RENTAL AGREEMENT' : 'AMC AGREEMENT';
    const refPrefix = previewType === 'invoice' ? 'INV' : previewType === 'quotation' ? 'QUO' : previewType === 'rental' ? 'RA' : 'AMC';

    return (
        <div style={{ padding: '30px', backgroundColor: '#ffffff', color: '#000000', fontFamily: 'Arial, sans-serif', fontSize }}>
            {/* Header */}
            <div style={headerStyle}>
                <div>
                    {settings.showLogo && settings.logoUrl && (
                        <img src={settings.logoUrl} alt="Logo" style={{ height: '52px', marginBottom: '12px', display: 'block' }} />
                    )}
                    <div style={{ fontWeight: 700, fontSize: '20px', color: companyTextColor }}>{settings.companyName || 'Your Company Name'}</div>
                    {settings.companyAddress && <div style={{ fontSize: '12px', color: companySubColor, marginTop: '4px', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{settings.companyAddress}</div>}
                    <div style={{ fontSize: '12px', color: companySubColor, marginTop: '4px' }}>
                        {[settings.companyPhone, settings.companyEmail].filter(Boolean).join(' · ')}
                    </div>
                    {settings.showGST && settings.gstNumber && (
                        <div style={{ fontSize: '11px', color: companySubColor, marginTop: '4px', fontFamily: 'monospace' }}>GSTIN: {settings.gstNumber}</div>
                    )}
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: tStyle === 'modern-boxes' ? '#fff' : accentColor, letterSpacing: '1px' }}>{docTitle}</div>
                    <div style={{ fontSize: '12px', color: tStyle === 'modern-boxes' ? 'rgba(255,255,255,0.7)' : '#64748b', marginTop: '8px' }}>
                        <div>#{refPrefix}-2026-0042</div>
                        <div>Date: {new Date().toLocaleDateString('en-GB')}</div>
                        {previewType !== 'invoice' || <div>Due: {new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-GB')}</div>}
                    </div>
                </div>
            </div>

            {/* Bill To */}
            <div style={{ padding: '20px 30px', backgroundColor: tStyle === 'minimal-clean' ? '#f9fafb' : 'transparent', borderBottom: tStyle !== 'modern-boxes' ? '1px solid #e2e8f0' : 'none' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#94a3b8', marginBottom: '6px' }}>Bill To</div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>Sample Customer Name</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>123 Customer Street, Andheri West, Mumbai · 400053</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>+91 98765 12345</div>
            </div>

            {/* Items Table */}
            <div style={{ padding: '0 30px 20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                    <thead>
                        <tr style={{ backgroundColor: tStyle === 'modern-boxes' ? themeColor : tStyle === 'professional-grid' ? '#f1f5f9' : '#f8fafc', color: tStyle === 'modern-boxes' ? '#fff' : '#1e293b' }}>
                            {['#', 'Description', 'HSN', 'Qty', 'Rate', 'Tax%', 'Amount'].map((h, i) => (
                                <th key={h} style={{ padding: '10px 12px', textAlign: i > 2 ? 'right' : 'left', fontWeight: 600, fontSize: '12px', borderBottom: `2px solid ${tStyle === 'minimal-clean' ? '#e2e8f0' : themeColor}` }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            ['1', 'AC Service – Split Unit 1.5 Ton', '998519', '1', '₹1,500', '18%', '₹1,770'],
                            ['2', 'Gas Refilling – R32 Refrigerant', '271600', '1', '₹2,500', '18%', '₹2,950'],
                            ['3', 'Spare Parts (Capacitor)', '8536', '2', '₹450', '18%', '₹1,062'],
                        ].map((row, ri) => (
                            <tr key={ri} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                {row.map((cell, ci) => (
                                    <td key={ci} style={{ padding: '10px 12px', fontSize: '13px', textAlign: ci > 2 ? 'right' : 'left', color: ci === 6 ? '#1e293b' : '#374151', fontWeight: ci === 6 ? 600 : 400 }}>{cell}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <div style={{ width: '280px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
                            <span style={{ color: '#64748b' }}>Subtotal:</span>
                            <span style={{ fontWeight: 600 }}>₹4,450.00</span>
                        </div>
                        {settings.showGST && (
                            <>
                                {settings.gstBreakdown.showCGST && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}><span style={{ color: '#64748b' }}>CGST ({settings.gstBreakdown.cgstRate}%):</span><span>₹{(4450 * settings.gstBreakdown.cgstRate / 100).toFixed(2)}</span></div>}
                                {settings.gstBreakdown.showSGST && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}><span style={{ color: '#64748b' }}>SGST ({settings.gstBreakdown.sgstRate}%):</span><span>₹{(4450 * settings.gstBreakdown.sgstRate / 100).toFixed(2)}</span></div>}
                                {settings.gstBreakdown.showIGST && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}><span style={{ color: '#64748b' }}>IGST ({settings.gstBreakdown.igstRate}%):</span><span>₹{(4450 * settings.gstBreakdown.igstRate / 100).toFixed(2)}</span></div>}
                            </>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: `2px solid ${themeColor}`, fontSize: '16px', fontWeight: 800, color: themeColor, marginTop: '4px' }}>
                            <span>Grand Total:</span>
                            <span style={{ color: accentColor }}>₹5,250.00</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Terms */}
            {settings.showTerms && terms.length > 0 && (
                <div style={{ margin: '0 30px', padding: '16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '24px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', marginBottom: '8px' }}>Terms & Conditions</div>
                    <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: '#64748b', lineHeight: 1.6 }}>
                        {terms.map((t, i) => <li key={i} style={{ marginBottom: '3px' }}>{t}</li>)}
                    </ol>
                </div>
            )}

            {/* Signature */}
            {settings.includeSignature && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 30px', marginBottom: '30px' }}>
                    {['Customer Signature', `For ${settings.companyName || 'Company'}`].map((sig, i) => (
                        <div key={i} style={{ textAlign: 'center' }}>
                            <div style={{ width: '180px', height: '50px', borderBottom: '1px solid #cbd5e1', marginBottom: '8px' }} />
                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>{sig}</div>
                            {i === 1 && <div style={{ fontSize: '10px', color: '#94a3b8' }}>Authorized Signatory</div>}
                        </div>
                    ))}
                </div>
            )}

            {/* Footer */}
            <div style={{ borderTop: '1px solid #e2e8f0', padding: '12px 30px', textAlign: 'center', fontSize: '10px', color: '#94a3b8' }}>
                This is a computer-generated document. {settings.companyName} · {settings.companyPhone} · {settings.companyEmail}
            </div>
        </div>
    );
}

export { InvoicePreview };
export default PrintSetup;
