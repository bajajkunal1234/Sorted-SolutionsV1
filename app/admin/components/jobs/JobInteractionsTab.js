'use client'

import { useState } from 'react';
import { MessageSquare, Paperclip, X, Edit2, Save, Clock, FileText, DollarSign, Package, Briefcase, Loader2, Camera, Trash2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import SalesInvoiceForm from '../accounts/SalesInvoiceForm';
import PurchaseInvoiceForm from '../accounts/PurchaseInvoiceForm';
import QuotationForm from '../accounts/QuotationForm';
import ReceiptVoucherForm from '../accounts/ReceiptVoucherForm';
import PaymentVoucherForm from '../accounts/PaymentVoucherForm';

const renderDescription = (desc, type = '') => {
    if (!desc) return null;
    
    // Check if it is status changed transition
    if (desc.includes(' → ') || desc.includes(' -> ')) {
        const arrow = desc.includes(' → ') ? ' → ' : ' -> ';
        const parts = desc.split(arrow);
        let fromStatus = parts[0].split(':').pop().trim();
        fromStatus = fromStatus.split(' ').pop();
        
        let toStatus = parts[1].split(' by ').shift().trim();
        toStatus = toStatus.split(' ').shift();
        
        const byActor = parts[1].includes(' by ') ? parts[1].split(' by ').pop().trim() : '';

        const formatStatusLabel = (status) => {
            return status.replace(/_/g, ' ').replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ 
                        padding: '3px 8px', 
                        borderRadius: '4px', 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        backgroundColor: 'rgba(255,255,255,0.06)', 
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-primary)'
                    }}>
                        {formatStatusLabel(fromStatus)}
                    </span>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>➔</span>
                    <span style={{ 
                        padding: '3px 8px', 
                        borderRadius: '4px', 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        backgroundColor: 'rgba(16,185,129,0.15)', 
                        color: '#10b981',
                        border: '1px solid rgba(16,185,129,0.3)'
                    }}>
                        {formatStatusLabel(toStatus)}
                    </span>
                </div>
                {byActor && (
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        Action performed by: <strong style={{ color: 'var(--text-secondary)' }}>{byActor}</strong>
                    </span>
                )}
            </div>
        );
    }

    if (type === 'note-added' || type === 'note-edited' || type === 'repair-note-added') {
        return (
            <div style={{ 
                padding: '10px 14px', 
                backgroundColor: 'var(--bg-secondary)', 
                borderLeft: '3px solid var(--color-primary, #3b82f6)', 
                borderRadius: '4px 8px 8px 4px',
                fontStyle: 'italic',
                color: 'var(--text-primary)',
                fontSize: '13px',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap'
            }}>
                "{desc}"
            </div>
        );
    }

    return <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{desc}</p>;
};

const renderActorBadge = (name = '') => {
    const lower = name.toLowerCase();
    let bg = 'rgba(255,255,255,0.04)';
    let color = 'var(--text-secondary)';
    let border = '1px solid var(--border-primary)';
    
    if (lower === 'admin' || lower.includes('admin')) {
        bg = 'rgba(239,68,68,0.1)';
        color = '#f87171';
        border = '1px solid rgba(239,68,68,0.2)';
    } else if (lower.includes('customer') || lower.includes('client')) {
        bg = 'rgba(16,185,129,0.1)';
        color = '#34d399';
        border = '1px solid rgba(16,185,129,0.2)';
    } else if (name && name !== 'System' && name !== 'Unknown') {
        bg = 'rgba(59,130,246,0.1)';
        color = '#60a5fa';
        border = '1px solid rgba(59,130,246,0.2)';
    }
    
    return (
        <span style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: bg,
            color: color,
            border: border,
            display: 'inline-block'
        }}>
            {name}
        </span>
    );
};

function JobInteractionsTab({ jobId, jobReference, interactions = [], onAddNote, onEditNote, onUpdate, onDeleteInteraction, isSubmitting = false, currentUserName = '', onTabChange }) {
    const [showNoteForm, setShowNoteForm] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [attachments, setAttachments] = useState([]);

    const [editingNote, setEditingNote] = useState(null);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [activeForm, setActiveForm] = useState(null);

    // Parse visits log list to get start times for each visit
    const chronologicalList = [...interactions].sort((a, b) => new Date(a.timestamp || a.created_at || 0) - new Date(b.timestamp || b.created_at || 0));
    const visits = chronologicalList.filter(i => i.type === 'before-photos-uploaded').map((before, idx) => ({
        visitNumber: idx + 1,
        arrivalTime: before.timestamp || before.created_at
    }));

    const getVisitNumberForInteraction = (timestamp) => {
        if (!timestamp || visits.length === 0) return null;
        const time = new Date(timestamp).getTime();
        let matchedVisit = null;
        for (let i = 0; i < visits.length; i++) {
            const visitArrive = new Date(visits[i].arrivalTime).getTime();
            if (time >= visitArrive) {
                matchedVisit = visits[i].visitNumber;
            }
        }
        return matchedVisit;
    };

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
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-GB', { 
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true 
        });
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
                url: URL.createObjectURL(file), // Local preview
                type: file.type.startsWith('image/') ? 'image' : 'document',
                file: file // <--- Pass the raw file for uploading
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
    const handleSaveEditedNote = async () => {
        if (!noteText.trim()) return;

        const editedNote = {
            ...editingNote,
            description: noteText,
            attachments: [
                ...(editingNote.metadata?.attachments || editingNote.attachments || []).map(url => typeof url === 'string' ? { url, name: 'Attachment' } : url),
                ...attachments.map((file, index) => ({
                    id: `ATT-${Date.now()}-${index}`,
                    name: file.name,
                    url: URL.createObjectURL(file),
                    type: file.type.startsWith('image/') ? 'image' : 'document',
                    file: file
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

        try {
            await onEditNote(editedNote, editInteraction);
            setNoteText('');
            setAttachments([]);
            setEditingNote(null);
            setShowNoteForm(false);
        } catch (error) {
            console.error("Failed to save edited note:", error);
            alert("Failed to save edited note: " + error.message);
        }
    };

    // Handle cancel
    const handleCancel = () => {
        setShowNoteForm(false);
        setNoteText('');
        setAttachments([]);
        setEditingNote(null);
    };

    // Handle file change
    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        
        const processedFiles = await Promise.all(
            files.map(async (file) => {
                if (file.type.startsWith('image/') && !file.type.includes('svg')) {
                    try {
                        const options = {
                            maxSizeMB: 1, // Compress to max ~1MB per image
                            maxWidthOrHeight: 1600, // Max dimension
                            useWebWorker: true,
                        };
                        const compressedFile = await imageCompression(file, options);
                        // browser-image-compression returns a Blob, we should ensure it has a name
                        compressedFile.name = file.name || `image_${Date.now()}.jpg`;
                        return compressedFile;
                    } catch (error) {
                        console.error('Image compression failed:', error);
                        return file; // Fallback to original
                    }
                }
                return file;
            })
        );
        
        setAttachments(processedFiles);
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
        if (interaction.type !== 'note-added') return false;
        
        // If currentUserName is provided, only allow editing if names match
        if (currentUserName) {
            const author = interaction.performed_by_name || interaction.user_name || interaction.performedByName;
            return author === currentUserName;
        }
        
        return true; // Fallback for admin context where everyone might edit
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
                            disabled={isSubmitting}
                            style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={editingNote ? handleSaveEditedNote : handleSaveNote}
                            disabled={isSubmitting}
                            style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)', opacity: isSubmitting ? 0.7 : 1 }}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={16} className="spin" style={{ marginRight: '6px' }} />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={16} style={{ marginRight: '6px' }} />
                                    {editingNote ? 'Save Changes' : 'Save Note'}
                                </>
                            )}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', justifyContent: 'flex-start' }}>
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
                            <div 
                                className="card" 
                                style={{ 
                                    padding: 'var(--spacing-md)', 
                                    backgroundColor: 'var(--bg-elevated)', 
                                    border: '1px solid var(--border-primary)',
                                    borderLeft: `4px solid ${getCategoryColor(interaction.category)}`,
                                    borderRadius: '8px'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-xs)', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                                        <span style={{ color: getCategoryColor(interaction.category) }}>
                                            {getTypeIcon(interaction.type)}
                                        </span>
                                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {getInteractionTypeLabel(interaction.type)}
                                        </h4>
                                        {(() => {
                                            const visitNum = getVisitNumberForInteraction(interaction.timestamp);
                                            if (!visitNum) return null;
                                            return (
                                                <button
                                                    onClick={() => onTabChange && onTabChange('visits')}
                                                    style={{
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        backgroundColor: 'rgba(139,92,246,0.15)',
                                                        color: '#c084fc',
                                                        border: '1px solid rgba(139,92,246,0.3)',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    title="View in Visits Log"
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'rgba(139,92,246,0.25)';
                                                        e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'rgba(139,92,246,0.15)';
                                                        e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)';
                                                    }}
                                                >
                                                    <Camera size={10} /> Visit #{visitNum}
                                                </button>
                                            );
                                        })()}
                                    </div>
                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                                        {formatTimestamp(interaction.timestamp)}
                                    </span>
                                </div>

                                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                    {renderDescription(interaction.description, interaction.type)}
                                </div>

                                {/* Attachments */}
                                {interaction.metadata?.attachments && interaction.metadata.attachments.length > 0 && (
                                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap', marginBottom: 'var(--spacing-sm)' }}>
                                        {interaction.metadata.attachments.map((url, i) => (
                                            <a
                                                key={i}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '60px',
                                                    height: '60px',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    textDecoration: 'none',
                                                    overflow: 'hidden',
                                                    border: '1px solid var(--border-primary)'
                                                }}
                                            >
                                                <img src={url} alt="Attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {/* Footer with User and Edit Buttons */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px', marginTop: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>Performed by:</span>
                                        {renderActorBadge(interaction.performed_by_name || interaction.user_name || interaction.performedByName || 'System')}
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
                                        
                                        {/* Delete Button */}
                                        <button
                                            onClick={() => onDeleteInteraction && onDeleteInteraction(interaction.id)}
                                            style={{
                                                padding: '4px 8px',
                                                fontSize: 'var(--font-size-xs)',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                borderRadius: 'var(--radius-sm)',
                                                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                                                cursor: 'pointer',
                                                color: '#ef4444',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                            title="Delete Interaction"
                                        >
                                            <Trash2 size={12} />
                                            Delete
                                        </button>
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
