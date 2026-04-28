'use client'

import { useState, useEffect } from 'react';
import { History, Search, Filter, FileText, Briefcase, DollarSign, Package, Edit2, MessageSquare, Paperclip, X, Loader2 } from 'lucide-react';
import CreateJobForm from '@/components/admin/CreateJobForm';
import SalesInvoiceForm from './SalesInvoiceForm';
import PurchaseInvoiceForm from './PurchaseInvoiceForm';
import ReceiptVoucherForm from './ReceiptVoucherForm';
import PaymentVoucherForm from './PaymentVoucherForm';
import QuotationForm from './QuotationForm';
import NewRentalForm from '../reports/NewRentalForm';
import NewAMCForm from '../reports/NewAMCForm';
import { getInteractionType } from '@/lib/data/interactionTypes';

function InteractionsTab({ accountId, accountName }) {
    const [interactions, setInteractions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchInteractions = async () => {
        if (!accountId) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/interactions?customer_id=${accountId}&limit=100`);
            const data = await res.json();
            if (data.success) {
                const mapped = data.data.map(i => ({
                    id: i.id,
                    type: i.type,
                    title: getInteractionType(i.type)?.label || i.type,
                    description: i.description || '',
                    category: i.category || 'other',
                    timestamp: i.timestamp,
                    performedBy: {
                        id: i.performed_by,
                        name: i.performed_by_name || 'System',
                        role: i.source || 'System'
                    },
                    notes: i.metadata?.notes || null,
                    relatedTo: i.job_id ? { type: 'job', id: i.job_id } : 
                               i.invoice_id ? { type: 'invoice', id: i.invoice_id } : null
                }));
                setInteractions(mapped);
            }
        } catch (err) {
            console.error('Failed to fetch interactions:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInteractions();
    }, [accountId]);
    // Removed dummy data

    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [showNoteForm, setShowNoteForm] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [noteCategory, setNoteCategory] = useState('communication');
    const [attachments, setAttachments] = useState([]);
    const [activeForm, setActiveForm] = useState(null); // 'job', 'rental', 'amc', 'sales_invoice', 'purchase_invoice', 'receipt', 'payment', 'quotation'
    const [editingItem, setEditingItem] = useState(null);

    const handleSaveNote = async () => {
        if (!noteText.trim()) {
            alert('Please enter a note');
            return;
        }

        const noteObj = {
            type: 'note_added',
            category: noteCategory,
            customer_id: accountId,
            customer_name: accountName,
            description: noteText.substring(0, 100) + (noteText.length > 100 ? '...' : ''),
            metadata: { notes: noteText, attachments },
            performed_by: 'ADMIN',
            performed_by_name: 'Admin User',
            source: 'Admin App',
            timestamp: new Date().toISOString()
        };

        try {
            const res = await fetch('/api/admin/interactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(noteObj)
            });
            const data = await res.json();
            if (data.success) {
                // Refresh list
                fetchInteractions();
                setNoteText('');
                setNoteCategory('communication');
                setAttachments([]);
                setShowNoteForm(false);
            } else {
                alert('Failed to save note.');
            }
        } catch (error) {
            console.error(error);
            alert('Error saving note.');
        }
    };

    const handleCancelNote = () => {
        setNoteText('');
        setNoteCategory('communication');
        setAttachments([]);
        setShowNoteForm(false);
    };

    const handleFileAttach = (e) => {
        const files = Array.from(e.target.files);
        const newAttachments = files.map(file => ({
            id: `ATT-${Date.now()}-${Math.random()}`,
            name: file.name,
            size: file.size,
            type: file.type,
            url: URL.createObjectURL(file)
        }));
        setAttachments([...attachments, ...newAttachments]);
    };

    const handleRemoveAttachment = (attachmentId) => {
        setAttachments(attachments.filter(att => att.id !== attachmentId));
    };

    const filteredInteractions = interactions.filter(i => {
        const matchesSearch = !searchTerm ||
            i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || i.type === filterType;
        const matchesCategory = filterCategory === 'all' || i.category === filterCategory;
        return matchesSearch && matchesType && matchesCategory;
    });

    const getTypeIcon = (type) => {
        switch (type) {
            case 'job_created':
            case 'job_completed':
                return Briefcase;
            case 'invoice_created':
            case 'payment_received':
                return DollarSign;
            case 'rental_started':
            case 'amc_activated':
                return Package;
            case 'note_added':
                return MessageSquare;
            default:
                return FileText;
        }
    };

    const getCategoryColor = (category) => {
        switch (category) {
            case 'service': return '#3b82f6';
            case 'financial': return '#10b981';
            case 'rental': return '#f59e0b';
            case 'communication': return '#8b5cf6';
            default: return 'var(--text-secondary)';
        }
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' });
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {/* Header with Search and Filters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
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

                {/* Search and Filters */}
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                        <Search size={16} style={{
                            position: 'absolute',
                            left: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-tertiary)'
                        }} />
                        <input
                            type="text"
                            placeholder="Search interactions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '6px 8px 6px 32px',
                                fontSize: 'var(--font-size-sm)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'var(--bg-elevated)'
                            }}
                        />
                    </div>

                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        style={{
                            padding: '6px 8px',
                            fontSize: 'var(--font-size-xs)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <option value="all">All Categories</option>
                        <option value="service">Service</option>
                        <option value="financial">Financial</option>
                        <option value="rental">Rental/AMC</option>
                        <option value="communication">Communication</option>
                    </select>

                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        style={{
                            padding: '6px 8px',
                            fontSize: 'var(--font-size-xs)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <option value="all">All Types</option>
                        <option value="job_created">Job Created</option>
                        <option value="invoice_created">Invoice Created</option>
                        <option value="payment_received">Payment Received</option>
                        <option value="note_added">Note Added</option>
                        <option value="rental_started">Rental Started</option>
                    </select>
                </div>
            </div>

            {/* Inline Note Form */}
            {showNoteForm && (
                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '2px solid var(--color-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-sm)'
                }}>
                    {/* Note Textarea */}
                    <textarea
                        className="form-input"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Enter your note here..."
                        rows={4}
                        style={{
                            resize: 'vertical',
                            fontSize: 'var(--font-size-sm)'
                        }}
                    />

                    {/* Attachments Display */}
                    {attachments.length > 0 && (
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 'var(--spacing-xs)',
                            padding: 'var(--spacing-sm)',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-sm)'
                        }}>
                            {attachments.map(att => (
                                <div key={att.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-xs)',
                                    padding: '4px 8px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: 'var(--font-size-xs)',
                                    border: '1px solid var(--border-primary)'
                                }}>
                                    <Paperclip size={12} />
                                    <span>{att.name}</span>
                                    <button
                                        onClick={() => handleRemoveAttachment(att.id)}
                                        className="btn-icon"
                                        style={{ padding: '2px' }}
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
                            onClick={handleCancelNote}
                            style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                        >
                            Cancel
                        </button>
                        <label className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)', cursor: 'pointer', margin: 0 }}>
                            <Paperclip size={16} />
                            Attach
                            <input
                                type="file"
                                multiple
                                onChange={handleFileAttach}
                                style={{ display: 'none' }}
                                accept="image/*,video/*,.pdf,.doc,.docx"
                            />
                        </label>
                        <button
                            className="btn btn-primary"
                            onClick={handleSaveNote}
                            style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                        >
                            <MessageSquare size={16} />
                            Save Note
                        </button>
                    </div>
                </div>
            )}

            {/* Timeline */}
            <div style={{ position: 'relative' }}>
                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-xl)' }}>
                        <Loader2 className="spinner" size={24} style={{ color: 'var(--color-primary)' }} />
                    </div>
                ) : (
                    <>
                        {/* Timeline Line */}
                <div style={{
                    position: 'absolute',
                    left: '20px',
                    top: '20px',
                    bottom: '20px',
                    width: '2px',
                    backgroundColor: 'var(--border-primary)'
                }} />

                {/* Interactions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    {filteredInteractions.map((interaction, index) => {
                        const TypeIcon = getTypeIcon(interaction.type);
                        const categoryColor = getCategoryColor(interaction.category);

                        return (
                            <div key={interaction.id} style={{ position: 'relative', paddingLeft: '48px' }}>
                                {/* Timeline Dot */}
                                <div style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '12px',
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    backgroundColor: categoryColor,
                                    border: '3px solid var(--bg-primary)',
                                    zIndex: 1
                                }} />

                                {/* Interaction Card */}
                                <div style={{
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: 'var(--bg-elevated)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-primary)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-xs)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                            <TypeIcon size={18} color={categoryColor} />
                                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                                {interaction.title}
                                            </h4>
                                        </div>
                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                            {formatTimestamp(interaction.timestamp)}
                                        </span>
                                    </div>

                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                                        {interaction.description}
                                    </p>

                                    {interaction.notes && (
                                        <div style={{
                                            padding: 'var(--spacing-sm)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: 'var(--font-size-sm)',
                                            fontStyle: 'italic',
                                            marginBottom: 'var(--spacing-sm)'
                                        }}>
                                            "{interaction.notes}"
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                        <div>
                                            By: <span style={{ fontWeight: 500 }}>{interaction.performedBy.name}</span>
                                            {' '}({interaction.performedBy.role})
                                        </div>
                                        {interaction.relatedTo && (
                                            <button
                                                onClick={() => {
                                                    // Map interaction type to form type
                                                    const typeMap = {
                                                        'invoice': 'sales_invoice',
                                                        'payment': 'receipt',
                                                        'job': 'job',
                                                        'rental': 'rental',
                                                        'amc': 'amc',
                                                        'quotation': 'quotation'
                                                    };
                                                    setEditingItem(interaction.relatedTo);
                                                    setActiveForm(typeMap[interaction.relatedTo.type] || interaction.relatedTo.type);
                                                }}
                                                style={{
                                                    padding: '4px 8px',
                                                    fontSize: 'var(--font-size-xs)',
                                                    border: '1px solid var(--border-primary)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    cursor: 'pointer',
                                                    color: categoryColor
                                                }}
                                            >
                                                Edit {interaction.relatedTo.type.charAt(0).toUpperCase() + interaction.relatedTo.type.slice(1)} →
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    </>
                )}
                </div>
            </div>

            {!isLoading && filteredInteractions.length === 0 && (
                <div style={{
                    padding: 'var(--spacing-xl)',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)',
                    border: '2px dashed var(--border-primary)'
                }}>
                    <History size={48} style={{ margin: '0 auto var(--spacing-md)', opacity: 0.5 }} />
                    <p style={{ fontSize: 'var(--font-size-md)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                        No Interactions Found
                    </p>
                    <p style={{ fontSize: 'var(--font-size-sm)' }}>
                        {searchTerm || filterType !== 'all' || filterCategory !== 'all'
                            ? 'Try adjusting your search or filters'
                            : 'All interactions with this account will appear here'}
                    </p>
                </div>
            )}

            {/* Edit Forms */}
            {activeForm === 'job' && editingItem && (
                <CreateJobForm
                    onClose={() => {
                        setActiveForm(null);
                        setEditingItem(null);
                    }}
                    existingJob={editingItem}
                />
            )}

            {activeForm === 'sales_invoice' && editingItem && (
                <SalesInvoiceForm
                    onClose={() => {
                        setActiveForm(null);
                        setEditingItem(null);
                    }}
                    existingInvoice={editingItem}
                />
            )}

            {activeForm === 'purchase_invoice' && editingItem && (
                <PurchaseInvoiceForm
                    onClose={() => {
                        setActiveForm(null);
                        setEditingItem(null);
                    }}
                    existingInvoice={editingItem}
                />
            )}

            {activeForm === 'receipt' && editingItem && (
                <ReceiptVoucherForm
                    onClose={() => {
                        setActiveForm(null);
                        setEditingItem(null);
                    }}
                    existingReceipt={editingItem}
                />
            )}

            {activeForm === 'payment' && editingItem && (
                <PaymentVoucherForm
                    onClose={() => {
                        setActiveForm(null);
                        setEditingItem(null);
                    }}
                    existingPayment={editingItem}
                />
            )}

            {activeForm === 'quotation' && editingItem && (
                <QuotationForm
                    onClose={() => {
                        setActiveForm(null);
                        setEditingItem(null);
                    }}
                    existingQuotation={editingItem}
                />
            )}

            {activeForm === 'rental' && editingItem && (
                <NewRentalForm
                    onClose={() => {
                        setActiveForm(null);
                        setEditingItem(null);
                    }}
                    existingRental={editingItem}
                />
            )}

            {activeForm === 'amc' && editingItem && (
                <NewAMCForm
                    onClose={() => {
                        setActiveForm(null);
                        setEditingItem(null);
                    }}
                    existingAMC={editingItem}
                />
            )}
        </div>
    );
}

export default InteractionsTab;




