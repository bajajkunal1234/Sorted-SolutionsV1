'use client'

import { useState } from 'react';
import { Edit2, Trash2, Plus, Star } from 'lucide-react';
import TemplateEditor from './TemplateEditor';

function WhatsAppTemplateManager() {
    const [templates, setTemplates] = useState([
        {
            id: 'tmpl_001',
            name: 'Quotation Message - Default',
            type: 'quotation',
            content: 'Hi {customer_name}, your quotation for Job #{job_id} is ready. Total amount: ₹{total_amount}. View details: {quotation_link}',
            variables: ['customer_name', 'job_id', 'total_amount', 'quotation_link'],
            isDefault: true,
            createdAt: '2026-01-18T10:00:00Z'
        },
        {
            id: 'tmpl_002',
            name: 'Payment Reminder',
            type: 'payment_reminder',
            content: 'Dear {customer_name}, this is a reminder for pending payment of ₹{amount} for Job #{job_id}. Due date: {due_date}',
            variables: ['customer_name', 'amount', 'job_id', 'due_date'],
            isDefault: true,
            createdAt: '2026-01-18T10:00:00Z'
        }
    ]);
    const [showEditor, setShowEditor] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);

    const templateTypes = {
        quotation: { label: 'Quotation Message', color: '#8b5cf6' },
        payment_reminder: { label: 'Payment Reminder', color: '#ef4444' },
        feedback_request: { label: 'Feedback Request', color: '#10b981' },
        job_completion: { label: 'Job Completion', color: '#3b82f6' }
    };

    const handleSaveTemplate = (template) => {
        if (editingTemplate) {
            setTemplates(templates.map(t => t.id === template.id ? template : t));
        } else {
            setTemplates([...templates, { ...template, id: `tmpl_${Date.now()}`, createdAt: new Date().toISOString() }]);
        }
        setShowEditor(false);
        setEditingTemplate(null);
    };

    const handleEditTemplate = (template) => {
        setEditingTemplate(template);
        setShowEditor(true);
    };

    const handleDeleteTemplate = (id) => {
        if (confirm('Are you sure you want to delete this template?')) {
            setTemplates(templates.filter(t => t.id !== id));
        }
    };

    const handleSetDefault = (id, type) => {
        setTemplates(templates.map(t => ({
            ...t,
            isDefault: t.id === id && t.type === type ? true : (t.type === type ? false : t.isDefault)
        })));
    };

    if (showEditor) {
        return (
            <TemplateEditor
                template={editingTemplate}
                onSave={handleSaveTemplate}
                onCancel={() => {
                    setShowEditor(false);
                    setEditingTemplate(null);
                }}
            />
        );
    }

    return (
        <div style={{ padding: 'var(--spacing-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>WhatsApp Templates</h2>
                <button
                    onClick={() => setShowEditor(true)}
                    className="btn btn-primary"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-xs)',
                        backgroundColor: '#10b981'
                    }}
                >
                    <Plus size={16} />
                    New Template
                </button>
            </div>

            {/* Templates List */}
            {templates.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: 'var(--spacing-xl)',
                    color: 'var(--text-secondary)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                        No templates yet
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)' }}>
                        Click "New Template" to create your first WhatsApp template
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    {templates.map(template => {
                        const typeConfig = templateTypes[template.type];
                        return (
                            <div
                                key={template.id}
                                style={{
                                    padding: 'var(--spacing-lg)',
                                    backgroundColor: 'var(--bg-elevated)',
                                    borderRadius: 'var(--radius-md)',
                                    border: `1px solid ${template.isDefault ? typeConfig.color : 'var(--border-primary)'}`,
                                    boxShadow: template.isDefault ? `0 0 0 1px ${typeConfig.color}40` : 'none'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)' }}>
                                            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
                                                {template.name}
                                            </h3>
                                            {template.isDefault && (
                                                <span style={{
                                                    padding: '2px 8px',
                                                    backgroundColor: `${typeConfig.color}20`,
                                                    color: typeConfig.color,
                                                    fontSize: 'var(--font-size-xs)',
                                                    fontWeight: 600,
                                                    borderRadius: 'var(--radius-sm)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    <Star size={12} fill={typeConfig.color} />
                                                    DEFAULT
                                                </span>
                                            )}
                                        </div>
                                        <div style={{
                                            fontSize: 'var(--font-size-sm)',
                                            color: typeConfig.color,
                                            fontWeight: 600,
                                            marginBottom: 'var(--spacing-sm)'
                                        }}>
                                            {typeConfig.label}
                                        </div>
                                    </div>
                                </div>

                                {/* Template Content */}
                                <div style={{
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: 'var(--font-size-sm)',
                                    lineHeight: 1.6,
                                    marginBottom: 'var(--spacing-md)',
                                    fontFamily: 'monospace',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word'
                                }}>
                                    {template.content}
                                </div>

                                {/* Variables */}
                                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                                        Variables:
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)' }}>
                                        {template.variables.map(variable => (
                                            <span
                                                key={variable}
                                                style={{
                                                    padding: '4px 8px',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    fontSize: 'var(--font-size-xs)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontFamily: 'monospace',
                                                    color: 'var(--text-secondary)'
                                                }}
                                            >
                                                {`{${variable}}`}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                    <button
                                        onClick={() => handleEditTemplate(template)}
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
                                    {!template.isDefault && (
                                        <button
                                            onClick={() => handleSetDefault(template.id, template.type)}
                                            className="btn"
                                            style={{
                                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                                fontSize: 'var(--font-size-sm)',
                                                backgroundColor: typeConfig.color,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--spacing-xs)'
                                            }}
                                        >
                                            <Star size={14} />
                                            Set as Default
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteTemplate(template.id)}
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
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default WhatsAppTemplateManager;
