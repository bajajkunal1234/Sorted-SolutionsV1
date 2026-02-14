'use client'

import { useState } from 'react';
import { Upload, Edit2, Trash2, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import QRCodeUploader from './QRCodeUploader';

function QRCodeManager() {
    const [paymentQRs, setPaymentQRs] = useState([
        {
            id: 'qr_001',
            name: 'Company Payment QR',
            type: 'payment',
            category: 'company',
            imageUrl: null,
            assignedTo: null,
            priority: 1,
            isActive: true,
            createdAt: '2026-01-18T10:00:00Z'
        }
    ]);
    const [feedbackQRs, setFeedbackQRs] = useState([
        {
            id: 'qr_002',
            name: 'Google Review QR',
            type: 'feedback',
            category: 'google_review',
            imageUrl: null,
            targetUrl: 'https://g.page/r/...',
            isActive: true,
            createdAt: '2026-01-18T10:00:00Z'
        }
    ]);
    const [showUploader, setShowUploader] = useState(false);
    const [uploaderType, setUploaderType] = useState('payment');
    const [editingQR, setEditingQR] = useState(null);

    const handleSaveQR = (qrData) => {
        if (qrData.type === 'payment') {
            if (editingQR) {
                setPaymentQRs(paymentQRs.map(qr => qr.id === qrData.id ? qrData : qr));
            } else {
                setPaymentQRs([...paymentQRs, { ...qrData, id: `qr_${Date.now()}`, createdAt: new Date().toISOString() }]);
            }
        } else {
            if (editingQR) {
                setFeedbackQRs(feedbackQRs.map(qr => qr.id === qrData.id ? qrData : qr));
            } else {
                setFeedbackQRs([...feedbackQRs, { ...qrData, id: `qr_${Date.now()}`, createdAt: new Date().toISOString() }]);
            }
        }
        setShowUploader(false);
        setEditingQR(null);
    };

    const handleEditQR = (qr) => {
        setEditingQR(qr);
        setUploaderType(qr.type);
        setShowUploader(true);
    };

    const handleDeleteQR = (id, type) => {
        if (confirm('Are you sure you want to delete this QR code?')) {
            if (type === 'payment') {
                setPaymentQRs(paymentQRs.filter(qr => qr.id !== id));
            } else {
                setFeedbackQRs(feedbackQRs.filter(qr => qr.id !== id));
            }
        }
    };

    const handleToggleActive = (id, type) => {
        if (type === 'payment') {
            setPaymentQRs(paymentQRs.map(qr => qr.id === id ? { ...qr, isActive: !qr.isActive } : qr));
        } else {
            setFeedbackQRs(feedbackQRs.map(qr => qr.id === id ? { ...qr, isActive: !qr.isActive } : qr));
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
                    backgroundColor: qr.imageUrl ? 'white' : 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px solid var(--border-primary)'
                }}>
                    {qr.imageUrl ? (
                        <img src={qr.imageUrl} alt={qr.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
                                color: qr.isActive ? '#10b981' : 'var(--text-secondary)',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 600
                            }}
                        >
                            {qr.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                            {qr.isActive ? 'Active' : 'Inactive'}
                        </button>
                    </div>

                    {qr.type === 'payment' && qr.priority && (
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                            Priority: {qr.priority}
                        </div>
                    )}

                    {qr.targetUrl && (
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)', wordBreak: 'break-all' }}>
                            URL: {qr.targetUrl}
                        </div>
                    )}

                    {qr.assignedTo && (
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                            Assigned to: {qr.assignedTo}
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
        </div>
    );
}

export default QRCodeManager;





