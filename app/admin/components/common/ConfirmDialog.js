'use client'

import { X, AlertTriangle } from 'lucide-react';

function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm Action",
    message = "Are you sure you want to proceed?",
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "warning" // warning, danger, info
}) {
    if (!isOpen) return null;

    const variantStyles = {
        warning: {
            icon: <AlertTriangle size={24} color="#f59e0b" />,
            confirmBg: '#f59e0b',
            confirmHover: '#d97706'
        },
        danger: {
            icon: <AlertTriangle size={24} color="#ef4444" />,
            confirmBg: '#ef4444',
            confirmHover: '#dc2626'
        },
        info: {
            icon: <AlertTriangle size={24} color="#3b82f6" />,
            confirmBg: '#3b82f6',
            confirmHover: '#2563eb'
        }
    };

    const style = variantStyles[variant] || variantStyles.warning;

    return (
        <div
            className="modal-overlay"
            style={{
                zIndex: 10000,
                backgroundColor: 'rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => {
                // Prevent closing on background click for confirmation dialogs
                e.stopPropagation();
            }}
        >
            <div
                className="modal-container"
                onClick={(e) => e.stopPropagation()}
                style={{
                    maxWidth: '450px',
                    animation: 'modalSlideIn 0.2s ease-out'
                }}
            >
                {/* Header */}
                <div className="modal-header" style={{ borderBottom: '1px solid var(--border-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        {style.icon}
                        <h2 className="modal-title">{title}</h2>
                    </div>
                </div>

                {/* Content */}
                <div className="modal-content" style={{ padding: 'var(--spacing-xl)' }}>
                    <p style={{
                        fontSize: 'var(--font-size-md)',
                        color: 'var(--text-primary)',
                        lineHeight: 1.6,
                        margin: 0
                    }}>
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="modal-footer" style={{
                    display: 'flex',
                    gap: 'var(--spacing-sm)',
                    justifyContent: 'flex-end',
                    borderTop: '1px solid var(--border-primary)',
                    padding: 'var(--spacing-md) var(--spacing-lg)'
                }}>
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                        style={{ minWidth: '100px' }}
                    >
                        {cancelText}
                    </button>
                    <button
                        className="btn"
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        style={{
                            minWidth: '100px',
                            backgroundColor: style.confirmBg,
                            color: 'white',
                            border: 'none'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = style.confirmHover}
                        onMouseLeave={(e) => e.target.style.backgroundColor = style.confirmBg}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmDialog;
