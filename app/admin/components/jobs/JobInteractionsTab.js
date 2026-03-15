'use client'

import { useState } from 'react';
import { MessageSquare, Paperclip, X, Edit2, Save, Clock, FileText, DollarSign, Package, Briefcase } from 'lucide-react';
import SalesInvoiceForm from '../accounts/SalesInvoiceForm';
import PurchaseInvoiceForm from '../accounts/PurchaseInvoiceForm';
import QuotationForm from '../accounts/QuotationForm';
import ReceiptVoucherForm from '../accounts/ReceiptVoucherForm';
import PaymentVoucherForm from '../accounts/PaymentVoucherForm';

function JobInteractionsTab({ jobId, jobReference, interactions = [], onAddNote, onEditNote, onUpdate }) {
    const [showNoteForm, setShowNoteForm] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [attachments, setAttachments] = useState([]);

    const [editingNote, setEditingNote] = useState(null);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [activeForm, setActiveForm] = useState(null);

    // Get category color
    const getCategoryColor = (category) => {
        const colors = {
            'service': '#10b981',
            'sales': '#3b82f6',
            'communication': '#8b5cf6',
            'payment': '#f59e0b',
            'system': '#6b7280'
        };
        return colors[category] || '#6b7280';
    };

    // Get type icon
    const getTypeIcon = (type) => {
        const iconMap = {
            'job-created': Clock,
            'job-assigned': Briefcase,
            'job-started': Clock,
            'job-completed': Clock,
            'sales-invoice-created': FileText,
            'quotation-sent': FileText,
            'payment-received': DollarSign,
            'note-added': MessageSquare,
            'note-edited': Edit2
        };
        const Icon = iconMap[type] || FileText;
        return <Icon size={18} />;
    };

    // Get interaction type label
    const getInteractionTypeLabel = (type) => {
        const labels = {
            'job-created': 'Job Created',
            'job-assigned': 'Job Assigned',
            'job-started': 'Job Started',
            'job-completed': 'Job Completed',
            'sales-invoice-created': 'Sales Invoice Created',
            'quotation-sent': 'Quotation Sent',
            'payment-received': 'Payment Received',
            'note-added': 'Note Added',
            'note-edited': 'Note Edited'
        };
        return labels[type] || type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    // Format timestamp
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 1) {
            const diffMins = Math.floor(diffMs / (1000 * 60));
            return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' });
        }
    };

    // Handle save note
    const handleSaveNote = () => {
        if (!noteText.trim()) return;

        const note = {
            id: `NOTE-${Date.now()}`,
            type: 'note-added',
            category: 'communication',
            timestamp: new Date().toISOString(),
            jobId,
            performedBy: 'current-user-id',
            performedByName: 'Current User',
            description: noteText,
            attachments: attachments.map((file, index) => ({
                id: `ATT-${Date.now()}-${index}`,
                name: file.name,
                url: URL.createObjectURL(file),
                type: file.type.startsWith('image/') ? 'image' : 'document'
            })),
            source: 'Admin Panel',
            status: 'completed',
            editable: true
        };

        onAddNote(note);
        setNoteText('');
        setAttachments([]);
        setShowNoteForm(false);
    };

    // Handle edit note
    const handleEditNote = (note) => {
        setEditingNote(note);
        setNoteText(note.description);
        setAttachments([]);
        setShowNoteForm(true);
    };

    // Handle save edited note
    const handleSaveEditedNote = () => {
        if (!noteText.trim()) return;

        const editedNote = {
            ...editingNote,
            description: noteText,
            attachments: [
                ...(editingNote.attachments || []),
                ...attachments.map((file, index) => ({
                    id: `ATT-${Date.now()}-${index}`,
                    name: file.name,
                    url: URL.createObjectURL(file),
                    type: file.type.startsWith('image/') ? 'image' : 'document'
                }))
            ]
        };

        const editInteraction = {
            id: `INT-${Date.now()}`,
            type: 'note-edited',
            category: 'communication',
            timestamp: new Date().toISOString(),
            jobId,
            performedBy: 'current-user-id',
            performedByName: 'Current User',
            description: `Note edited: ${noteText.substring(0, 50)}${noteText.length > 50 ? '...' : ''}`,
            metadata: {
                originalNoteId: editingNote.id,
                changes: {
                    oldDescription: editingNote.description,
                    newDescription: noteText
                }
            },
            source: 'Admin Panel',
            status: 'completed'
        };

        onEditNote(editedNote, editInteraction);
        setNoteText('');
        setAttachments([]);
        setEditingNote(null);
        setShowNoteForm(false);
    };

    // Handle cancel
    const handleCancel = () => {
        setShowNoteForm(false);
        setNoteText('');
        setAttachments([]);
        setEditingNote(null);
    };

    // Handle file change
    const handleFileChange = (e) => {
        setAttachments(Array.from(e.target.files));
    };

    // Remove attachment
    const removeAttachment = (index) => {
        setAttachments(attachments.filter((_, i) => i !== index));
    };

    // Check if interaction is editable transaction
    const isEditableTransaction = (interaction) => {
        const editableTypes = [
            'sales-invoice-created',
            'quotation-sent',
            'receipt-voucher-created',
            'payment-voucher-created'
        ];
        return editableTypes.includes(interaction.type) && interaction.invoiceId;
    };

    // Check if interaction is an editable note
    const isEditableNote = (interaction) => {
        return interaction.type === 'note-added' && interaction.editable;
    };

    // Get form type from interaction type
    const getFormType = (type) => {
        const mapping = {
            'sales-invoice-created': 'sales-invoice',
            'quotation-sent': 'quotation',
            'receipt-voucher-created': 'receipt-voucher',
            'payment-voucher-created': 'payment-voucher'
        };
        return mapping[type];
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, margin: 0 }}>
                    Interaction History
                </h3>
                <button
                    className="btn btn-secondary"
                    onClick={() => setShowNoteForm(!showNoteForm)}
                    style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                >
                    <MessageSquare size={16} />
                    {showNoteForm ? 'Cancel' : 'Add Note'}
                </button>
            </div>

            {/* Add/Edit Note Form */}
            {showNoteForm && (
                <div className="card" style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)' }}>
                    <h4 style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--spacing-sm)', fontWeight: 600 }}>
                        {editingNote ? 'Edit Note' : 'Add Note'}
                    </h4>

                    <div className="form-group" style={{ marginBottom: 'var(--spacing-sm)' }}>
                        <label className="form-label" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Description
                        </label>
                        <textarea
                            className="form-textarea"
                            placeholder="Describe the condition, work done, or observations..."
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            rows={4}
                            style={{ width: '100%', resize: 'vertical' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 'var(--spacing-sm)' }}>
                        <label className="form-label" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Attach Files (Images/Documents)
                        </label>
                        <input
                            type="file"
                            className="form-input"
                            multiple
                            accept="image/*,video/*,.pdf,.doc,.docx"
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* Attachment Preview */}
                    {attachments.length > 0 && (
                        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap', marginBottom: 'var(--spacing-sm)' }}>
                            {attachments.map((file, index) => (
                                <div
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '4px 8px',
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: 'var(--font-size-xs)',
                                        border: '1px solid var(--border-primary)'
                                    }}
                                >
                                    <Paperclip size={12} />
                                    <span>{file.name}</span>
                                    <button
                                        onClick={() => removeAttachment(index)}
                                        className="btn-icon"
                                        style={{ padding: '2px', background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={handleCancel}
                            style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={editingNote ? handleSaveEditedNote : handleSaveNote}
                            style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                        >
                            <Save size={16} />
                            {editingNote ? 'Save Changes' : 'Save Note'}
                        </button>
                    </div>
                </div>
            )}

            {/* Interaction Timeline */}
            <div style={{ position: 'relative' }}>
                {/* Timeline Line */}
                {interactions.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        left: '20px',
                        top: '20px',
                        bottom: '20px',
                        width: '2px',
                        backgroundColor: 'var(--border-primary)'
                    }} />
                )}

                {/* Interactions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    {interactions.map((interaction) => (
                        <div key={interaction.id} style={{ position: 'relative', paddingLeft: '48px' }}>
                            {/* Timeline Dot */}
                            <div style={{
                                position: 'absolute',
                                left: '12px',
                                top: '12px',
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                backgroundColor: getCategoryColor(interaction.category),
                                border: '3px solid var(--bg-primary)',
                                zIndex: 1
                            }} />

                            {/* Interaction Card */}
                            <div className="card" style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-xs)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                        <span style={{ color: getCategoryColor(interaction.category) }}>
                                            {getTypeIcon(interaction.type)}
                                        </span>
                                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                            {getInteractionTypeLabel(interaction.type)}
                                        </h4>
                                    </div>
                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                        {formatTimestamp(interaction.timestamp)}
                                    </span>
                                </div>

                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                                    {interaction.description}
                                </p>

                                {/* Attachments */}
                                {interaction.attachments && interaction.attachments.length > 0 && (
                                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap', marginBottom: 'var(--spacing-sm)' }}>
                                        {interaction.attachments.map((att) => (
                                            <a
                                                key={att.id}
                                                href={att.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '4px 8px',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: 'var(--font-size-xs)',
                                                    textDecoration: 'none',
                                                    color: 'var(--text-primary)',
                                                    border: '1px solid var(--border-primary)'
                                                }}
                                            >
                                                <Paperclip size={12} />
                                                {att.name}
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {/* Footer with User and Edit Buttons */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                    <div>
                                        By: <span style={{ fontWeight: 500 }}>{interaction.performedByName}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                        {/* Edit Note Button */}
                                        {isEditableNote(interaction) && (
                                            <button
                                                onClick={() => handleEditNote(interaction)}
                                                style={{
                                                    padding: '4px 8px',
                                                    fontSize: 'var(--font-size-xs)',
                                                    border: '1px solid var(--border-primary)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    cursor: 'pointer',
                                                    color: 'var(--text-primary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <Edit2 size={12} />
                                                Edit Note
                                            </button>
                                        )}

                                        {/* Edit Transaction Button */}
                                        {isEditableTransaction(interaction) && (
                                            <button
                                                onClick={() => {
                                                    setEditingTransaction(interaction);
                                                    setActiveForm(getFormType(interaction.type));
                                                }}
                                                style={{
                                                    padding: '4px 8px',
                                                    fontSize: 'var(--font-size-xs)',
                                                    border: '1px solid var(--border-primary)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    cursor: 'pointer',
                                                    color: getCategoryColor(interaction.category)
                                                }}
                                            >
                                                Edit {getInteractionTypeLabel(interaction.type).split(' ')[0]} →
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Empty State */}
            {interactions.length === 0 && (
                <div style={{
                    padding: 'var(--spacing-xl)',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)',
                    border: '2px dashed var(--border-primary)'
                }}>
                    <Clock size={48} style={{ margin: '0 auto var(--spacing-md)', opacity: 0.5 }} />
                    <p style={{ fontSize: 'var(--font-size-md)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                        No interactions yet
                    </p>
                    <p style={{ fontSize: 'var(--font-size-sm)' }}>
                        Add your first note or wait for job events to appear here
                    </p>
                </div>
            )}

            {/* Transaction Forms */}
            {activeForm === 'sales-invoice' && editingTransaction && (
                <SalesInvoiceForm
                    onClose={() => {
                        setActiveForm(null);
                        setEditingTransaction(null);
                    }}
                    existingInvoice={editingTransaction.relatedTo}
                    onSave={(data) => {
                        onUpdate();
                        setActiveForm(null);
                        setEditingTransaction(null);
                    }}
                />
            )}

            {activeForm === 'quotation' && editingTransaction && (
                <QuotationForm
                    onClose={() => {
                        setActiveForm(null);
                        setEditingTransaction(null);
                    }}
                    existingQuotation={editingTransaction.relatedTo}
                    onSave={(data) => {
                        onUpdate();
                        setActiveForm(null);
                        setEditingTransaction(null);
                    }}
                />
            )}

            {activeForm === 'receipt-voucher' && editingTransaction && (
                <ReceiptVoucherForm
                    onClose={() => {
                        setActiveForm(null);
                        setEditingTransaction(null);
                    }}
                    existingReceipt={editingTransaction.relatedTo}
                    onSave={(data) => {
                        onUpdate();
                        setActiveForm(null);
                        setEditingTransaction(null);
                    }}
                />
            )}

            {activeForm === 'payment-voucher' && editingTransaction && (
                <PaymentVoucherForm
                    onClose={() => {
                        setActiveForm(null);
                        setEditingTransaction(null);
                    }}
                    existingPayment={editingTransaction.relatedTo}
                    onSave={(data) => {
                        onUpdate();
                        setActiveForm(null);
                        setEditingTransaction(null);
                    }}
                />
            )}
        </div>
    );
}

export default JobInteractionsTab;
