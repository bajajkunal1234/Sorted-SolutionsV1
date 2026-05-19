'use client'

import { useState, useEffect } from 'react';
import { X, Building2, Mail, Phone, MapPin, FileText, Loader2, CheckCircle, Upload } from 'lucide-react';
import { printSettingsAPI } from '@/lib/adminAPI';

function CompanyDetailsModal({ onClose, onSaved }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    // Compression State
    const [processingFile, setProcessingFile] = useState(null);
    const [targetField, setTargetField] = useState(null);
    const [originalImage, setOriginalImage] = useState(null);
    const [targetWidth, setTargetWidth] = useState(600);
    const [compressionQuality, setCompressionQuality] = useState(0.8);
    const [outputFormat, setOutputFormat] = useState('image/jpeg');
    const [estimatedSize, setEstimatedSize] = useState(null);

    const [data, setData] = useState({
        id: null,
        company_name: '',
        company_address: '',
        gst_number: '',
        pan: '',
        company_email: '',
        company_phone: '',
        website: '',
        logo_url: null,
        signature_url: null,
        whatsapp_preview_url: null,
    });

    useEffect(() => {
        printSettingsAPI.get()
            .then(ps => {
                if (ps) {
                    setData({
                        id:              ps.id,
                        company_name:    ps.company_name    || '',
                        company_address: ps.company_address || '',
                        gst_number:      ps.gst_number      || '',
                        pan:             ps.pan              || '',
                        company_email:   ps.company_email   || '',
                        company_phone:   ps.company_phone   || '',
                        website:         ps.website         || '',
                        logo_url:        ps.logo_url        || null,
                        signature_url:   ps.signature_url   || null,
                        whatsapp_preview_url: ps.whatsapp_preview_url || null,
                    });
                }
            })
            .catch(err => console.error('CompanyDetailsModal load:', err))
            .finally(() => setLoading(false));
    }, []);

    // Live compression estimation
    useEffect(() => {
        if (!originalImage) return;

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            let w = originalImage.width;
            let h = originalImage.height;
            const targetW = parseInt(targetWidth);
            
            if (targetW && w > targetW) {
                h = (targetW / w) * h;
                w = targetW;
            }
            
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);
            
            canvas.toBlob((blob) => {
                if (blob) {
                    setEstimatedSize(blob.size);
                }
            }, outputFormat, compressionQuality);
        };
        img.src = originalImage.src;
    }, [originalImage, targetWidth, compressionQuality, outputFormat]);

    const handleImageUpload = (e, field) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Reset file input value so same file can be uploaded again if canceled
        e.target.value = '';

        setProcessingFile(file);
        setTargetField(field);
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                setOriginalImage({
                    src: event.target.result,
                    width: img.width,
                    height: img.height,
                    size: file.size
                });
                
                // Set default options based on field
                if (field === 'signature_url') {
                    setOutputFormat('image/png');
                    setTargetWidth(300);
                } else if (field === 'logo_url') {
                    setOutputFormat('image/png');
                    setTargetWidth(400);
                } else {
                    setOutputFormat('image/jpeg');
                    setTargetWidth(800);
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const uploadToServer = async (fileToUpload, field) => {
        try {
            setUploadingLogo(true);
            const fd = new FormData();
            fd.append('file', fileToUpload);
            fd.append('bucket', 'media');
            fd.append('folder', 'branding');
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'Upload failed');
            setData(prev => ({ ...prev, [field]: json.url }));
        } catch (err) {
            alert('Upload failed: ' + err.message);
        } finally {
            setUploadingLogo(false);
            setProcessingFile(null);
            setTargetField(null);
        }
    };

    const triggerCompressedUpload = () => {
        if (!originalImage || !processingFile) return;
        
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            let w = originalImage.width;
            let h = originalImage.height;
            const targetW = parseInt(targetWidth);
            
            if (targetW && w > targetW) {
                h = (targetW / w) * h;
                w = targetW;
            }
            
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);
            
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    alert('Compression failed');
                    return;
                }
                const extension = outputFormat === 'image/png' ? 'png' : 'jpg';
                const fileName = `${targetField}_compressed.${extension}`;
                const compressedFile = new File([blob], fileName, { type: outputFormat });
                
                setOriginalImage(null);
                await uploadToServer(compressedFile, targetField);
            }, outputFormat, compressionQuality);
        };
        img.src = originalImage.src;
    };

    const uploadOriginalFile = async () => {
        if (!processingFile || !targetField) return;
        setOriginalImage(null);
        await uploadToServer(processingFile, targetField);
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await printSettingsAPI.update(data);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
            if (onSaved) onSaved(data);
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
                                    <input type="file" accept="image/*" id="co-logo-upload" style={{ display: 'none' }} onChange={e => handleImageUpload(e, 'logo_url')} disabled={uploadingLogo} />
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

                            {/* Signature */}
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                                    Authorized Signature
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                    <input type="file" accept="image/png" id="co-signature-upload" style={{ display: 'none' }} onChange={e => handleImageUpload(e, 'signature_url')} disabled={uploadingLogo} />
                                    <label htmlFor="co-signature-upload" className="btn btn-secondary" style={{ margin: 0, cursor: uploadingLogo ? 'wait' : 'pointer', padding: '6px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Upload size={14} />
                                        Upload Signature
                                    </label>
                                    {data.signature_url && (
                                        <>
                                            <img src={data.signature_url} alt="Signature" style={{ height: 44, maxWidth: 140, objectFit: 'contain', border: 'none', borderRadius: 0, backgroundColor: 'transparent', padding: 4 }} />
                                            <button onClick={() => setData(p => ({ ...p, signature_url: null }))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Remove</button>
                                        </>
                                    )}
                                </div>
                                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>PNG with transparent background required (e.g. for {data.company_name || 'your company'})</p>
                            </div>

                            {/* WhatsApp & Social Preview Image */}
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                                    WhatsApp &amp; Social Preview Image
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                    <input type="file" accept="image/*" id="co-whatsapp-upload" style={{ display: 'none' }} onChange={e => handleImageUpload(e, 'whatsapp_preview_url')} disabled={uploadingLogo} />
                                    <label htmlFor="co-whatsapp-upload" className="btn btn-secondary" style={{ margin: 0, cursor: uploadingLogo ? 'wait' : 'pointer', padding: '6px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Upload size={14} />
                                        {uploadingLogo ? 'Uploading...' : 'Upload Preview Image'}
                                    </label>
                                    {data.whatsapp_preview_url && (
                                        <>
                                            <img src={data.whatsapp_preview_url} alt="WhatsApp Preview" style={{ height: 44, maxWidth: 140, objectFit: 'contain', border: '1px solid var(--border-primary)', borderRadius: 6, backgroundColor: '#fff', padding: 4 }} />
                                            <button onClick={() => setData(p => ({ ...p, whatsapp_preview_url: null }))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Remove</button>
                                        </>
                                    )}
                                </div>
                                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>This image is shown as the link preview when sharing tracking pages on WhatsApp or social media.</p>
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

            {/* Image processing sub-modal overlay */}
            {originalImage && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 10000,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 'var(--spacing-lg)',
                    overflowY: 'auto'
                }}>
                    <div style={{ maxWidth: 440, margin: 'auto', width: '100%', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)', padding: 'var(--spacing-lg)', boxShadow: 'var(--shadow-2xl)' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                            Image Processing Options
                        </h3>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
                            Configure dimensions and compression settings before uploading.
                        </p>
                        
                        {/* Preview and original specs */}
                        <div style={{ display: 'flex', gap: 12, marginBottom: 20, padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', alignItems: 'center' }}>
                            <img src={originalImage.src} alt="Source" style={{ width: 64, height: 64, objectFit: 'contain', background: '#fff', border: '1px solid var(--border-primary)', borderRadius: 6 }} />
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>Original Details</div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Size: {formatBytes(originalImage.size)}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Resolution: {originalImage.width} × {originalImage.height} px</div>
                            </div>
                        </div>
                        
                        {/* Form controls */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Target Width */}
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                    Resize Target Width
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                                    {[300, 600, 1200, 0].map(w => (
                                        <button
                                            key={w}
                                            type="button"
                                            className={`btn ${targetWidth === w ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => setTargetWidth(w)}
                                            style={{ padding: '6px 0', fontSize: 11, fontWeight: 500 }}
                                        >
                                            {w === 0 ? 'Original' : `${w}px`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {/* File Format */}
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                    Output Format
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                    {[
                                        { name: 'JPEG (Compressed)', val: 'image/jpeg' },
                                        { name: 'PNG (Transparent)', val: 'image/png' }
                                    ].map(f => (
                                        <button
                                            key={f.val}
                                            type="button"
                                            className={`btn ${outputFormat === f.val ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => setOutputFormat(f.val)}
                                            style={{ padding: '6px 0', fontSize: 11, fontWeight: 500 }}
                                        >
                                            {f.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Compression Quality */}
                            {outputFormat === 'image/jpeg' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContext: 'space-between', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                        <span>Compression Quality: <strong style={{ color: 'var(--color-primary)' }}>{Math.round(compressionQuality * 100)}%</strong></span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="1.0"
                                        step="0.05"
                                        value={compressionQuality}
                                        onChange={e => setCompressionQuality(parseFloat(e.target.value))}
                                        style={{ width: '100%', cursor: 'pointer' }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
                                        <span>Max Compression</span>
                                        <span>No Compression</span>
                                    </div>
                                </div>
                            )}
                            
                            {/* Live Stats */}
                            <div style={{ borderTop: '1px dashed var(--border-primary)', paddingTop: 12, marginTop: 4 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Estimated Size:</span>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: estimatedSize && estimatedSize < originalImage.size ? '#22c55e' : 'var(--text-primary)' }}>
                                        {estimatedSize ? formatBytes(estimatedSize) : 'Calculating...'}
                                        {estimatedSize && estimatedSize < originalImage.size && (
                                            <span style={{ fontSize: 10, fontWeight: 500, color: '#22c55e', marginLeft: 6 }}>
                                                (-{Math.round((1 - (estimatedSize / originalImage.size)) * 100)}%)
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => {
                                    setOriginalImage(null);
                                    setProcessingFile(null);
                                    setTargetField(null);
                                }}
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={uploadOriginalFile}
                                style={{ flex: 1 }}
                            >
                                Skip
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={triggerCompressedUpload}
                                style={{ flex: 1.5 }}
                            >
                                Compress &amp; Upload
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CompanyDetailsModal;
