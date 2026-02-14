'use client'

import { useState } from 'react';

function TemplateEditor({ template, onSave, onCancel }) {
    const [name, setName] = useState(template?.name || '');
    const [type, setType] = useState(template?.type || 'quotation');
    const [content, setContent] = useState(template?.content || '');

    const templateTypes = [
        { value: 'quotation', label: 'Quotation Message' },
        { value: 'payment_reminder', label: 'Payment Reminder' },
        { value: 'feedback_request', label: 'Feedback Request' },
        { value: 'job_completion', label: 'Job Completion' }
    ];

    const availableVariables = {
        quotation: ['customer_name', 'job_id', 'total_amount', 'quotation_link'],
        payment_reminder: ['customer_name', 'job_id', 'amount', 'due_date'],
        feedback_request: ['customer_name', 'technician_name', 'feedback_link'],
        job_completion: ['customer_name', 'job_id', 'completion_date']
    };

    const sampleData = {
        customer_name: 'John Doe',
        job_id: 'JOB-2026-001',
        total_amount: '5000',
        quotation_link: 'https://example.com/quotation/123',
        amount: '5000',
        due_date: '2026-01-20',
        technician_name: 'Amit Patel',
        feedback_link: 'https://example.com/feedback/123',
        completion_date: '2026-01-18'
    };

    const insertVariable = (variable) => {
        const textarea = document.getElementById('template-content');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent = content.substring(0, start) + `{${variable}}` + content.substring(end);
        setContent(newContent);

        // Set cursor position after inserted variable
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + variable.length + 2, start + variable.length + 2);
        }, 0);
    };

    const getPreviewContent = () => {
        let preview = content;
        Object.keys(sampleData).forEach(key => {
            preview = preview.replace(new RegExp(`\\{${key}\\}`, 'g'), sampleData[key]);
        });
        return preview;
    };

    const extractVariables = () => {
        const matches = content.match(/\{([^}]+)\}/g);
        if (!matches) return [];
        return [...new Set(matches.map(m => m.slice(1, -1)))];
    };

    const handleSave = () => {
        if (!name.trim()) {
            alert('Please enter a template name');
            return;
        }
        if (!content.trim()) {
            alert('Please enter template content');
            return;
        }

        const templateData = {
            ...template,
            name,
            type,
            content,
            variables: extractVariables(),
            isDefault: template?.isDefault || false
        };

        onSave(templateData);
    };

    return (
        <div style={{ padding: 'var(--spacing-lg)', maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>
                {template ? 'Edit Template' : 'New Template'}
            </h2>

            {/* Template Name */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                    Template Name *
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Quotation Message - Default"
                    className="form-input"
                    style={{ width: '100%' }}
                />
            </div>

            {/* Template Type */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                    Template Type *
                </label>
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="form-input"
                    style={{ width: '100%' }}
                >
                    {templateTypes.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>
            </div>

            {/* Message Content */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                    Message Content *
                </label>
                <textarea
                    id="template-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter your message template here..."
                    className="form-input"
                    rows="6"
                    style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace' }}
                />
            </div>

            {/* Variable Buttons */}
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                    Insert Variables:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)' }}>
                    {availableVariables[type].map(variable => (
                        <button
                            key={variable}
                            onClick={() => insertVariable(variable)}
                            className="btn btn-secondary"
                            style={{
                                padding: '6px 12px',
                                fontSize: 'var(--font-size-xs)',
                                fontFamily: 'monospace'
                            }}
                        >
                            {`{${variable}}`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Preview */}
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                    Preview (with sample data):
                </div>
                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: '#dcf8c6',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-sm)',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    border: '1px solid #34b7f1',
                    minHeight: '80px'
                }}>
                    {getPreviewContent() || 'Preview will appear here...'}
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
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
                    style={{ padding: 'var(--spacing-md)', width: '100%', backgroundColor: '#10b981' }}
                >
                    Save Template
                </button>
            </div>
        </div>
    );
}

export default TemplateEditor;
