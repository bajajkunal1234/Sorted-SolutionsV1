'use client'

import { useState, useEffect, useRef } from 'react';
import { HelpCircle, Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react';

function FAQsManagement() {
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newFaq, setNewFaq] = useState({ question: '', answer: '', category: 'General' });
    const [expandedId, setExpandedId] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ── Load FAQs from Supabase ──
    useEffect(() => {
        fetchFaqs();
    }, []);

    const fetchFaqs = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/settings/faqs');
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to load');
            setFaqs(data.data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Add FAQ ──
    const handleAddFaq = async () => {
        if (!newFaq.question.trim() || !newFaq.answer.trim()) return;
        setSaving(true);
        try {
            const res = await fetch('/api/settings/faqs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: newFaq.question.trim(),
                    answer: newFaq.answer.trim(),
                    category: newFaq.category || 'General',
                    display_order: faqs.length + 1,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to add FAQ');
            setFaqs(prev => [...prev, data.data]);
            setNewFaq({ question: '', answer: '', category: 'General' });
            setShowAddForm(false);
            showToast('FAQ added successfully!');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Save Edit ──
    const handleSaveEdit = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings/faqs', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingId,
                    question: editForm.question,
                    answer: editForm.answer,
                    category: editForm.category || 'General',
                    display_order: editForm.display_order,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to update FAQ');
            setFaqs(faqs.map(f => f.id === editingId ? data.data : f));
            setEditingId(null);
            setEditForm({});
            showToast('FAQ updated!');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Delete FAQ ──
    const handleDelete = async (id) => {
        if (!confirm('Delete this FAQ?')) return;
        try {
            const res = await fetch(`/api/settings/faqs?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to delete');
            setFaqs(faqs.filter(f => f.id !== id));
            showToast('FAQ deleted.');
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 40 }}>
            <Loader2 className="animate-spin" size={24} style={{ color: 'var(--color-primary)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Loading FAQs...</span>
        </div>
    );

    if (error) return (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
            <AlertCircle size={36} color="#ef4444" />
            <p style={{ color: '#ef4444', marginTop: 12 }}>Error: {error}</p>
            <button className="btn btn-secondary" onClick={fetchFaqs} style={{ marginTop: 12 }}>Retry</button>
        </div>
    );

    const categories = ['General', 'Booking', 'Payment', 'Service', 'Warranty', 'Other'];

    return (
        <div style={{ position: 'relative' }}>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 9999,
                    padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14,
                    backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981',
                    color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}>
                    {toast.type === 'error' ? '❌ ' : '✅ '}{toast.msg}
                </div>
            )}

            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                    Global FAQ Library
                </h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                    {faqs.length} FAQ{faqs.length !== 1 ? 's' : ''} in your library · Changes save immediately to Supabase
                </p>
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
                    <h4 style={{ marginBottom: 'var(--spacing-md)', fontWeight: 600 }}>New FAQ</h4>
                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Question *</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="e.g., What is your service area?"
                                value={newFaq.question}
                                onChange={e => setNewFaq({ ...newFaq, question: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Answer *</label>
                            <textarea
                                className="form-control"
                                placeholder="Enter the answer..."
                                value={newFaq.answer}
                                onChange={e => setNewFaq({ ...newFaq, answer: e.target.value })}
                                rows={4}
                                style={{ resize: 'vertical' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Category</label>
                            <select
                                className="form-control"
                                value={newFaq.category}
                                onChange={e => setNewFaq({ ...newFaq, category: e.target.value })}
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                        <button
                            onClick={handleAddFaq}
                            className="btn btn-primary"
                            disabled={!newFaq.question.trim() || !newFaq.answer.trim() || saving}
                            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            {saving ? 'Saving...' : 'Add FAQ'}
                        </button>
                        <button onClick={() => { setShowAddForm(false); setNewFaq({ question: '', answer: '', category: 'General' }); }} className="btn btn-secondary">
                            <X size={16} /> Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* FAQs List */}
            {faqs.length === 0 && !showAddForm && (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <HelpCircle size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <p>No FAQs yet. Click "Add New FAQ" to get started.</p>
                </div>
            )}

            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                {faqs.map((faq) => (
                    <div
                        key={faq.id}
                        className="card"
                        style={{ padding: 'var(--spacing-lg)', border: editingId === faq.id ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)' }}
                    >
                        {editingId === faq.id ? (
                            <div>
                                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Question</label>
                                        <input type="text" className="form-control" value={editForm.question} onChange={e => setEditForm({ ...editForm, question: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Answer</label>
                                        <textarea className="form-control" value={editForm.answer} onChange={e => setEditForm({ ...editForm, answer: e.target.value })} rows={4} style={{ resize: 'vertical' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Category</label>
                                        <select className="form-control" value={editForm.category || 'General'} onChange={e => setEditForm({ ...editForm, category: e.target.value })}>
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                                    <button onClick={handleSaveEdit} className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save
                                    </button>
                                    <button onClick={() => { setEditingId(null); setEditForm({}); }} className="btn btn-secondary"><X size={16} /> Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-start' }}>
                                <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#f9731615', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <HelpCircle size={20} style={{ color: '#f97316' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: '0 0 4px 0' }}>{faq.question}</h4>
                                    {faq.category && (
                                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, backgroundColor: '#6366f115', color: '#6366f1', border: '1px solid #6366f130', fontWeight: 500 }}>
                                            {faq.category}
                                        </span>
                                    )}
                                    {expandedId === faq.id && (
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 10, lineHeight: 1.6 }}>{faq.answer}</p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                    <button onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)} className="btn btn-secondary" style={{ padding: '6px 10px' }}>
                                        {expandedId === faq.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                    </button>
                                    <button onClick={() => { setEditingId(faq.id); setEditForm({ ...faq }); }} className="btn btn-secondary" style={{ padding: '6px 10px' }}>
                                        <Edit2 size={15} />
                                    </button>
                                    <button onClick={() => handleDelete(faq.id)} className="btn btn-danger" style={{ padding: '6px 10px' }}>
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <style jsx>{`
                .form-control {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid var(--border-primary);
                    border-radius: var(--radius-md);
                    font-size: var(--font-size-sm);
                    background-color: var(--bg-elevated);
                    color: var(--text-primary);
                    transition: border-color 0.2s;
                    box-sizing: border-box;
                }
                .form-control:focus { outline: none; border-color: var(--color-primary); }
                .btn-danger {
                    background-color: #ef444415;
                    color: #ef4444;
                    border: 1px solid #ef444430;
                    padding: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                }
                .btn-danger:hover { background-color: #ef444425; }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

export default FAQsManagement;
