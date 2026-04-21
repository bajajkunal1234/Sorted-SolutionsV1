'use client'

import { useState, useEffect } from 'react';
import { Upload, Edit2, Trash2, Plus, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import QRCodeUploader from './QRCodeUploader';

function QRCodeManager() {
    const [paymentQRs, setPaymentQRs] = useState([]);
    const [feedbackQRs, setFeedbackQRs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showUploader, setShowUploader] = useState(false);
    const [uploaderType, setUploaderType] = useState('payment');
    const [editingQR, setEditingQR] = useState(null);

    useEffect(() => {
        fetchQRCodes();
    }, []);

    const fetchQRCodes = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/qrcodes');
            const data = await res.json();
            if (data.success) {
                setPaymentQRs(data.data.filter(qr => qr.type === 'payment'));
                setFeedbackQRs(data.data.filter(qr => qr.type === 'feedback'));
            }
        } catch (err) {
            console.error('Failed to fetch QR codes:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveQR = async (qrData) => {
        try {
            const method = qrData.id ? 'PUT' : 'POST';
            const payload = { ...qrData };
            
            // Map camelCase to snake_case for DB
            const dbPayload = {
                id: payload.id,
                name: payload.name,
                type: payload.type,
                category: payload.category,
                image_url: payload.imageUrl,
                target_url: payload.targetUrl,
                assigned_to: payload.assignedTo,
                priority: payload.priority,
                is_active: payload.isActive
            };

            if (!dbPayload.id) delete dbPayload.id;

            const res = await fetch('/api/admin/qrcodes', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dbPayload)
            });
            const data = await res.json();
            if (data.success) {
                fetchQRCodes();
                setShowUploader(false);
                setEditingQR(null);
            } else {
                alert('Save failed: ' + data.error);
            }
        } catch (err) {
            alert('Failed to save QR code');
        }
    };

    const handleEditQR = (qr) => {
        // map db to UI
        const uiQR = {
            ...qr,
            imageUrl: qr.image_url,
            targetUrl: qr.target_url,
            assignedTo: qr.assigned_to,
            isActive: qr.is_active
        };
        setEditingQR(uiQR);
        setUploaderType(qr.type);
        setShowUploader(true);
    };

    const handleDeleteQR = async (id, type) => {
        if (confirm('Are you sure you want to delete this QR code?')) {
            try {
                const res = await fetch(`/api/admin/qrcodes?id=${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    fetchQRCodes();
                } else {
                    alert('Delete failed: ' + data.error);
                }
            } catch (err) {
                alert('Failed to delete');
            }
        }
    };

    const handleToggleActive = async (id, type) => {
        const list = type === 'payment' ? paymentQRs : feedbackQRs;
        const qr = list.find(q => q.id === id);
        if (!qr) return;

        try {
            const res = await fetch('/api/admin/qrcodes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, is_active: !qr.is_active })
            });
            if (res.ok) fetchQRCodes();
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddQR = (type) => {
        setUploaderType(type);
        setEditingQR(null);
        setShowUploader(true);
    };

    if (showUploader) {
        return (
            <QRCodeUploader
                qrCode={editingQR}
                type={uploaderType}
                onSave={handleSaveQR}
                onCancel={() => {
                    setShowUploader(false);
                    setEditingQR(null);
                }}
            />
        );
    }

    const renderQRCard = (qr) => {
        const categoryLabels = {
            company: 'Company Default',
            technician: 'Technician-Specific',
            location: 'Location-Specific',
            google_review: 'Google Review',
            custom_form: 'Custom Feedback Form'
        };

        return (
            <div
                key={qr.id}
                style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${qr.isActive ? '#10b981' : 'var(--border-primary)'}`,
                    display: 'flex',
                    gap: 'var(--spacing-md)',
                    alignItems: 'flex-start'
                }}
            >
                {/* QR Image */}
                <div style={{
                    width: '100px',
                    height: '100px',
                    backgroundColor: qr.image_url ? 'white' : 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px solid var(--border-primary)'
                }}>
                    {qr.image_url ? (
                        <img src={qr.image_url} alt={qr.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                        <Upload size={32} color="var(--text-secondary)" />
                    )}
                </div>

                {/* QR Details */}
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-xs)' }}>
                        <div>
                            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: '4px' }}>
                                {qr.name}
                            </h3>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                {categoryLabels[qr.category]}
                            </div>
                        </div>
                        <button
                            onClick={() => handleToggleActive(qr.id, qr.type)}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: qr.is_active ? '#10b981' : 'var(--text-secondary)',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 600
                            }}
                        >
                            {qr.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                            {qr.is_active ? 'Active' : 'Inactive'}
                        </button>
                    </div>

                    {qr.type === 'payment' && qr.priority && (
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                            Priority: {qr.priority}
                        </div>
                    )}

                    {qr.target_url && (
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)', wordBreak: 'break-all' }}>
                            URL: {qr.target_url}
                        </div>
                    )}

                    {qr.assigned_to && (
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                            Assigned to: {qr.assigned_to}
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-sm)' }}>
                        <button
                            onClick={() => handleEditQR(qr)}
                            className="btn btn-secondary"
                            style={{
                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                fontSize: 'var(--font-size-sm)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-xs)'
                            }}
                        >
                            <Edit2 size={14} />
                            Edit
                        </button>
                        <button
                            onClick={() => handleDeleteQR(qr.id, qr.type)}
                            className="btn"
                            style={{
                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                fontSize: 'var(--font-size-sm)',
                                backgroundColor: '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-xs)'
                            }}
                        >
                            <Trash2 size={14} />
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{ padding: 'var(--spacing-lg)' }}>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>
                QR Code Management
            </h2>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                    <Loader2 size={32} className="spin" style={{ margin: '0 auto', color: 'var(--text-tertiary)' }} />
                </div>
            ) : (
                <>
                    {/* Payment QR Codes */}
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>Payment QR Codes</h3>
                    <button
                        onClick={() => handleAddQR('payment')}
                        className="btn btn-primary"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-xs)',
                            backgroundColor: '#8b5cf6'
                        }}
                    >
                        <Plus size={16} />
                        Add Payment QR
                    </button>
                </div>
                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    {paymentQRs.map(qr => renderQRCard(qr))}
                </div>
            </div>

            {/* Feedback QR Codes */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>Feedback QR Codes</h3>
                    <button
                        onClick={() => handleAddQR('feedback')}
                        className="btn btn-primary"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-xs)',
                            backgroundColor: '#10b981'
                        }}
                    >
                        <Plus size={16} />
                        Add Feedback QR
                    </button>
                </div>
                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    {feedbackQRs.map(qr => renderQRCard(qr))}
                </div>
            </div>
            </>
            )}
        </div>
    );
}

export default QRCodeManager;
