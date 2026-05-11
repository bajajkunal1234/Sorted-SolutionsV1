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
        invoiceShowGST: false,
        quotationShowGST: false,
        rentalShowGST: false,
        amcShowGST: false,
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
                    companyName: data.company_name || '',
                    companyAddress: data.company_address || '',
                    companyEmail: data.company_email || '',
                    companyPhone: data.company_phone || '',
                    gstNumber: data.gst_number || '',
                    logoUrl: data.logo_url || '',
                    showLogo: data.show_logo ?? true,
                    showGST: data.show_gst ?? true,
                    showTerms: data.show_terms ?? true,
                    paperSize: data.paper_size || 'A4',
                    fontSize: data.font_size || 'medium',
                    includeSignature: data.include_signature ?? true,
                    templateStyle: data.template_style || 'modern-boxes',
                    invoiceShowGST: data.invoice_show_gst ?? false,
                    quotationShowGST: data.quotation_show_gst ?? false,
                    rentalShowGST: data.rental_show_gst ?? false,
                    amcShowGST: data.amc_show_gst ?? false,
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

    const [activeTab, setActiveTab] = useState('invoice');
    const [showPreview, setShowPreview] = useState(false);
    const [previewType, setPreviewType] = useState('invoice');

    const templateStyles = [
        { id: 'modern-boxes',      name: '🌑 Eclipse',       description: 'Midnight gradient header with gold accents — premium and bold' },
        { id: 'classic-lines',     name: '🟠 Saffron Pro',   description: 'Warm saffron/orange — inspired by Indian business aesthetics' },
        { id: 'minimal-clean',     name: '🩵 Arctic',         description: 'Ultra-clean, white space first, with a cool cyan accent' },
        { id: 'professional-grid', name: '🔴 Crimson Grid',  description: 'Structured two-column layout with a bold crimson red accent' }
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
                invoice_terms: invoiceTerms,
                quotation_terms: quotationTerms,
                rental_terms: rentalTerms,
                amc_terms: amcTerms,
                invoice_show_gst: settings.invoiceShowGST,
                quotation_show_gst: settings.quotationShowGST,
                rental_show_gst: settings.rentalShowGST,
                amc_show_gst: settings.amcShowGST,
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

    const getActiveTermsData = () => {
        if (activeTab === 'invoice') return { title: 'Invoice Terms & Conditions', items: invoiceTerms, handlers: invoiceH, gstKey: 'invoiceShowGST' };
        if (activeTab === 'quotation') return { title: 'Quotation Terms & Conditions', items: quotationTerms, handlers: quotationH, gstKey: 'quotationShowGST' };
        if (activeTab === 'rental') return { title: 'Rental Agreement Terms', items: rentalTerms, handlers: rentalH, gstKey: 'rentalShowGST' };
        return { title: 'AMC Agreement Terms', items: amcTerms, handlers: amcH, gstKey: 'amcShowGST' };
    };

    const activeTermsData = getActiveTermsData();

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, marginBottom: '2px' }}>Print Setup</h3>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', margin: 0 }}>
                        Company branding, layout, and document-specific T&C/GST settings
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
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

            {/* Content Container */}
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                    
                    {/* Top Section: Global Layout & Branding */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--spacing-lg)' }}>
                        <div style={card}>
                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>Global Print Options</h4>
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
                            <div style={{ marginTop: 'var(--spacing-sm)' }}>
                                {checkRow(settings.showLogo, e => setSettings(p => ({ ...p, showLogo: e.target.checked })), 'Show company logo on documents')}
                                {checkRow(settings.includeSignature, e => setSettings(p => ({ ...p, includeSignature: e.target.checked })), 'Include signature section at bottom')}
                            </div>
                        </div>

                        <div style={card}>
                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>Template Style</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                {templateStyles.map(tmpl => (
                                    <div
                                        key={tmpl.id}
                                        onClick={() => setSettings(p => ({ ...p, templateStyle: tmpl.id }))}
                                        style={{
                                            padding: 'var(--spacing-sm) var(--spacing-md)',
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
                                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${settings.templateStyle === tmpl.id ? '#6366f1' : 'var(--border-primary)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {settings.templateStyle === tmpl.id && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6366f1' }} />}
                                        </div>
                                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-xs)', color: 'var(--text-primary)' }}>{tmpl.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="modal-tabs" style={{ display: 'flex', borderBottom: '2px solid var(--border-primary)', marginTop: 'var(--spacing-md)' }}>
                        {[
                            { id: 'invoice', label: 'Invoices' },
                            { id: 'quotation', label: 'Quotations' },
                            { id: 'rental', label: 'Rentals' },
                            { id: 'amc', label: 'AMC Contracts' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                className={`modal-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: 'var(--spacing-sm) var(--spacing-lg)',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: activeTab === tab.id ? 600 : 500,
                                    borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : 'none',
                                    color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--text-secondary)',
                                    background: 'none',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--spacing-lg)', marginTop: 'var(--spacing-md)' }}>
                        {/* Settings for specific document type */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <div style={card}>
                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Settings
                                </h4>
                                {checkRow(
                                    settings[activeTermsData.gstKey],
                                    e => setSettings(p => ({ ...p, [activeTermsData.gstKey]: e.target.checked })),
                                    `Apply GST on ${activeTab}s`
                                )}
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '2px', marginLeft: '28px' }}>
                                    If checked, GST calculations and breakdowns will be displayed on the document.
                                </div>
                            </div>
                            
                            <TermsBlock 
                                title={activeTermsData.title} 
                                items={activeTermsData.items} 
                                handlers={activeTermsData.handlers} 
                                defaultText="Enter term..." 
                            />
                        </div>

                        {/* Live Preview for the active tab */}
                        <div style={{ ...card, padding: 0, overflow: 'hidden', height: '600px', display: 'flex', flexDirection: 'column', backgroundColor: '#e2e8f0' }}>
                            <div style={{ padding: '10px 16px', backgroundColor: '#cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: '#475569', letterSpacing: '1px', textTransform: 'uppercase' }}>Live Preview</span>
                                <button className="btn-icon" onClick={() => { setPreviewType(activeTab); setShowPreview(true); }} title="Fullscreen Preview"><Eye size={16} /></button>
                            </div>
                            <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
                                <div style={{ 
                                    backgroundColor: '#fff', 
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)', 
                                    transform: 'scale(0.85)', 
                                    transformOrigin: 'top center',
                                    minHeight: '842px',
                                    width: '100%',
                                    maxWidth: '800px',
                                    margin: '0 auto'
                                }}>
                                    <InvoicePreview 
                                        settings={{...settings, showGST: settings[activeTermsData.gstKey]}} 
                                        previewType={activeTab}
                                        terms={activeTermsData.items}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Fullscreen Preview Modal ──────────────────────────────────────────── */}
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
                        <InvoicePreview 
                            settings={{...settings, showGST: settings[previewType === 'invoice' ? 'invoiceShowGST' : previewType === 'quotation' ? 'quotationShowGST' : previewType === 'rental' ? 'rentalShowGST' : 'amcShowGST']}} 
                            previewType={previewType}
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

    const mockItems = [
        { id: 1, desc: 'AC Service – Split Unit 1.5 Ton', hsn: '998519', qty: 1, rate: 1500, tax: 18, amount: 1770, terms_conditions: ['30 days service warranty', 'Gas leak not covered'] },
        { id: 2, desc: 'Gas Refilling – R32 Refrigerant', hsn: '271600', qty: 1, rate: 2500, tax: 18, amount: 2950, terms_conditions: ['90 days warranty on gas refilling'] },
        { id: 3, desc: 'Spare Parts (Capacitor)', hsn: '8536', qty: 2, rate: 450, tax: 18, amount: 1062, terms_conditions: [] }
    ];

    const mergedTerms = [...terms];
    mockItems.forEach(item => {
        if (item.terms_conditions && item.terms_conditions.length > 0) {
            item.terms_conditions.forEach(t => {
                if (!mergedTerms.includes(t)) {
                    mergedTerms.push(t);
                }
            });
        }
    });

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
                        {mockItems.map((row, ri) => (
                            <tr key={ri} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '10px 12px', fontSize: '13px', textAlign: 'left', color: '#374151', fontWeight: 400 }}>{row.id}</td>
                                <td style={{ padding: '10px 12px', fontSize: '13px', textAlign: 'left', color: '#374151', fontWeight: 400 }}>{row.desc}</td>
                                <td style={{ padding: '10px 12px', fontSize: '13px', textAlign: 'left', color: '#374151', fontWeight: 400 }}>{row.hsn}</td>
                                <td style={{ padding: '10px 12px', fontSize: '13px', textAlign: 'right', color: '#374151', fontWeight: 400 }}>{row.qty}</td>
                                <td style={{ padding: '10px 12px', fontSize: '13px', textAlign: 'right', color: '#374151', fontWeight: 400 }}>₹{row.rate}</td>
                                <td style={{ padding: '10px 12px', fontSize: '13px', textAlign: 'right', color: '#374151', fontWeight: 400 }}>{row.tax}%</td>
                                <td style={{ padding: '10px 12px', fontSize: '13px', textAlign: 'right', color: '#1e293b', fontWeight: 600 }}>₹{row.amount}</td>
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
            {settings.showTerms && mergedTerms.length > 0 && (
                <div style={{ margin: '0 30px', padding: '16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '24px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', marginBottom: '8px' }}>Terms & Conditions</div>
                    <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: '#64748b', lineHeight: 1.6 }}>
                        {mergedTerms.map((t, i) => <li key={i} style={{ marginBottom: '3px' }}>{t}</li>)}
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
