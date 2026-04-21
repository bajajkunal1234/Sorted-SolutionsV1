'use client'

import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';

function QRCodeUploader({ qrCode, type, onSave, onCancel }) {
    const [name, setName] = useState(qrCode?.name || '');
    const [category, setCategory] = useState(qrCode?.category || (type === 'payment' ? 'company' : 'google_review'));
    const [imageUrl, setImageUrl] = useState(qrCode?.imageUrl || null);
    const [assignedTo, setAssignedTo] = useState(qrCode?.assignedTo || '');
    const [targetUrl, setTargetUrl] = useState(qrCode?.targetUrl || '');
    const [priority, setPriority] = useState(qrCode?.priority || 1);
    const fileInputRef = useRef(null);

    const paymentCategories = [
        { value: 'company', label: 'Company Default' },
        { value: 'technician', label: 'Technician-Specific' },
        { value: 'location', label: 'Location-Specific' }
    ];

    const feedbackCategories = [
        { value: 'google_review', label: 'Google Review' },
        { value: 'custom_form', label: 'Custom Feedback Form' }
    ];

    const categories = type === 'payment' ? paymentCategories : feedbackCategories;

    const [isUploading, setIsUploading] = useState(false);

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (file) {
            setIsUploading(true);
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('category', 'qrcodes');
                
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                
                if (data.success) {
                    setImageUrl(data.url);
                } else {
                    alert('Upload failed: ' + data.error);
                }
            } catch (err) {
                alert('An error occurred during upload.');
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleSave = () => {
        if (!name.trim()) {
            alert('Please enter a QR code name');
            return;
        }
        if (!imageUrl) {
            alert('Please upload a QR code image');
            return;
        }
        if (type === 'feedback' && !targetUrl.trim()) {
            alert('Please enter a target URL');
            return;
        }

        const qrData = {
            ...qrCode,
            name,
            type,
            category,
            imageUrl,
            assignedTo: assignedTo || null,
            targetUrl: type === 'feedback' ? targetUrl : null,
            priority: type === 'payment' ? priority : null,
            isActive: qrCode?.isActive !== undefined ? qrCode.isActive : true
        };

        onSave(qrData);
    };

    return (
        <div style={{ padding: 'var(--spacing-lg)', maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>
                {qrCode ? 'Edit QR Code' : `Add ${type === 'payment' ? 'Payment' : 'Feedback'} QR Code`}
            </h2>

            {/* QR Code Name */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                    QR Code Name *
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Company Payment QR"
                    className="form-input"
                    style={{ width: '100%' }}
                />
            </div>

            {/* Category */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                    Category *
                </label>
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="form-input"
                    style={{ width: '100%' }}
                >
                    {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                </select>
            </div>

            {/* QR Code Image Upload */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                    QR Code Image *
                </label>

                {!imageUrl ? (
                    <div
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                        style={{
                            border: '2px dashed var(--border-primary)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--spacing-xl)',
                            textAlign: 'center',
                            backgroundColor: 'var(--bg-secondary)',
                            cursor: isUploading ? 'not-allowed' : 'pointer',
                            opacity: isUploading ? 0.7 : 1
                        }}
                    >
                        {isUploading ? (
                            <div style={{ color: 'var(--text-secondary)' }}>Uploading image...</div>
                        ) : (
                            <>
                                <Upload size={48} color="var(--text-secondary)" style={{ margin: '0 auto var(--spacing-sm)' }} />
                                <div style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-primary)', marginBottom: 'var(--spacing-xs)' }}>
                                    Click to upload QR code image
                                </div>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    PNG, JPG up to 5MB
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <div style={{
                            width: '250px',
                            height: '250px',
                            backgroundColor: 'white',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--spacing-md)',
                            border: '1px solid var(--border-primary)'
                        }}>
                            <img src={imageUrl} alt="QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                        <button
                            onClick={() => setImageUrl(null)}
                            className="btn"
                            style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                padding: '4px 8px',
                                backgroundColor: '#ef4444',
                                minWidth: 'auto'
                            }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                />
            </div>

            {/* Payment-specific fields */}
            {type === 'payment' && (
                <>
                    {/* Priority */}
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Priority (1 = Highest)
                        </label>
                        <input
                            type="number"
                            value={priority}
                            onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
                            className="form-input"
                            style={{ width: '100%' }}
                            min="1"
                            max="10"
                        />
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Lower number = higher priority. Used to determine which QR to display.
                        </div>
                    </div>

                    {/* Assigned To (for technician/location specific) */}
                    {(category === 'technician' || category === 'location') && (
                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Assign to {category === 'technician' ? 'Technician' : 'Location'}
                            </label>
                            <input
                                type="text"
                                value={assignedTo}
                                onChange={(e) => setAssignedTo(e.target.value)}
                                placeholder={category === 'technician' ? 'Enter technician ID' : 'Enter location name'}
                                className="form-input"
                                style={{ width: '100%' }}
                            />
                        </div>
                    )}
                </>
            )}

            {/* Feedback-specific fields */}
            {type === 'feedback' && (
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                        Target URL *
                    </label>
                    <input
                        type="url"
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        placeholder="https://g.page/r/... or https://forms.google.com/..."
                        className="form-input"
                        style={{ width: '100%' }}
                    />
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        The URL where this QR code points to
                    </div>
                </div>
            )}

            {/* Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-lg)' }}>
                <button
                    onClick={onCancel}
                    className="btn btn-secondary"
                    style={{ padding: 'var(--spacing-md)', width: '100%' }}
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="btn btn-primary"
                    style={{
                        padding: 'var(--spacing-md)',
                        width: '100%',
                        backgroundColor: type === 'payment' ? '#8b5cf6' : '#10b981'
                    }}
                >
                    Save QR Code
                </button>
            </div>
        </div>
    );
}

export default QRCodeUploader;
