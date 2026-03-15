'use client'

import { useState, useEffect } from 'react';
import { History, Search, Filter, FileText, Briefcase, DollarSign, Package, Edit2, MessageSquare, Paperclip, X } from 'lucide-react';
import CreateJobForm from '../CreateJobForm';
import SalesInvoiceForm from './SalesInvoiceForm';
import PurchaseInvoiceForm from './PurchaseInvoiceForm';
import ReceiptVoucherForm from './ReceiptVoucherForm';
import PaymentVoucherForm from './PaymentVoucherForm';
import QuotationForm from './QuotationForm';
import NewRentalForm from '../reports/NewRentalForm';
import NewAMCForm from '../reports/NewAMCForm';

function InteractionsTab({ accountId, accountName }) {
    const [interactions, setInteractions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [showNoteForm, setShowNoteForm] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [noteCategory, setNoteCategory] = useState('communication');
    const [attachments, setAttachments] = useState([]);
    const [activeForm, setActiveForm] = useState(null);
    const [editingItem, setEditingItem] = useState(null);

    // Initial Fetch
    useEffect(() => {
        if (accountId) {
            fetchInteractions();
        }
    }, [accountId]);

    const fetchInteractions = async () => {
        try {
            setLoading(true);
            setError(null);

            // Parallel fetch from all tables linked to this account
            const [intRes, jobsRes, rentalsRes, amcRes] = await Promise.all([
                fetch(`/api/admin/interactions?customer_id=${accountId}&limit=300`),
                fetch(`/api/admin/jobs?customer_id=${accountId}`),
                fetch(`/api/admin/rentals?customer_id=${accountId}`),
                fetch(`/api/admin/amc?customer_id=${accountId}`),
            ]);

            const intData   = intRes.ok   ? (await intRes.json()).data   || [] : [];
            const jobsData  = jobsRes.ok  ? (await jobsRes.json()).data  || [] : [];
            const rentData  = rentalsRes.ok ? (await rentalsRes.json()).data || [] : [];
            const amcData   = amcRes.ok   ? (await amcRes.json()).data   || [] : [];

            // Map jobs → interaction-style objects
            const jobItems = jobsData.map(j => ({
                id: `job-${j.id}`,
                type: j.status === 'completed' ? 'job-completed' : j.status === 'cancelled' ? 'job-cancelled' : j.status === 'assigned' ? 'job-assigned' : 'job-created-admin',
                category: 'job',
                title: `Job ${j.job_number || j.id}`,
                description: `${j.category || ''} ${j.subcategory || ''} — Status: ${j.status}`.trim(),
                timestamp: j.created_at,
                customer_id: accountId,
                customer_name: accountName,
                performed_by_name: j.created_by || 'Admin',
                metadata: { job_id: j.id, job_number: j.job_number, status: j.status, technician: j.technician_name },
                source: 'Admin',
                _table: 'jobs',
            }));

            // Map rentals
            const rentalItems = rentData.map(r => ({
                id: `rental-${r.id}`,
                type: 'rental-started',
                category: 'rental',
                title: `Rental — ${r.product_name || 'Product'}`,
                description: `Monthly rent: ₹${r.monthly_rent || 0} | Started: ${r.start_date ? new Date(r.start_date).toLocaleDateString('en-IN') : '—'}`,
                timestamp: r.created_at || r.start_date,
                customer_id: accountId,
                customer_name: accountName,
                performed_by_name: 'Admin',
                metadata: { rental_id: r.id },
                source: 'Admin',
                _table: 'rentals',
            }));

            // Map AMC
            const amcItems = amcData.map(a => ({
                id: `amc-${a.id}`,
                type: 'amc-created',
                category: 'amc',
                title: `AMC — ${a.plan_name || 'AMC Plan'}`,
                description: `${a.appliance_type || ''} | Valid till: ${a.end_date ? new Date(a.end_date).toLocaleDateString('en-IN') : '—'}`,
                timestamp: a.created_at || a.start_date,
                customer_id: accountId,
                customer_name: accountName,
                performed_by_name: 'Admin',
                metadata: { amc_id: a.id },
                source: 'Admin',
                _table: 'amc',
            }));

            // Merge all and sort by timestamp descending
            const merged = [...intData, ...jobItems, ...rentalItems, ...amcItems]
                .filter(Boolean)
                .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

            setInteractions(merged);
        } catch (err) {
            console.error('Error fetching interactions:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNote = async () => {
        if (!noteText.trim()) {
            alert('Please enter a note');
            return;
        }

        try {
            const { supabase } = await import('@/lib/supabase');
            if (!supabase) return;

            const newNote = {
                type: 'note_added',
                title: 'Note Added',
                description: noteText.substring(0, 100) + (noteText.length > 100 ? '...' : ''),
                metadata: { notes: noteText, attachments },
                category: noteCategory,
                customer_id: accountId,
                customer_name: accountName,
                performed_by: 'ADMIN', // specific user ID if auth available
                performed_by_name: 'Admin User',
                timestamp: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('interactions')
                .insert([newNote])
                .select()
                .single();

            if (error) throw error;

            setInteractions([data, ...interactions]);
            setNoteText('');
            setNoteCategory('communication');
            setAttachments([]);
            setShowNoteForm(false);
        } catch (err) {
            console.error('Error saving note:', err);
            alert('Failed to save note: ' + err.message);
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
            url: URL.createObjectURL(file) // Temporarily local URL
        }));
        setAttachments([...attachments, ...newAttachments]);
        // Note: Real implementation should upload to storage bucket
    };

    const handleRemoveAttachment = (attachmentId) => {
        setAttachments(attachments.filter(att => att.id !== attachmentId));
    };

    const filteredInteractions = interactions.filter(i => {
        const matchesSearch = !searchTerm ||
            (i.title && i.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (i.description && i.description.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesType = filterType === 'all' || i.type === filterType;
        const matchesCategory = filterCategory === 'all' || i.category === filterCategory;
        return matchesSearch && matchesType && matchesCategory;
    });

    const getTypeIcon = (type) => {
        switch (type) {
            case 'job_created':
            case 'job-created-admin':
            case 'job-assigned':
            case 'job-started':
            case 'job-completed':
            case 'job-cancelled':
            case 'job-reassigned':
            case 'job-edited':
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

    const getCategoryColor = (category, type) => {
        // job-type interactions get a consistent blue regardless of category field
        if (type && (type.startsWith('job') || type.startsWith('job-'))) return '#6366f1';
        switch (category) {
            case 'job': return '#6366f1';
            case 'service': return '#3b82f6';
            case 'financial': return '#10b981';
            case 'rental': return '#f59e0b';
            case 'communication': return '#8b5cf6';
            default: return 'var(--text-secondary)';
        }
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
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
                        <option value="job-created-admin">Job Created</option>
                        <option value="job-assigned">Job Assigned</option>
                        <option value="job-reassigned">Job Reassigned</option>
                        <option value="job-started">Job Started</option>
                        <option value="job-completed">Job Completed</option>
                        <option value="job-cancelled">Job Cancelled</option>
                        <option value="job-edited">Job Edited</option>
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
            <div style={{ position: 'relative', minHeight: '200px' }}>
                {/* Timeline Line */}
                <div style={{
                    position: 'absolute',
                    left: '20px',
                    top: '20px',
                    bottom: '20px',
                    width: '2px',
                    backgroundColor: 'var(--border-primary)'
                }} />

                {loading ? (
                    <div style={{ paddingLeft: '48px', color: 'var(--text-tertiary)' }}>Loading interactions...</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        {filteredInteractions.map((interaction, index) => {
                            const TypeIcon = getTypeIcon(interaction.type);
                            const categoryColor = getCategoryColor(interaction.category, interaction.type);

                            // Handle metadata for notes
                            const notesContent = interaction.metadata?.notes || '';
                            const isJobInteraction = interaction.job_id || (interaction.type && (interaction.type.startsWith('job') || interaction.type.startsWith('job-')));

                            return (
                                <div key={interaction.id} style={{ position: 'relative', paddingLeft: '48px' }}>
                                    {/* Timeline Dot */}
                                    <div style={{
                                        position: 'absolute', left: '12px', top: '12px',
                                        width: '16px', height: '16px', borderRadius: '50%',
                                        backgroundColor: categoryColor,
                                        border: '3px solid var(--bg-primary)', zIndex: 1
                                    }} />

                                    {/* Interaction Card */}
                                    <div style={{
                                        padding: 'var(--spacing-md)',
                                        backgroundColor: 'var(--bg-elevated)',
                                        borderRadius: 'var(--radius-md)',
                                        border: `1px solid ${isJobInteraction ? categoryColor + '40' : 'var(--border-primary)'}`,
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-xs)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                                                <TypeIcon size={18} color={categoryColor} />
                                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                                    {interaction.title || interaction.type?.replace(/-/g, ' ').replace(/_/g, ' ')}
                                                </h4>
                                                {/* Job reference badge */}
                                                {isJobInteraction && (
                                                    <span style={{
                                                        fontSize: '11px', padding: '2px 8px',
                                                        backgroundColor: categoryColor + '20',
                                                        color: categoryColor,
                                                        borderRadius: '12px', fontWeight: 600, whiteSpace: 'nowrap'
                                                    }}>
                                                        {interaction.metadata?.job_number
                                                            ? `Job #${interaction.metadata.job_number}`
                                                            : interaction.job_id
                                                                ? `Job`
                                                                : 'Job Related'}
                                                    </span>
                                                )}
                                            </div>
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                                                {formatTimestamp(interaction.timestamp)}
                                            </span>
                                        </div>

                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                                            {interaction.description}
                                        </p>

                                        {notesContent && (
                                            <div style={{
                                                padding: 'var(--spacing-sm)', backgroundColor: 'var(--bg-secondary)',
                                                borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)',
                                                fontStyle: 'italic', marginBottom: 'var(--spacing-sm)'
                                            }}>
                                                "{notesContent}"
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                            <div>
                                                By: <span style={{ fontWeight: 500 }}>{interaction.performed_by_name || 'System'}</span>
                                                {interaction.source && <span style={{ marginLeft: '6px' }}>· {interaction.source}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {!loading && filteredInteractions.length === 0 && (
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

            {/* ... (Hidden Edit Forms for related items if needed) ... */}
        </div>
    );
}

export default InteractionsTab;
