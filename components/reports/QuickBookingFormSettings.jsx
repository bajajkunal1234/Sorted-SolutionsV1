'use client'

import { useState, useEffect } from 'react';
import {
    Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronRight,
    Eye, EyeOff, GripVertical, Loader, IndianRupee, Check
} from 'lucide-react';

function QuickBookingFormSettings() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedCategories, setExpandedCategories] = useState(new Set());
    const [expandedSubcategories, setExpandedSubcategories] = useState(new Set());
    const [editingItem, setEditingItem] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [newItem, setNewItem] = useState({ type: null, parentId: null, value: '' });

    // ── Visiting Fees ─────────────────────────────────────────────────────────
    const [fees, setFees] = useState([]);     // [{ categoryId, categoryName, fee }]
    const [feesSaving, setFeesSaving] = useState(false);
    const [feesSaveMsg, setFeesSaveMsg] = useState('');

    const loadFees = async () => {
        try {
            const res = await fetch('/api/settings/visiting-fees');
            const data = await res.json();
            if (data.success) setFees(data.data || []);
        } catch (err) {
            console.error('Error loading visiting fees:', err);
        }
    };

    const saveFees = async () => {
        setFeesSaving(true);
        setFeesSaveMsg('');
        try {
            const res = await fetch('/api/settings/visiting-fees', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fees })
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.error);
            setFeesSaveMsg('Saved!');
            setTimeout(() => setFeesSaveMsg(''), 2500);
        } catch (err) {
            setFeesSaveMsg('Save failed: ' + err.message);
        } finally {
            setFeesSaving(false);
        }
    };

    // Sync fee rows whenever categories change (add missing, keep existing values)
    const syncFeesWithCategories = (cats, existingFees) => {
        const updated = cats.map(cat => {
            const existing = existingFees.find(f => f.categoryId === cat.id);
            return existing || { categoryId: cat.id, categoryName: cat.name, fee: '' };
        });
        setFees(updated);
    };

    const handleFeeChange = (categoryId, value) => {
        setFees(prev => prev.map(f => f.categoryId === categoryId ? { ...f, fee: value } : f));
    };

    // Load data from API
    useEffect(() => {
        loadFees();
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [bookingRes, feesRes] = await Promise.all([
                fetch('/api/settings/quick-booking'),
                fetch('/api/settings/visiting-fees')
            ]);
            const bookingData = await bookingRes.json();
            const feesData = await feesRes.json();
            const cats = bookingData.success ? (bookingData.data.categories || []) : [];
            const existingFees = feesData.success ? (feesData.data || []) : [];
            setCategories(cats);
            syncFeesWithCategories(cats, existingFees);
        } catch (error) {
            console.error('Error loading booking form data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Toggle expand/collapse
    const toggleCategory = (categoryId) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(categoryId)) {
            newExpanded.delete(categoryId);
        } else {
            newExpanded.add(categoryId);
        }
        setExpandedCategories(newExpanded);
    };

    const toggleSubcategory = (subcategoryId) => {
        const newExpanded = new Set(expandedSubcategories);
        if (newExpanded.has(subcategoryId)) {
            newExpanded.delete(subcategoryId);
        } else {
            newExpanded.add(subcategoryId);
        }
        setExpandedSubcategories(newExpanded);
    };

    // CRUD Operations
    const handleCreate = async (type, parentId = null) => {
        if (!newItem.value.trim()) return;

        try {
            const payload = {
                type,
                data: {
                    name: newItem.value.trim(),
                    showOnBookingForm: true,
                    displayOrder: 0
                }
            };

            if (type === 'subcategory') payload.data.categoryId = parentId;
            if (type === 'issue') payload.data.subcategoryId = parentId;

            const res = await fetch('/api/settings/quick-booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (result.success) {
                await loadData();
                setNewItem({ type: null, parentId: null, value: '' });
            }
        } catch (error) {
            console.error('Error creating item:', error);
        }
    };

    const handleUpdate = async (type, id, updates) => {
        try {
            const res = await fetch('/api/settings/quick-booking', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, id, data: updates })
            });

            const result = await res.json();
            if (result.success) {
                await loadData();
                setEditingItem(null);
            }
        } catch (error) {
            console.error('Error updating item:', error);
        }
    };

    const handleDelete = async (type, id) => {
        if (!confirm('Are you sure you want to delete this item? This will also delete all nested items.')) {
            return;
        }

        try {
            const res = await fetch('/api/settings/quick-booking', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, id })
            });

            const result = await res.json();
            if (result.success) {
                await loadData();
            }
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    };

    const toggleVisibility = async (type, id, currentVisibility) => {
        await handleUpdate(type, id, { showOnBookingForm: !currentVisibility });
    };

    const startEdit = (type, id, currentName) => {
        setEditingItem({ type, id });
        setEditValue(currentName);
    };

    const saveEdit = async (type, id) => {
        if (editValue.trim()) {
            await handleUpdate(type, id, { name: editValue.trim() });
        }
    };

    const cancelEdit = () => {
        setEditingItem(null);
        setEditValue('');
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
                <Loader className="spin" size={32} />
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                    Quick Booking Form Settings
                </h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                    Manage appliances, appliance types, and issues for the booking form
                </p>
            </div>

            {/* ── Visiting / Diagnosing Fees ── */}
            <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)', border: '2px solid #f59e0b', backgroundColor: '#f59e0b08' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                    <div>
                        <h4 style={{ margin: 0, fontWeight: 600, color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>🔧</span> Visiting / Diagnosing Fees
                        </h4>
                        <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                            Set the fee shown to customers in Step 4 before booking confirmation
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        {feesSaveMsg && (
                            <span style={{ fontSize: 'var(--font-size-sm)', color: feesSaveMsg.startsWith('Save') && !feesSaveMsg.includes('failed') ? 'var(--color-success)' : 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Check size={14} /> {feesSaveMsg}
                            </span>
                        )}
                        <button
                            className="btn btn-primary"
                            onClick={saveFees}
                            disabled={feesSaving}
                            style={{ padding: '6px 16px', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#d97706', borderColor: '#d97706' }}
                        >
                            <Save size={14} /> {feesSaving ? 'Saving…' : 'Save All Fees'}
                        </button>
                    </div>
                </div>

                {fees.length === 0 ? (
                    <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
                        Add appliances below first, then fees will appear here.
                    </p>
                ) : (
                    <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                        {fees.map(f => (
                            <div key={f.categoryId} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-sm) var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                                <span style={{ flex: 1, fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{f.categoryName}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #d97706', borderRadius: 'var(--radius-sm)', overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>
                                    <span style={{ padding: '6px 8px', fontWeight: 700, color: '#d97706', backgroundColor: '#f59e0b15', borderRight: '1px solid #d97706' }}>₹</span>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="e.g. 299"
                                        value={f.fee}
                                        onChange={e => handleFeeChange(f.categoryId, e.target.value)}
                                        style={{ width: '90px', padding: '6px 8px', border: 'none', outline: 'none', fontSize: 'var(--font-size-sm)', backgroundColor: 'transparent' }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add New Category */}
            <div className="card" style={{ padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', backgroundColor: '#3b82f615', border: '2px dashed #3b82f6' }}>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Add new appliance (e.g., Chimney, Dishwasher)"
                        value={newItem.type === 'category' ? newItem.value : ''}
                        onChange={(e) => setNewItem({ type: 'category', parentId: null, value: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && handleCreate('category')}
                        style={{
                            flex: 1,
                            padding: 'var(--spacing-sm)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--font-size-sm)'
                        }}
                    />
                    <button
                        onClick={() => handleCreate('category')}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Plus size={16} />
                        Add Appliance
                    </button>
                </div>
            </div>

            {/* Hierarchical Tree View */}
            <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                {categories.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)' }}>
                        No appliances added yet. Add your first appliance above.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {categories.map((category) => (
                            <div key={category.id}>
                                {/* Category Level */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-sm)',
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: '#3b82f610',
                                    border: '2px solid #3b82f6',
                                    borderRadius: 'var(--radius-md)',
                                    marginBottom: 'var(--spacing-xs)'
                                }}>
                                    <button
                                        onClick={() => toggleCategory(category.id)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                    >
                                        {expandedCategories.has(category.id) ?
                                            <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                    </button>

                                    {editingItem?.type === 'category' && editingItem?.id === category.id ? (
                                        <>
                                            <input
                                                type="text"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && saveEdit('category', category.id)}
                                                style={{
                                                    flex: 1,
                                                    padding: 'var(--spacing-xs)',
                                                    border: '1px solid var(--border-primary)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: 'var(--font-size-sm)'
                                                }}
                                                autoFocus
                                            />
                                            <button onClick={() => saveEdit('category', category.id)} style={{ background: 'none', border: 'none', color: 'var(--color-success)', cursor: 'pointer' }}>
                                                <Save size={16} />
                                            </button>
                                            <button onClick={cancelEdit} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}>
                                                <X size={16} />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ flex: 1, fontWeight: 600, color: '#3b82f6' }}>{category.name}</span>
                                            <button
                                                onClick={() => toggleVisibility('category', category.id, category.showOnBookingForm)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: category.showOnBookingForm ? 'var(--color-success)' : 'var(--text-tertiary)' }}
                                                title={category.showOnBookingForm ? 'Visible on form' : 'Hidden from form'}
                                            >
                                                {category.showOnBookingForm ? <Eye size={16} /> : <EyeOff size={16} />}
                                            </button>
                                            <button onClick={() => startEdit('category', category.id, category.name)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '4px' }}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete('category', category.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* Expanded Category Content */}
                                {expandedCategories.has(category.id) && (
                                    <div style={{ marginLeft: 'var(--spacing-xl)', marginBottom: 'var(--spacing-md)' }}>
                                        {/* Add Subcategory */}
                                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                                            <input
                                                type="text"
                                                placeholder="Add appliance type (e.g., Split AC, Window AC)"
                                                value={newItem.type === 'subcategory' && newItem.parentId === category.id ? newItem.value : ''}
                                                onChange={(e) => setNewItem({ type: 'subcategory', parentId: category.id, value: e.target.value })}
                                                onKeyPress={(e) => e.key === 'Enter' && handleCreate('subcategory', category.id)}
                                                style={{
                                                    flex: 1,
                                                    padding: 'var(--spacing-xs)',
                                                    border: '1px solid #10b981',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: 'var(--font-size-sm)'
                                                }}
                                            />
                                            <button
                                                onClick={() => handleCreate('subcategory', category.id)}
                                                className="btn btn-sm"
                                                style={{ padding: '6px 12px', backgroundColor: '#10b981', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                <Plus size={14} />
                                                Add Type
                                            </button>
                                        </div>

                                        {/* Subcategories */}
                                        {(category.subcategories || []).map((subcategory) => (
                                            <div key={subcategory.id} style={{ marginBottom: 'var(--spacing-sm)' }}>
                                                {/* Subcategory Level */}
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--spacing-sm)',
                                                    padding: 'var(--spacing-sm)',
                                                    backgroundColor: '#10b98110',
                                                    border: '1px solid #10b981',
                                                    borderRadius: 'var(--radius-sm)'
                                                }}>
                                                    <button
                                                        onClick={() => toggleSubcategory(subcategory.id)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                                    >
                                                        {expandedSubcategories.has(subcategory.id) ?
                                                            <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                    </button>

                                                    {editingItem?.type === 'subcategory' && editingItem?.id === subcategory.id ? (
                                                        <>
                                                            <input
                                                                type="text"
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                onKeyPress={(e) => e.key === 'Enter' && saveEdit('subcategory', subcategory.id)}
                                                                style={{
                                                                    flex: 1,
                                                                    padding: 'var(--spacing-xs)',
                                                                    border: '1px solid var(--border-primary)',
                                                                    borderRadius: 'var(--radius-sm)',
                                                                    fontSize: 'var(--font-size-sm)'
                                                                }}
                                                                autoFocus
                                                            />
                                                            <button onClick={() => saveEdit('subcategory', subcategory.id)} style={{ background: 'none', border: 'none', color: 'var(--color-success)', cursor: 'pointer' }}>
                                                                <Save size={14} />
                                                            </button>
                                                            <button onClick={cancelEdit} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}>
                                                                <X size={14} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span style={{ flex: 1, fontWeight: 500, color: '#10b981', fontSize: 'var(--font-size-sm)' }}>{subcategory.name}</span>
                                                            <button
                                                                onClick={() => toggleVisibility('subcategory', subcategory.id, subcategory.showOnBookingForm)}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: subcategory.showOnBookingForm ? 'var(--color-success)' : 'var(--text-tertiary)' }}
                                                            >
                                                                {subcategory.showOnBookingForm ? <Eye size={14} /> : <EyeOff size={14} />}
                                                            </button>
                                                            <button onClick={() => startEdit('subcategory', subcategory.id, subcategory.name)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '4px' }}>
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button onClick={() => handleDelete('subcategory', subcategory.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}>
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Expanded Subcategory Content */}
                                                {expandedSubcategories.has(subcategory.id) && (
                                                    <div style={{ marginLeft: 'var(--spacing-lg)', marginTop: 'var(--spacing-sm)' }}>
                                                        {/* Add Issue */}
                                                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                                                            <input
                                                                type="text"
                                                                placeholder="Add issue (e.g., Not Cooling, Making Noise)"
                                                                value={newItem.type === 'issue' && newItem.parentId === subcategory.id ? newItem.value : ''}
                                                                onChange={(e) => setNewItem({ type: 'issue', parentId: subcategory.id, value: e.target.value })}
                                                                onKeyPress={(e) => e.key === 'Enter' && handleCreate('issue', subcategory.id)}
                                                                style={{
                                                                    flex: 1,
                                                                    padding: 'var(--spacing-xs)',
                                                                    border: '1px solid #f59e0b',
                                                                    borderRadius: 'var(--radius-sm)',
                                                                    fontSize: 'var(--font-size-xs)'
                                                                }}
                                                            />
                                                            <button
                                                                onClick={() => handleCreate('issue', subcategory.id)}
                                                                className="btn btn-sm"
                                                                style={{ padding: '4px 10px', backgroundColor: '#f59e0b', color: 'white', display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-xs)' }}
                                                            >
                                                                <Plus size={12} />
                                                                Add Issue
                                                            </button>
                                                        </div>

                                                        {/* Issues */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            {(subcategory.issues || []).map((issue) => (
                                                                <div key={issue.id} style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 'var(--spacing-xs)',
                                                                    padding: '6px var(--spacing-sm)',
                                                                    backgroundColor: '#f59e0b10',
                                                                    border: '1px solid #f59e0b',
                                                                    borderRadius: 'var(--radius-sm)'
                                                                }}>
                                                                    {editingItem?.type === 'issue' && editingItem?.id === issue.id ? (
                                                                        <>
                                                                            <input
                                                                                type="text"
                                                                                value={editValue}
                                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                                onKeyPress={(e) => e.key === 'Enter' && saveEdit('issue', issue.id)}
                                                                                style={{
                                                                                    flex: 1,
                                                                                    padding: 'var(--spacing-xs)',
                                                                                    border: '1px solid var(--border-primary)',
                                                                                    borderRadius: 'var(--radius-sm)',
                                                                                    fontSize: 'var(--font-size-xs)'
                                                                                }}
                                                                                autoFocus
                                                                            />
                                                                            <button onClick={() => saveEdit('issue', issue.id)} style={{ background: 'none', border: 'none', color: 'var(--color-success)', cursor: 'pointer' }}>
                                                                                <Save size={12} />
                                                                            </button>
                                                                            <button onClick={cancelEdit} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}>
                                                                                <X size={12} />
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <span style={{ flex: 1, color: '#f59e0b', fontSize: 'var(--font-size-xs)' }}>{issue.name}</span>
                                                                            <button
                                                                                onClick={() => toggleVisibility('issue', issue.id, issue.showOnBookingForm)}
                                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: issue.showOnBookingForm ? 'var(--color-success)' : 'var(--text-tertiary)' }}
                                                                            >
                                                                                {issue.showOnBookingForm ? <Eye size={12} /> : <EyeOff size={12} />}
                                                                            </button>
                                                                            <button onClick={() => startEdit('issue', issue.id, issue.name)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '2px' }}>
                                                                                <Edit2 size={12} />
                                                                            </button>
                                                                            <button onClick={() => handleDelete('issue', issue.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '2px' }}>
                                                                                <Trash2 size={12} />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default QuickBookingFormSettings;
