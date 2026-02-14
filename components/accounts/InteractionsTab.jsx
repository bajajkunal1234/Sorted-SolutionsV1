'use client'

import { useState } from 'react';
import { History, Search, Filter, FileText, Briefcase, DollarSign, Package, Edit2, MessageSquare, Paperclip, X } from 'lucide-react';
import CreateJobForm from '@/components/admin/CreateJobForm';
import SalesInvoiceForm from './SalesInvoiceForm';
import PurchaseInvoiceForm from './PurchaseInvoiceForm';
import ReceiptVoucherForm from './ReceiptVoucherForm';
import PaymentVoucherForm from './PaymentVoucherForm';
import QuotationForm from './QuotationForm';
import NewRentalForm from '../reports/NewRentalForm';
import NewAMCForm from '../reports/NewAMCForm';

function InteractionsTab({ accountId, accountName }) {
    const [interactions, setInteractions] = useState([
        {
            id: 'INT-001',
            type: 'job_created',
            title: 'New Job Created',
            description: 'AC repair job created for Andheri location',
            relatedTo: {
                type: 'job',
                id: 'JOB-001',
                reference: 'JOB-2026-001',
                // Complete job data for form pre-population
                customer: accountName,
                customerId: accountId,
                address: '123 Andheri West, Mumbai',
                locality: 'Andheri',
                jobType: 'Repair',
                category: 'AC',
                priority: 'high',
                scheduledDate: '2026-01-20',
                description: 'AC not cooling properly, needs gas refill',
                assignedTo: 'TECH-001',
                status: 'scheduled'
            },
            performedBy: { id: 'TECH-001', name: 'Amit Sharma', role: 'technician' },
            timestamp: '2026-01-19T10:30:00Z',
            category: 'service'
        },
        {
            id: 'INT-002',
            type: 'invoice_created',
            title: 'Sales Invoice Generated',
            description: 'Invoice #INV-2026-001 created for ₹5,000',
            relatedTo: {
                type: 'invoice',
                id: 'INV-001',
                reference: 'INV-2026-001',
                // Complete invoice data for form pre-population
                account: accountName,
                accountId: accountId,
                date: '2026-01-18',
                items: [
                    {
                        id: 1,
                        product: 'AC Service',
                        description: 'Annual AC maintenance',
                        quantity: 1,
                        unit: 'Service',
                        rate: 5000,
                        amount: 5000
                    }
                ],
                subtotal: 5000,
                tax: 0,
                total: 5000,
                status: 'unpaid'
            },
            performedBy: { id: 'ADMIN-001', name: 'Admin User', role: 'admin' },
            timestamp: '2026-01-18T14:20:00Z',
            category: 'financial'
        },
        {
            id: 'INT-003',
            type: 'payment_received',
            title: 'Payment Received',
            description: 'Received payment of ₹5,000 via UPI',
            relatedTo: { type: 'payment', id: 'PAY-001', reference: 'REC-2026-001' },
            performedBy: { id: 'ADMIN-001', name: 'Admin User', role: 'admin' },
            timestamp: '2026-01-18T15:45:00Z',
            category: 'financial'
        },
        {
            id: 'INT-004',
            type: 'note_added',
            title: 'Note Added',
            description: 'Customer requested weekend service slots',
            notes: 'Customer prefers Saturday/Sunday between 10 AM - 2 PM',
            performedBy: { id: 'ADMIN-001', name: 'Admin User', role: 'admin' },
            timestamp: '2026-01-15T09:15:00Z',
            category: 'communication'
        },
        {
            id: 'INT-005',
            type: 'rental_started',
            title: 'Rental Agreement Started',
            description: 'Washing Machine rental activated',
            relatedTo: { type: 'rental', id: 'RENTAL-001', reference: 'RENTAL-001' },
            performedBy: { id: 'ADMIN-001', name: 'Admin User', role: 'admin' },
            timestamp: '2026-01-15T00:00:00Z',
            category: 'rental'
        }
    ]);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [showNoteForm, setShowNoteForm] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [noteCategory, setNoteCategory] = useState('communication');
    const [attachments, setAttachments] = useState([]);
    const [activeForm, setActiveForm] = useState(null); // 'job', 'rental', 'amc', 'sales_invoice', 'purchase_invoice', 'receipt', 'payment', 'quotation'
    const [editingItem, setEditingItem] = useState(null);

    const handleSaveNote = () => {
        if (!noteText.trim()) {
            alert('Please enter a note');
            return;
        }

        const newNote = {
            id: `INT-${Date.now()}`,
            type: 'note_added',
            title: 'Note Added',
            description: noteText.substring(0, 100) + (noteText.length > 100 ? '...' : ''),
            notes: noteText,
            category: noteCategory,
            attachments: attachments,
            performedBy: {
                id: 'ADMIN-001',
                name: 'Admin User',
                role: 'admin'
            },
            timestamp: new Date().toISOString(),
            accountId,
            accountName
        };

        setInteractions([newNote, ...interactions]);
        setNoteText('');
        setNoteCategory('communication');
        setAttachments([]);
        setShowNoteForm(false);
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
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
                </div>
            </div>

            {filteredInteractions.length === 0 && (
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




