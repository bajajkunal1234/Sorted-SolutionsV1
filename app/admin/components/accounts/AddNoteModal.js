'use client'

import { useState } from 'react';
import { X, MessageSquare, AlertCircle } from 'lucide-react';

function AddNoteModal({ accountId, accountName, onClose, onSave }) {
    const [formData, setFormData] = useState({
        category: 'communication',
        noteText: ''
    });

    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};

        if (!formData.noteText.trim()) {
            newErrors.noteText = 'Note text is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const newNote = {
            id: `INT-${Date.now()}`,
            type: 'note_added',
            title: 'Note Added',
            description: formData.noteText.substring(0, 100) + (formData.noteText.length > 100 ? '...' : ''),
            notes: formData.noteText,
            category: formData.category,
            performedBy: {
                id: 'ADMIN-001',
                name: 'Admin User',
                role: 'admin'
            },
            timestamp: new Date().toISOString(),
            accountId,
            accountName
        };

        onSave(newNote);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                {/* Header */}
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <MessageSquare size={20} color="var(--color-primary)" />
                        <h2 className="modal-title">Add Note</h2>
                    </div>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit}>
                    <div className="modal-content" style={{ padding: 'var(--spacing-lg)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            {/* Account Info */}
                            <div style={{
                                padding: 'var(--spacing-sm)',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--text-secondary)'
                            }}>
                                Note for: <strong style={{ color: 'var(--text-primary)' }}>{accountName}</strong>
                            </div>

                            {/* Category */}
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select
                                    className="form-select"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option value="communication">Communication</option>
                                    <option value="service">Service</option>
                                    <option value="financial">Financial</option>
                                    <option value="rental">Rental/AMC</option>
                                    <option value="general">General</option>
                                </select>
                            </div>

                            {/* Note Text */}
                            <div className="form-group">
                                <label className="form-label">Note *</label>
                                <textarea
                                    className="form-input"
                                    value={formData.noteText}
                                    onChange={(e) => setFormData({ ...formData, noteText: e.target.value })}
                                    placeholder="Enter your note here..."
                                    rows={6}
                                    style={{ resize: 'vertical' }}
                                />
                                {errors.noteText && (
                                    <span style={{ color: '#ef4444', fontSize: 'var(--font-size-xs)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                        <AlertCircle size={12} />
                                        {errors.noteText}
                                    </span>
                                )}
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                    {formData.noteText.length} characters
                                </span>
                            </div>

                            {/* Info Box */}
                            <div style={{
                                padding: 'var(--spacing-sm)',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--text-secondary)'
                            }}>
                                💡 This note will be added to the interaction history and timestamped automatically.
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            <MessageSquare size={16} />
                            Add Note
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddNoteModal;
