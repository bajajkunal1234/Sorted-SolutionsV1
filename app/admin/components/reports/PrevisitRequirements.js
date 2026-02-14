'use client'

import { useState } from 'react';
import { Plus, Edit2, Trash2, Search, X, Check, AlertCircle } from 'lucide-react';
import { sampleRequirements, sampleIssues, brands } from '@/lib/data/reportsData';

function PrevisitRequirements() {
    const [requirements, setRequirements] = useState(sampleRequirements);
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterBrand, setFilterBrand] = useState('all');
    const [selectedReq, setSelectedReq] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        productCategory: 'washing-machine',
        brand: 'LG',
        issue: '',
        requirements: [],
        active: true
    });
    const [newItem, setNewItem] = useState({ item: '', quantity: 1, mandatory: true, notes: '' });

    const categories = [
        { id: 'washing-machine', label: 'Washing Machine' },
        { id: 'microwave', label: 'Microwave' },
        { id: 'air-conditioner', label: 'Air Conditioner' },
        { id: 'refrigerator', label: 'Refrigerator' },
        { id: 'water-purifier', label: 'Water Purifier' }
    ];

    const filteredRequirements = requirements.filter(req => {
        const matchesCategory = filterCategory === 'all' || req.productCategory === filterCategory;
        const matchesBrand = filterBrand === 'all' || req.brand === filterBrand;
        return matchesCategory && matchesBrand;
    });

    const handleAddItem = () => {
        if (!newItem.item.trim()) return;
        setFormData({
            ...formData,
            requirements: [...formData.requirements, { ...newItem }]
        });
        setNewItem({ item: '', quantity: 1, mandatory: true, notes: '' });
    };

    const handleRemoveItem = (index) => {
        setFormData({
            ...formData,
            requirements: formData.requirements.filter((_, i) => i !== index)
        });
    };

    const handleSave = () => {
        if (!formData.issue || formData.requirements.length === 0) {
            alert('Please select an issue and add at least one requirement');
            return;
        }

        if (selectedReq) {
            setRequirements(requirements.map(r => r.id === selectedReq.id ? { ...selectedReq, ...formData } : r));
        } else {
            const newReq = {
                id: `req-${Date.now()}`,
                ...formData
            };
            setRequirements([...requirements, newReq]);
        }

        setShowForm(false);
        setSelectedReq(null);
        setFormData({
            productCategory: 'washing-machine',
            brand: 'LG',
            issue: '',
            requirements: [],
            active: true
        });
    };

    const handleEdit = (req) => {
        setSelectedReq(req);
        setFormData({
            productCategory: req.productCategory,
            brand: req.brand,
            issue: req.issue,
            requirements: [...req.requirements],
            active: req.active
        });
        setShowForm(true);
    };

    const handleDelete = (reqId) => {
        if (confirm('Are you sure you want to delete this requirement checklist?')) {
            setRequirements(requirements.filter(r => r.id !== reqId));
        }
    };

    const getCategoryLabel = (catId) => {
        return categories.find(c => c.id === catId)?.label || catId;
    };

    const availableIssues = sampleIssues.filter(i => i.category === formData.productCategory && i.active);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                gap: 'var(--spacing-md)',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, marginBottom: '4px' }}>
                        Pre-visit Requirements
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                        Define tools and parts needed for specific job types
                    </p>
                </div>

                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="form-input"
                    style={{ fontSize: 'var(--font-size-sm)', padding: '6px 10px' }}
                >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                </select>

                <select
                    value={filterBrand}
                    onChange={(e) => setFilterBrand(e.target.value)}
                    className="form-input"
                    style={{ fontSize: 'var(--font-size-sm)', padding: '6px 10px' }}
                >
                    <option value="all">All Brands</option>
                    {brands.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                    ))}
                </select>

                <button
                    className="btn btn-primary"
                    onClick={() => setShowForm(true)}
                    style={{ padding: '6px 16px', fontSize: 'var(--font-size-sm)' }}
                >
                    <Plus size={16} />
                    Add Checklist
                </button>
            </div>

            {/* Requirements List */}
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)' }}>
                {filteredRequirements.length === 0 ? (
                    <div style={{
                        padding: 'var(--spacing-2xl)',
                        textAlign: 'center',
                        color: 'var(--text-tertiary)'
                    }}>
                        No requirement checklists found. Create one to get started.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                        {filteredRequirements.map(req => (
                            <div
                                key={req.id}
                                style={{
                                    backgroundColor: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: 'var(--spacing-md)',
                                    opacity: req.active ? 1 : 0.6
                                }}
                            >
                                {/* Header */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    marginBottom: 'var(--spacing-md)',
                                    paddingBottom: 'var(--spacing-sm)',
                                    borderBottom: '1px solid var(--border-primary)'
                                }}>
                                    <div>
                                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0, marginBottom: '4px' }}>
                                            {getCategoryLabel(req.productCategory)} - {req.brand}
                                        </h4>
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                            Issue: <strong>{req.issue}</strong>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => handleEdit(req)}
                                            style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => handleDelete(req.id)}
                                            style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Requirements List */}
                                <div style={{ display: 'grid', gap: 'var(--spacing-xs)' }}>
                                    {req.requirements.map((item, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--spacing-sm)',
                                                padding: 'var(--spacing-sm)',
                                                backgroundColor: 'var(--bg-secondary)',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: 'var(--font-size-sm)'
                                            }}
                                        >
                                            <div style={{
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                backgroundColor: item.mandatory ? 'var(--color-danger)' : 'var(--color-primary)',
                                                flexShrink: 0
                                            }} />
                                            <div style={{ flex: 1 }}>
                                                <strong>{item.item}</strong>
                                                {item.quantity > 1 && <span style={{ color: 'var(--text-tertiary)' }}> × {item.quantity}</span>}
                                                {item.notes && (
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                                        {item.notes}
                                                    </div>
                                                )}
                                            </div>
                                            {item.mandatory && (
                                                <span style={{
                                                    fontSize: 'var(--font-size-xs)',
                                                    padding: '2px 6px',
                                                    borderRadius: 'var(--radius-sm)',
                                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                    color: 'var(--color-danger)',
                                                    fontWeight: 600
                                                }}>
                                                    Required
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit Form Modal */}
            {showForm && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: 'var(--spacing-md)',
                    overflow: 'auto'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: 'var(--radius-lg)',
                        maxWidth: '700px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <div style={{
                            padding: 'var(--spacing-lg)',
                            borderBottom: '1px solid var(--border-primary)',
                            position: 'sticky',
                            top: 0,
                            backgroundColor: 'var(--bg-primary)',
                            zIndex: 1
                        }}>
                            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0 }}>
                                {selectedReq ? 'Edit' : 'Add'} Requirement Checklist
                            </h3>
                        </div>

                        <div style={{ padding: 'var(--spacing-lg)' }}>
                            {/* Product Category, Brand, Issue */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                        Product Category *
                                    </label>
                                    <select
                                        value={formData.productCategory}
                                        onChange={(e) => setFormData({ ...formData, productCategory: e.target.value, issue: '' })}
                                        className="form-input"
                                        style={{ width: '100%' }}
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                        Brand *
                                    </label>
                                    <select
                                        value={formData.brand}
                                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                        className="form-input"
                                        style={{ width: '100%' }}
                                    >
                                        {brands.map(brand => (
                                            <option key={brand} value={brand}>{brand}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                        Issue *
                                    </label>
                                    <select
                                        value={formData.issue}
                                        onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
                                        className="form-input"
                                        style={{ width: '100%' }}
                                    >
                                        <option value="">Select Issue</option>
                                        {availableIssues.map(issue => (
                                            <option key={issue.id} value={issue.name}>{issue.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Requirements List */}
                            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '8px' }}>
                                    Requirements Checklist
                                </label>

                                {formData.requirements.length > 0 && (
                                    <div style={{ display: 'grid', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-sm)' }}>
                                        {formData.requirements.map((item, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--spacing-sm)',
                                                    padding: 'var(--spacing-sm)',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: 'var(--font-size-sm)'
                                                }}
                                            >
                                                <div style={{ flex: 1 }}>
                                                    <strong>{item.item}</strong> × {item.quantity}
                                                    {item.mandatory && <span style={{ color: 'var(--color-danger)', marginLeft: '4px' }}>*</span>}
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveItem(idx)}
                                                    style={{
                                                        padding: '4px',
                                                        border: 'none',
                                                        background: 'none',
                                                        color: 'var(--color-danger)',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add New Item Form */}
                                <div style={{
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px dashed var(--border-primary)'
                                }}>
                                    <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                        <input
                                            type="text"
                                            value={newItem.item}
                                            onChange={(e) => setNewItem({ ...newItem, item: e.target.value })}
                                            placeholder="Item name (e.g., Multimeter, Screwdriver Set)"
                                            className="form-input"
                                            style={{ width: '100%' }}
                                        />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                            <input
                                                type="number"
                                                value={newItem.quantity}
                                                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                                                min="1"
                                                placeholder="Quantity"
                                                className="form-input"
                                                style={{ width: '100%' }}
                                            />
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                                <input
                                                    type="checkbox"
                                                    id="mandatory-checkbox"
                                                    checked={newItem.mandatory}
                                                    onChange={(e) => setNewItem({ ...newItem, mandatory: e.target.checked })}
                                                    style={{ width: '16px', height: '16px' }}
                                                />
                                                <label htmlFor="mandatory-checkbox" style={{ fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
                                                    Mandatory
                                                </label>
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            value={newItem.notes}
                                            onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                                            placeholder="Notes (optional)"
                                            className="form-input"
                                            style={{ width: '100%' }}
                                        />
                                        <button
                                            className="btn btn-secondary"
                                            onClick={handleAddItem}
                                            disabled={!newItem.item.trim()}
                                            style={{ width: '100%', padding: 'var(--spacing-sm)' }}
                                        >
                                            <Plus size={14} />
                                            Add Item to Checklist
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSave}
                                    style={{ flex: 1, padding: 'var(--spacing-sm)' }}
                                >
                                    <Check size={16} />
                                    {selectedReq ? 'Update' : 'Create'} Checklist
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowForm(false);
                                        setSelectedReq(null);
                                        setFormData({
                                            productCategory: 'washing-machine',
                                            brand: 'LG',
                                            issue: '',
                                            requirements: [],
                                            active: true
                                        });
                                    }}
                                    style={{ padding: 'var(--spacing-sm)' }}
                                >
                                    <X size={16} />
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PrevisitRequirements;
