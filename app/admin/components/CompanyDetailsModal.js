'use client'

import { useState, useEffect } from 'react';
import { X, Building2, Mail, Phone, MapPin, FileText, Loader2, CheckCircle, Upload } from 'lucide-react';
import { printSettingsAPI } from '@/lib/adminAPI';

function CompanyDetailsModal({ onClose, onSaved }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [settingsId, setSettingsId] = useState(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    const [data, setData] = useState({
        company_name: '',
        company_address: '',
        gst_number: '',
        pan: '',
        company_email: '',
        company_phone: '',
        website: '',
        logo_url: null,
    });

    useEffect(() => {
        printSettingsAPI.get()
            .then(ps => {
                if (ps) {
                    setSettingsId(ps.id);
                    setData({
                        company_name:    ps.company_name    || '',
                        company_address: ps.company_address || '',
                        gst_number:      ps.gst_number      || '',
                        pan:             ps.pan              || '',
                        company_email:   ps.company_email   || '',
                        company_phone:   ps.company_phone   || '',
                        website:         ps.website         || '',
                        logo_url:        ps.logo_url        || null,
                    });
                }
            })
            .catch(err => console.error('CompanyDetailsModal load:', err))
            .finally(() => setLoading(false));
    }, []);

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            setUploadingLogo(true);
            const fd = new FormData();
            fd.append('file', file);
            fd.append('bucket', 'media');
            fd.append('folder', 'branding');
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'Upload failed');
            setData(prev => ({ ...prev, logo_url: json.url }));
        } catch (err) {
            alert('Logo upload failed: ' + err.message);
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const payload = { ...data };
            if (settingsId) payload.id = settingsId;
            const result = await printSettingsAPI.update(payload);
            setSettingsId(result.id);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
            if (onSaved) onSaved(result);
        } catch (err) {
            alert('Failed to save: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const field = (label, icon, key, type = 'text', extra = {}) => (
        <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
                {icon} {label}
            </label>
            <input
                type={type}
                className="form-input"
                value={data[key]}
                onChange={e => setData(prev => ({ ...prev, [key]: e.target.value }))}
                style={{ width: '100%', ...extra.style }}
                placeholder={extra.placeholder || ''}
                maxLength={extra.maxLength}
            />
        </div>
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">Company Details</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                            Used on all printed invoices, quotations &amp; agreements
                        </p>
                    </div>
                    <button className="btn-icon" onClick={onClose}><X size={20} /></button>
                </div>

                {/* Content */}
                <div className="modal-content" style={{ padding: 'var(--spacing-lg)', overflowY: 'auto', flex: 1 }}>
                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180 }}>
                            <Loader2 size={24} className="animate-spin" color="var(--color-primary)" />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            {/* Logo */}
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                                    Company Logo
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                    <input type="file" accept="image/*" id="co-logo-upload" style={{ display: 'none' }} onChange={handleLogoUpload} disabled={uploadingLogo} />
                                    <label htmlFor="co-logo-upload" className="btn btn-secondary" style={{ margin: 0, cursor: uploadingLogo ? 'wait' : 'pointer', padding: '6px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Upload size={14} />
                                        {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                                    </label>
                                    {data.logo_url && (
                                        <>
                                            <img src={data.logo_url} alt="Logo" style={{ height: 44, maxWidth: 140, objectFit: 'contain', border: '1px solid var(--border-primary)', borderRadius: 6, backgroundColor: '#fff', padding: 4 }} />
                                            <button onClick={() => setData(p => ({ ...p, logo_url: null }))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Remove</button>
                                        </>
                                    )}
                                </div>
                                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>PNG with transparent background recommended</p>
                            </div>

                            {field('Company Name', <Building2 size={14} />, 'company_name', 'text', { placeholder: 'e.g. Sorted Solutions' })}

                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
                                    <MapPin size={14} /> Address
                                </label>
                                <textarea
                                    className="form-input"
                                    value={data.company_address}
                                    onChange={e => setData(p => ({ ...p, company_address: e.target.value }))}
                                    rows={3}
                                    style={{ width: '100%', resize: 'vertical' }}
                                    placeholder="Full business address..."
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                {field('GSTIN', <FileText size={14} />, 'gst_number', 'text', { placeholder: '27AABCU9603R1ZM', maxLength: 15, style: { fontFamily: 'monospace' } })}
                                {field('PAN', <FileText size={14} />, 'pan', 'text', { placeholder: 'AABCU9603R', maxLength: 10, style: { fontFamily: 'monospace' } })}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                {field('Email', <Mail size={14} />, 'company_email', 'email', { placeholder: 'info@company.com' })}
                                {field('Phone', <Phone size={14} />, 'company_phone', 'tel', { placeholder: '+91 98765 43210' })}
                            </div>

                            {field('Website', null, 'website', 'text', { placeholder: 'www.sortedsolutions.in' })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={saving || loading}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        {saved
                            ? <><CheckCircle size={16} /> Saved!</>
                            : saving
                                ? <><Loader2 size={16} className="animate-spin" /> Saving...</>
                                : 'Save Changes'
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CompanyDetailsModal;
