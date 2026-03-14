'use client'

import { useState, useEffect } from 'react';
import { Printer, Save, Eye, Upload, X, Plus, Trash2 } from 'lucide-react';
import { printSettingsAPI } from '@/lib/adminAPI';

function PrintSetup() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [settingsId, setSettingsId] = useState(null);
    const [settings, setSettings] = useState({
        companyName: 'AC Repair Services',
        companyAddress: 'Shop No. 5, Malad West, Mumbai - 400064',
        companyPhone: '+91 98765 43210',
        companyEmail: 'info@acrepair.com',
        gstNumber: '27AABCU9603R1ZM',
        logoUrl: null,
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
            showIGST: true,
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
                setSettingsId(data.id);
                setSettings({
                    companyName: data.company_name || '',
                    companyAddress: data.company_address || '',
                    companyPhone: data.company_phone || '',
                    companyEmail: data.company_email || '',
                    gstNumber: data.gst_number || '',
                    logoUrl: data.logo_url || null,
                    showLogo: data.show_logo ?? true,
                    showGST: data.show_gst ?? true,
                    showTerms: data.show_terms ?? true,
                    paperSize: data.paper_size || 'A4',
                    fontSize: data.font_size || 'medium',
                    includeSignature: data.include_signature ?? true,
                    templateStyle: data.template_style || 'modern-boxes',
                    gstBreakdown: data.gst_breakdown || {
                        showCGST: true, showSGST: true, showIGST: true, cgstRate: 9, sgstRate: 9, igstRate: 18
                    }
                });
                setInvoiceTerms(data.invoice_terms || []);
                setQuotationTerms(data.quotation_terms || []);
                setRentalTerms(data.rental_terms || []);
                setAmcTerms(data.amc_terms || []);
            }
        } catch (error) {
            console.error('Failed to load print settings:', error);
            alert('Failed to load print settings');
        } finally {
            setIsLoading(false);
        }
    };

    const [showPreview, setShowPreview] = useState(false);
    const [previewType, setPreviewType] = useState('invoice'); // invoice or quotation

    const templateStyles = [
        {
            id: 'modern-boxes',
            name: 'Modern Boxes',
            description: 'Clean boxed layout with logo placement',
            preview: 'Box-based design with header logo'
        },
        {
            id: 'classic-lines',
            name: 'Classic Lines',
            description: 'Traditional line separators',
            preview: 'Line-separated sections'
        },
        {
            id: 'minimal-clean',
            name: 'Minimal Clean',
            description: 'Minimalist design with subtle borders',
            preview: 'Clean minimal layout'
        },
        {
            id: 'professional-grid',
            name: 'Professional Grid',
            description: 'Grid-based structured layout',
            preview: 'Structured grid design'
        }
    ];

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSettings({ ...settings, logoUrl: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const payload = {
                company_name: settings.companyName,
                company_address: settings.companyAddress,
                company_phone: settings.companyPhone,
                company_email: settings.companyEmail,
                gst_number: settings.gstNumber,
                logo_url: settings.logoUrl,
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

            if (settingsId) payload.id = settingsId;

            const saved = await printSettingsAPI.update(payload);
            setSettingsId(saved.id);
            alert('Print settings saved successfully!');
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Failed to save settings: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const addInvoiceTerm = () => {
        setInvoiceTerms([...invoiceTerms, 'New term']);
    };

    const updateInvoiceTerm = (index, value) => {
        const updated = [...invoiceTerms];
        updated[index] = value;
        setInvoiceTerms(updated);
    };

    const deleteInvoiceTerm = (index) => {
        setInvoiceTerms(invoiceTerms.filter((_, i) => i !== index));
    };

    const addQuotationTerm = () => {
        setQuotationTerms([...quotationTerms, 'New term']);
    };

    const updateQuotationTerm = (index, value) => {
        const updated = [...quotationTerms];
        updated[index] = value;
        setQuotationTerms(updated);
    };

    const deleteQuotationTerm = (index) => {
        setQuotationTerms(quotationTerms.filter((_, i) => i !== index));
    };

    const addRentalTerm = () => {
        setRentalTerms([...rentalTerms, 'New rental term']);
    };

    const updateRentalTerm = (index, value) => {
        const updated = [...rentalTerms];
        updated[index] = value;
        setRentalTerms(updated);
    };

    const deleteRentalTerm = (index) => {
        setRentalTerms(rentalTerms.filter((_, i) => i !== index));
    };

    const addAmcTerm = () => {
        setAmcTerms([...amcTerms, 'New AMC term']);
    };

    const updateAmcTerm = (index, value) => {
        const updated = [...amcTerms];
        updated[index] = value;
        setAmcTerms(updated);
    };

    const deleteAmcTerm = (index) => {
        setAmcTerms(amcTerms.filter((_, i) => i !== index));
    };

    if (isLoading) {
        return <div style={{ padding: '20px' }}>Loading settings...</div>;
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, marginBottom: '4px' }}>
                        Print Setup
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                        Customize invoice and quotation print templates
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            setPreviewType('invoice');
                            setShowPreview(true);
                        }}
                        style={{ padding: '8px 16px' }}
                    >
                        <Eye size={16} />
                        Preview Invoice
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            setPreviewType('quotation');
                            setShowPreview(true);
                        }}
                        style={{ padding: '8px 16px' }}
                    >
                        <Eye size={16} />
                        Preview Quotation
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', opacity: isSaving ? 0.7 : 1 }}
                    >
                        <Save size={16} />
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>

            {/* Settings */}
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                    {/* Left Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                        {/* Company Information */}
                        <div style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--spacing-lg)'
                        }}>
                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                                Company Information
                            </h4>
                            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                {/* Logo Upload */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                        Company Logo
                                    </label>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoUpload}
                                            style={{ display: 'none' }}
                                            id="logo-upload"
                                        />
                                        <label
                                            htmlFor="logo-upload"
                                            className="btn btn-secondary"
                                            style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)', cursor: 'pointer', margin: 0 }}
                                        >
                                            <Upload size={14} />
                                            Upload Logo
                                        </label>
                                        {settings.logoUrl && (
                                            <>
                                                <img
                                                    src={settings.logoUrl}
                                                    alt="Logo"
                                                    style={{ height: '40px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)' }}
                                                />
                                                <button
                                                    onClick={() => setSettings({ ...settings, logoUrl: null })}
                                                    style={{
                                                        padding: '4px',
                                                        border: 'none',
                                                        background: 'none',
                                                        color: 'var(--color-danger)',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                        Company Name
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.companyName}
                                        onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                                        className="form-input"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                        Address
                                    </label>
                                    <textarea
                                        value={settings.companyAddress}
                                        onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                                        className="form-input"
                                        style={{ width: '100%', minHeight: '60px' }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                            Phone
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.companyPhone}
                                            onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                                            className="form-input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={settings.companyEmail}
                                            onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                                            className="form-input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                        GST Number
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.gstNumber}
                                        onChange={(e) => setSettings({ ...settings, gstNumber: e.target.value })}
                                        className="form-input"
                                        style={{ width: '100%', fontFamily: 'monospace' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* GST Breakdown Settings */}
                        <div style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--spacing-lg)'
                        }}>
                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                                GST Breakdown Settings
                            </h4>
                            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={settings.gstBreakdown.showCGST}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                gstBreakdown: { ...settings.gstBreakdown, showCGST: e.target.checked }
                                            })}
                                            style={{ width: '16px', height: '16px' }}
                                        />
                                        <span style={{ fontSize: 'var(--font-size-sm)' }}>Show CGST (Central GST)</span>
                                    </label>
                                    {settings.gstBreakdown.showCGST && (
                                        <input
                                            type="number"
                                            value={settings.gstBreakdown.cgstRate}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                gstBreakdown: { ...settings.gstBreakdown, cgstRate: parseFloat(e.target.value) }
                                            })}
                                            className="form-input"
                                            style={{ width: '100px', marginLeft: '24px' }}
                                            placeholder="Rate %"
                                        />
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={settings.gstBreakdown.showSGST}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                gstBreakdown: { ...settings.gstBreakdown, showSGST: e.target.checked }
                                            })}
                                            style={{ width: '16px', height: '16px' }}
                                        />
                                        <span style={{ fontSize: 'var(--font-size-sm)' }}>Show SGST (State GST)</span>
                                    </label>
                                    {settings.gstBreakdown.showSGST && (
                                        <input
                                            type="number"
                                            value={settings.gstBreakdown.sgstRate}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                gstBreakdown: { ...settings.gstBreakdown, sgstRate: parseFloat(e.target.value) }
                                            })}
                                            className="form-input"
                                            style={{ width: '100px', marginLeft: '24px' }}
                                            placeholder="Rate %"
                                        />
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={settings.gstBreakdown.showIGST}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                gstBreakdown: { ...settings.gstBreakdown, showIGST: e.target.checked }
                                            })}
                                            style={{ width: '16px', height: '16px' }}
                                        />
                                        <span style={{ fontSize: 'var(--font-size-sm)' }}>Show IGST (Integrated GST)</span>
                                    </label>
                                    {settings.gstBreakdown.showIGST && (
                                        <input
                                            type="number"
                                            value={settings.gstBreakdown.igstRate}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                gstBreakdown: { ...settings.gstBreakdown, igstRate: parseFloat(e.target.value) }
                                            })}
                                            className="form-input"
                                            style={{ width: '100px', marginLeft: '24px' }}
                                            placeholder="Rate %"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Print Options */}
                        <div style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--spacing-lg)'
                        }}>
                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                                Print Options
                            </h4>
                            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                            Paper Size
                                        </label>
                                        <select
                                            value={settings.paperSize}
                                            onChange={(e) => setSettings({ ...settings, paperSize: e.target.value })}
                                            className="form-input"
                                            style={{ width: '100%' }}
                                        >
                                            <option value="A4">A4</option>
                                            <option value="A5">A5</option>
                                            <option value="Letter">Letter</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                            Font Size
                                        </label>
                                        <select
                                            value={settings.fontSize}
                                            onChange={(e) => setSettings({ ...settings, fontSize: e.target.value })}
                                            className="form-input"
                                            style={{ width: '100%' }}
                                        >
                                            <option value="small">Small</option>
                                            <option value="medium">Medium</option>
                                            <option value="large">Large</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={settings.showLogo}
                                            onChange={(e) => setSettings({ ...settings, showLogo: e.target.checked })}
                                            style={{ width: '16px', height: '16px' }}
                                        />
                                        <span style={{ fontSize: 'var(--font-size-sm)' }}>Show company logo</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={settings.includeSignature}
                                            onChange={(e) => setSettings({ ...settings, includeSignature: e.target.checked })}
                                            style={{ width: '16px', height: '16px' }}
                                        />
                                        <span style={{ fontSize: 'var(--font-size-sm)' }}>Include signature space</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                        {/* Template Styles */}
                        <div style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--spacing-lg)'
                        }}>
                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                                Template Styles
                            </h4>
                            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                {templateStyles.map(template => (
                                    <div
                                        key={template.id}
                                        onClick={() => setSettings({ ...settings, templateStyle: template.id })}
                                        style={{
                                            padding: 'var(--spacing-md)',
                                            backgroundColor: settings.templateStyle === template.id ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
                                            border: `2px solid ${settings.templateStyle === template.id ? 'var(--color-primary)' : 'var(--border-primary)'}`,
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer',
                                            transition: 'all var(--transition-fast)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--spacing-sm)'
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            checked={settings.templateStyle === template.id}
                                            onChange={() => setSettings({ ...settings, templateStyle: template.id })}
                                            style={{ width: '16px', height: '16px' }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                                {template.name}
                                            </div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                                {template.description}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Invoice Terms & Conditions */}
                        <div style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--spacing-lg)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                    Invoice Terms & Conditions
                                </h4>
                                <button
                                    className="btn btn-secondary"
                                    onClick={addInvoiceTerm}
                                    style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)' }}
                                >
                                    <Plus size={14} />
                                    Add Term
                                </button>
                            </div>
                            <div style={{ display: 'grid', gap: 'var(--spacing-sm)', maxHeight: '200px', overflow: 'auto' }}>
                                {invoiceTerms.map((term, index) => (
                                    <div key={index} style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            value={term}
                                            onChange={(e) => updateInvoiceTerm(index, e.target.value)}
                                            className="form-input"
                                            style={{ flex: 1, fontSize: 'var(--font-size-xs)', padding: '6px' }}
                                        />
                                        <button
                                            onClick={() => deleteInvoiceTerm(index)}
                                            style={{
                                                padding: '4px',
                                                border: 'none',
                                                background: 'none',
                                                color: 'var(--color-danger)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quotation Terms & Conditions */}
                        <div style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--spacing-lg)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                    Quotation Terms & Conditions
                                </h4>
                                <button
                                    className="btn btn-secondary"
                                    onClick={addQuotationTerm}
                                    style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)' }}
                                >
                                    <Plus size={14} />
                                    Add Term
                                </button>
                            </div>
                            <div style={{ display: 'grid', gap: 'var(--spacing-sm)', maxHeight: '200px', overflow: 'auto' }}>
                                {quotationTerms.map((term, index) => (
                                    <div key={index} style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            value={term}
                                            onChange={(e) => updateQuotationTerm(index, e.target.value)}
                                            className="form-input"
                                            style={{ flex: 1, fontSize: 'var(--font-size-xs)', padding: '6px' }}
                                        />
                                        <button
                                            onClick={() => deleteQuotationTerm(index)}
                                            style={{
                                                padding: '4px',
                                                border: 'none',
                                                background: 'none',
                                                color: 'var(--color-danger)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Rental Agreement Terms */}
                        <div style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--spacing-lg)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                    Rental Agreement Terms
                                </h4>
                                <button
                                    className="btn btn-secondary"
                                    onClick={addRentalTerm}
                                    style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)' }}
                                >
                                    <Plus size={14} />
                                    Add Term
                                </button>
                            </div>
                            <div style={{ display: 'grid', gap: 'var(--spacing-sm)', maxHeight: '200px', overflow: 'auto' }}>
                                {rentalTerms.map((term, index) => (
                                    <div key={index} style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            value={term}
                                            onChange={(e) => updateRentalTerm(index, e.target.value)}
                                            className="form-input"
                                            style={{ flex: 1, fontSize: 'var(--font-size-xs)', padding: '6px' }}
                                        />
                                        <button
                                            onClick={() => deleteRentalTerm(index)}
                                            style={{
                                                padding: '4px',
                                                border: 'none',
                                                background: 'none',
                                                color: 'var(--color-danger)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* AMC Agreement Terms */}
                        <div style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--spacing-lg)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                    AMC Agreement Terms
                                </h4>
                                <button
                                    className="btn btn-secondary"
                                    onClick={addAmcTerm}
                                    style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)' }}
                                >
                                    <Plus size={14} />
                                    Add Term
                                </button>
                            </div>
                            <div style={{ display: 'grid', gap: 'var(--spacing-sm)', maxHeight: '200px', overflow: 'auto' }}>
                                {amcTerms.map((term, index) => (
                                    <div key={index} style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            value={term}
                                            onChange={(e) => updateAmcTerm(index, e.target.value)}
                                            className="form-input"
                                            style={{ flex: 1, fontSize: 'var(--font-size-xs)', padding: '6px' }}
                                        />
                                        <button
                                            onClick={() => deleteAmcTerm(index)}
                                            style={{
                                                padding: '4px',
                                                border: 'none',
                                                background: 'none',
                                                color: 'var(--color-danger)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {showPreview && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: 'var(--spacing-md)'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 'var(--radius-lg)',
                        maxWidth: '900px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: 'var(--spacing-md)',
                            backgroundColor: '#1e293b',
                            color: '#ffffff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderTopLeftRadius: 'var(--radius-lg)',
                            borderTopRightRadius: 'var(--radius-lg)'
                        }}>
                            <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>
                                {previewType === 'invoice' ? 'Invoice' : 'Quotation'} Preview - {settings.templateStyle}
                            </h3>
                            <button
                                onClick={() => setShowPreview(false)}
                                style={{
                                    padding: '6px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    color: '#ffffff',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Preview Content */}
                        <div style={{
                            padding: '40px',
                            backgroundColor: '#ffffff',
                            color: '#000000',
                            fontFamily: 'Arial, sans-serif',
                            fontSize: settings.fontSize === 'small' ? '12px' : settings.fontSize === 'large' ? '16px' : '14px'
                        }}>
                            {/* Header with Logo */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: '30px',
                                paddingBottom: '20px',
                                borderBottom: settings.templateStyle === 'modern-boxes' ? '3px solid #1e293b' :
                                    settings.templateStyle === 'classic-lines' ? '2px solid #64748b' :
                                        settings.templateStyle === 'minimal-clean' ? '1px solid #e2e8f0' : '2px double #1e293b'
                            }}>
                                <div>
                                    {settings.showLogo && settings.logoUrl && (
                                        <img
                                            src={settings.logoUrl}
                                            alt="Company Logo"
                                            style={{ height: '60px', marginBottom: '10px' }}
                                        />
                                    )}
                                    <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b', fontWeight: 700 }}>
                                        {settings.companyName}
                                    </h1>
                                    <p style={{ margin: '5px 0', fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                                        {settings.companyAddress}
                                    </p>
                                    <p style={{ margin: '5px 0', fontSize: '12px', color: '#64748b' }}>
                                        Phone: {settings.companyPhone} | Email: {settings.companyEmail}
                                    </p>
                                    {settings.showGST && (
                                        <p style={{ margin: '5px 0', fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                                            GST: {settings.gstNumber}
                                        </p>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <h2 style={{ margin: 0, fontSize: '28px', color: '#1e293b', fontWeight: 700 }}>
                                        {previewType === 'invoice' ? 'INVOICE' : 'QUOTATION'}
                                    </h2>
                                    <p style={{ margin: '5px 0', fontSize: '12px', color: '#64748b' }}>
                                        #{previewType === 'invoice' ? 'INV' : 'QUO'}-2026-001
                                    </p>
                                    <p style={{ margin: '5px 0', fontSize: '12px', color: '#64748b' }}>
                                        Date: {new Date().toLocaleDateString('en-IN')}
                                    </p>
                                </div>
                            </div>

                            {/* Customer Details */}
                            <div style={{
                                marginBottom: '30px',
                                padding: settings.templateStyle === 'modern-boxes' ? '15px' : '0',
                                backgroundColor: settings.templateStyle === 'modern-boxes' ? '#f8fafc' : 'transparent',
                                border: settings.templateStyle === 'modern-boxes' ? '1px solid #e2e8f0' : 'none',
                                borderRadius: settings.templateStyle === 'modern-boxes' ? '8px' : '0'
                            }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: '#1e293b' }}>
                                    Bill To:
                                </h3>
                                <p style={{ margin: '3px 0', fontSize: '13px', fontWeight: 600 }}>Sample Customer Name</p>
                                <p style={{ margin: '3px 0', fontSize: '12px', color: '#64748b' }}>123 Customer Street, Mumbai - 400001</p>
                                <p style={{ margin: '3px 0', fontSize: '12px', color: '#64748b' }}>Phone: +91 98765 12345</p>
                            </div>

                            {/* Items Table */}
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                marginBottom: '20px',
                                border: settings.templateStyle === 'modern-boxes' ? '1px solid #e2e8f0' : 'none'
                            }}>
                                <thead>
                                    <tr style={{
                                        backgroundColor: settings.templateStyle === 'modern-boxes' ? '#1e293b' :
                                            settings.templateStyle === 'professional-grid' ? '#f1f5f9' : '#f8fafc',
                                        color: settings.templateStyle === 'modern-boxes' ? '#ffffff' : '#1e293b'
                                    }}>
                                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>Item</th>
                                        <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #cbd5e1' }}>Qty</th>
                                        <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #cbd5e1' }}>Rate</th>
                                        <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #cbd5e1' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0' }}>AC Service - Split Unit</td>
                                        <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>1</td>
                                        <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>₹1,500</td>
                                        <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>₹1,500</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0' }}>Gas Refilling - R32</td>
                                        <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>1</td>
                                        <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>₹2,500</td>
                                        <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>₹2,500</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0' }}>Spare Parts</td>
                                        <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>3</td>
                                        <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>₹500</td>
                                        <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>₹1,500</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Totals Section */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px' }}>
                                <div style={{ minWidth: '300px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                                        <span style={{ fontSize: '13px' }}>Subtotal:</span>
                                        <span style={{ fontSize: '13px', fontWeight: 600 }}>₹5,500</span>
                                    </div>

                                    {/* GST Breakdown */}
                                    {settings.showGST && (
                                        <>
                                            {settings.gstBreakdown.showCGST && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                                                    <span style={{ fontSize: '13px' }}>CGST ({settings.gstBreakdown.cgstRate}%):</span>
                                                    <span style={{ fontSize: '13px', fontWeight: 600 }}>₹{(5500 * settings.gstBreakdown.cgstRate / 100).toFixed(2)}</span>
                                                </div>
                                            )}
                                            {settings.gstBreakdown.showSGST && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                                                    <span style={{ fontSize: '13px' }}>SGST ({settings.gstBreakdown.sgstRate}%):</span>
                                                    <span style={{ fontSize: '13px', fontWeight: 600 }}>₹{(5500 * settings.gstBreakdown.sgstRate / 100).toFixed(2)}</span>
                                                </div>
                                            )}
                                            {settings.gstBreakdown.showIGST && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                                                    <span style={{ fontSize: '13px' }}>IGST ({settings.gstBreakdown.igstRate}%):</span>
                                                    <span style={{ fontSize: '13px', fontWeight: 600 }}>₹{(5500 * settings.gstBreakdown.igstRate / 100).toFixed(2)}</span>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: '12px 0',
                                        borderTop: '2px solid #1e293b',
                                        marginTop: '8px'
                                    }}>
                                        <span style={{ fontSize: '16px', fontWeight: 700 }}>Total:</span>
                                        <span style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>
                                            ₹{(5500 * 1.18).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Terms & Conditions */}
                            {settings.showTerms && (
                                <div style={{
                                    marginTop: '30px',
                                    padding: '15px',
                                    backgroundColor: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px'
                                }}>
                                    <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: '#1e293b' }}>
                                        Terms & Conditions:
                                    </h4>
                                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '11px', color: '#64748b', lineHeight: 1.6 }}>
                                        {(previewType === 'invoice' ? invoiceTerms : quotationTerms).map((term, index) => (
                                            <li key={index} style={{ marginBottom: '4px' }}>{term}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Signature Section */}
                            {settings.includeSignature && (
                                <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between' }}>
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '40px' }}>Customer Signature</p>
                                        <div style={{ borderTop: '1px solid #cbd5e1', width: '200px' }}></div>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '40px' }}>Authorized Signatory</p>
                                        <div style={{ borderTop: '1px solid #cbd5e1', width: '200px' }}></div>
                                        <p style={{ fontSize: '11px', color: '#64748b', marginTop: '5px', textAlign: 'center' }}>
                                            For {settings.companyName}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Footer */}
                            <div style={{
                                marginTop: '40px',
                                paddingTop: '20px',
                                borderTop: '2px solid #e2e8f0',
                                textAlign: 'center',
                                fontSize: '11px',
                                color: '#94a3b8'
                            }}>
                                <p style={{ margin: '3px 0' }}>This is a computer-generated document</p>
                                <p style={{ margin: '3px 0' }}>{settings.companyName} | {settings.companyPhone} | {settings.companyEmail}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PrintSetup;

