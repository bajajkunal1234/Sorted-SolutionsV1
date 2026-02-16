'use client'

import { useState, useEffect } from 'react';
import { HelpCircle, Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

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
            const res = await fetch('/api/settings/faqs');
            const data = await res.json();
            if (data.success) {
                setFaqs(data.data);
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

    const handleSaveEdit = () => {
        setFaqs(faqs.map(f => f.id === editingId ? editForm : f));
        setEditingId(null);
        setEditForm({});
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this FAQ?')) {
            try {
                const res = await fetch(`/api/settings/faqs?id=${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    setFaqs(faqs.filter(f => f.id !== id));
                }
            } catch (error) {
                console.error('Error deleting FAQ:', error);
            }
        }
    };

    const handleAddFaq = async () => {
        if (newFaq.question && newFaq.answer) {
            try {
                const res = await fetch('/api/settings/faqs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...newFaq, order_index: faqs.length + 1 })
                });
                const data = await res.json();
                if (data.success) {
                    setFaqs([...faqs, data.data]);
                    setNewFaq({ question: '', answer: '', pages: ['Homepage'] });
                    setShowAddForm(false);
                }
            } catch (error) {
                console.error('Error adding FAQ:', error);
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
        setSaving(true);
        try {
            const res = await fetch('/api/settings/faqs', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ faqs })
            });
            const data = await res.json();
            if (data.success) {
                alert('FAQs saved successfully!');
            }
        } catch (error) {
            console.error('Error saving FAQs:', error);
            alert('Failed to save FAQs');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
                <Loader2 className="animate-spin text-primary" size={48} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ marginLeft: '12px', fontSize: '18px', color: 'var(--text-secondary)' }}>Loading FAQs Library...</span>
            </div>
        );
    }

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
                <button
                    onClick={handleSaveAll}
                    disabled={saving}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', padding: '10px 24px' }}
                >
                    {saving ? <Loader2 className="animate-spin" size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18} />}
                    {saving ? 'Saving...' : 'Save All Changes'}
                </button>
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
                {faqs.map((faq) => (
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
                ))}
            </div>

        </div>
    );
}

export default FAQsManagement;
