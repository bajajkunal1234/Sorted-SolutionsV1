'use client'

import { useState, useEffect } from 'react';
import { HelpCircle, Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp, Loader2, RefreshCcw } from 'lucide-react';
import { websiteSettingsAPI, websiteFaqsAPI } from '@/lib/adminAPI';

function FAQsManagement() {
    const pageOptions = [
        'Homepage',
        'All Service Pages',
        'All Location Pages',
        'AC Repair Page',
        'Washing Machine Repair Page',
        'Refrigerator Repair Page',
        'Microwave Repair Page',
        'RO Water Purifier Page',
        'Gas Stove Repair Page',
        'Andheri Service Page',
        'Dadar Service Page',
        'Ghatkopar Service Page',
        'Contact Page',
        'About Page'
    ];

    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newFaq, setNewFaq] = useState({
        question: '',
        answer: '',
        pages: ['Homepage']
    });
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        fetchFaqs();
    }, []);

    const fetchFaqs = async () => {
        setLoading(true);
        try {
            const data = await websiteFaqsAPI.getAll();
            if (data) {
                // Ensure pages is an array even if not in dedicated table (for UI compatibility)
                const mappedData = data.map(f => ({
                    ...f,
                    pages: f.pages || (f.category ? [f.category] : [])
                }));
                setFaqs(mappedData);
            }
        } catch (error) {
            console.error('Error fetching FAQs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (faq) => {
        setEditingId(faq.id);
        setEditForm({ ...faq });
    };

    const handleSaveEdit = async () => {
        setSaving(true);
        try {
            await websiteFaqsAPI.update(editingId, {
                question: editForm.question,
                answer: editForm.answer,
                category: editForm.pages?.[0] || 'General' // Use first selected page as category for now
            });
            setFaqs(faqs.map(f => f.id === editingId ? editForm : f));
            setEditingId(null);
            setEditForm({});
        } catch (error) {
            console.error('Error updating FAQ:', error);
            alert('Failed to update FAQ');
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this FAQ?')) {
            try {
                await websiteFaqsAPI.delete(id);
                setFaqs(faqs.filter(f => f.id !== id));
            } catch (error) {
                console.error('Error deleting FAQ:', error);
                alert('Failed to delete FAQ');
            }
        }
    };

    const handleAddFaq = async () => {
        if (newFaq.question && newFaq.answer) {
            setSaving(true);
            try {
                const addedFaq = await websiteFaqsAPI.create({
                    question: newFaq.question,
                    answer: newFaq.answer,
                    category: newFaq.pages?.[0] || 'General',
                    display_order: faqs.length + 1,
                    is_active: true
                });

                if (addedFaq) {
                    setFaqs([...faqs, { ...addedFaq, pages: newFaq.pages }]);
                    setNewFaq({ question: '', answer: '', pages: ['Homepage'] });
                    setShowAddForm(false);
                }
            } catch (error) {
                console.error('Error adding FAQ:', error);
                alert('Failed to add FAQ');
            } finally {
                setSaving(false);
            }
        }
    };

    const handlePageToggle = (faqPages, page) => {
        if (faqPages.includes(page)) {
            return faqPages.filter(p => p !== page);
        } else {
            return [...faqPages, page];
        }
    };

    const handleSaveAll = async () => {
        // Individual items are saved on add/edit/delete now to match dedicated table pattern
        // But we can keep this for bulk updates if the API supports it
        alert('All changes are already saved as you make them.');
    };


    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                        Global FAQ's Management
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                        Create and manage a library of frequently asked questions for your website
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={fetchFaqs}
                        disabled={loading}
                        style={{ padding: '6px 12px' }}
                    >
                        <RefreshCcw size={16} className={loading ? 'spin' : ''} />
                    </button>
                    <button
                        onClick={handleSaveAll}
                        disabled={saving || loading}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', padding: '10px 24px' }}
                    >
                        {saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                        {saving ? 'Saving...' : 'Save All Changes'}
                    </button>
                </div>
            </div>

            {/* Add New FAQ Button */}
            {!showAddForm && (
                <button
                    onClick={() => setShowAddForm(true)}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)' }}
                >
                    <Plus size={18} />
                    Add New FAQ
                </button>
            )}

            {/* Add FAQ Form */}
            {showAddForm && (
                <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)', border: '2px solid var(--color-primary)' }}>
                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                        Add New FAQ
                    </h4>

                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Question *
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., What is your service area?"
                                value={newFaq.question}
                                onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: 'var(--spacing-sm)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-sm)'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Answer *
                            </label>
                            <textarea
                                placeholder="Enter the answer to this question..."
                                value={newFaq.answer}
                                onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                                rows={4}
                                style={{
                                    width: '100%',
                                    padding: 'var(--spacing-sm)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-sm)',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Display on Pages
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--spacing-xs)' }}>
                                {pageOptions.map(page => (
                                    <label key={page} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer', padding: 'var(--spacing-xs)' }}>
                                        <input
                                            type="checkbox"
                                            checked={newFaq.pages.includes(page)}
                                            onChange={() => setNewFaq({ ...newFaq, pages: handlePageToggle(newFaq.pages, page) })}
                                            style={{ width: '16px', height: '16px' }}
                                        />
                                        <span style={{ fontSize: 'var(--font-size-sm)' }}>{page}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                        <button
                            onClick={handleAddFaq}
                            className="btn btn-primary"
                            disabled={!newFaq.question || !newFaq.answer}
                        >
                            <Save size={16} />
                            Add FAQ
                        </button>
                        <button
                            onClick={() => {
                                setShowAddForm(false);
                                setNewFaq({ question: '', answer: '', pages: ['Homepage'] });
                            }}
                            className="btn btn-secondary"
                        >
                            <X size={16} />
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* FAQs List */}
            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-secondary)' }}>
                        <Loader2 className="spin" size={48} style={{ marginBottom: 'var(--spacing-md)' }} />
                        <p>Loading FAQs library...</p>
                    </div>
                ) : faqs.length === 0 ? (
                    <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>No FAQs found. Add one above.</p>
                    </div>
                ) : (
                    faqs.map((faq) => (
                        <div
                            key={faq.id}
                            className="card"
                            style={{
                                padding: 'var(--spacing-lg)',
                                border: editingId === faq.id ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)'
                            }}
                        >
                            {editingId === faq.id ? (
                                // Edit Mode
                                <div>
                                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                                Question
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.question}
                                                onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: 'var(--spacing-sm)',
                                                    border: '1px solid var(--border-primary)',
                                                    borderRadius: 'var(--radius-md)',
                                                    fontSize: 'var(--font-size-sm)'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                                Answer
                                            </label>
                                            <textarea
                                                value={editForm.answer}
                                                onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                                                rows={4}
                                                style={{
                                                    width: '100%',
                                                    padding: 'var(--spacing-sm)',
                                                    border: '1px solid var(--border-primary)',
                                                    borderRadius: 'var(--radius-md)',
                                                    fontSize: 'var(--font-size-sm)',
                                                    resize: 'vertical'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                                Display on Pages
                                            </label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--spacing-xs)' }}>
                                                {pageOptions.map(page => (
                                                    <label key={page} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer', padding: 'var(--spacing-xs)' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={editForm.pages?.includes(page)}
                                                            onChange={() => setEditForm({ ...editForm, pages: handlePageToggle(editForm.pages || [], page) })}
                                                            style={{ width: '16px', height: '16px' }}
                                                        />
                                                        <span style={{ fontSize: 'var(--font-size-sm)' }}>{page}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                                        <button onClick={handleSaveEdit} className="btn btn-primary">
                                            <Save size={16} />
                                            Save
                                        </button>
                                        <button onClick={handleCancelEdit} className="btn btn-secondary">
                                            <X size={16} />
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // View Mode
                                <div>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            backgroundColor: '#f97316 15',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            <HelpCircle size={20} style={{ color: '#f97316' }} />
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: '0 0 var(--spacing-xs) 0' }}>
                                                {faq.question}
                                            </h4>

                                            {expandedId === faq.id && (
                                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: '0 0 var(--spacing-sm) 0', lineHeight: 1.6 }}>
                                                    {faq.answer}
                                                </p>
                                            )}

                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-sm)' }}>
                                                {faq.pages.map(page => (
                                                    <span
                                                        key={page}
                                                        style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '12px',
                                                            fontSize: '11px',
                                                            fontWeight: 500,
                                                            backgroundColor: '#3b82f615',
                                                            color: '#3b82f6',
                                                            border: '1px solid #3b82f630'
                                                        }}
                                                    >
                                                        {page}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexShrink: 0 }}>
                                            <button
                                                onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                                                className="btn btn-secondary"
                                                style={{ padding: '6px 12px' }}
                                                title={expandedId === faq.id ? "Collapse" : "Expand"}
                                            >
                                                {expandedId === faq.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                            <button
                                                onClick={() => handleEdit(faq)}
                                                className="btn btn-secondary"
                                                style={{ padding: '6px 12px' }}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(faq.id)}
                                                className="btn btn-danger"
                                                style={{ padding: '6px 12px' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

        </div>
    );
}

export default FAQsManagement;
