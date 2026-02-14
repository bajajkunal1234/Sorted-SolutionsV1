'use client'

import React, { useState } from 'react'
import { X, Package, Calendar, Upload, DollarSign } from 'lucide-react'

function AddApplianceModal({ isOpen, onClose, onAdd, properties }) {
    const [formData, setFormData] = useState({
        name: '',
        category: 'air_conditioner',
        brand: '',
        model: '',
        propertyId: properties[0]?.id || '',
        room: '',
        purchaseDate: '',
        purchasePrice: '',
        warrantyYears: 1,
        serialNumber: '',
        notes: '',
    })

    const categories = [
        { value: 'air_conditioner', label: 'Air Conditioner' },
        { value: 'refrigerator', label: 'Refrigerator' },
        { value: 'washing_machine', label: 'Washing Machine' },
        { value: 'microwave', label: 'Microwave' },
        { value: 'tv', label: 'Television' },
        { value: 'water_heater', label: 'Water Heater' },
        { value: 'chimney', label: 'Kitchen Chimney' },
        { value: 'dishwasher', label: 'Dishwasher' },
        { value: 'other', label: 'Other' },
    ]

    const handleSubmit = (e) => {
        e.preventDefault()
        const warrantyExpiry = new Date(formData.purchaseDate)
        warrantyExpiry.setFullYear(warrantyExpiry.getFullYear() + parseInt(formData.warrantyYears))

        onAdd({
            ...formData,
            id: Date.now(),
            warrantyExpiry: warrantyExpiry.toISOString(),
            status: 'healthy',
            createdAt: new Date().toISOString(),
        })
        onClose()
        // Reset form
        setFormData({
            name: '',
            category: 'air_conditioner',
            brand: '',
            model: '',
            propertyId: properties[0]?.id || '',
            room: '',
            purchaseDate: '',
            purchasePrice: '',
            warrantyYears: 1,
            serialNumber: '',
            notes: '',
        })
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
                <div className="modal-header">
                    <h3>Add Appliance</h3>
                    <button onClick={onClose} className="icon-btn">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Appliance Name */}
                        <div className="form-group">
                            <label className="form-label">Appliance Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Living Room AC"
                                required
                            />
                        </div>

                        {/* Category */}
                        <div className="form-group">
                            <label className="form-label">Category</label>
                            <select
                                className="form-input"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                {categories.map((cat) => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Brand & Model */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                            <div className="form-group">
                                <label className="form-label">Brand</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.brand}
                                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                    placeholder="Daikin, Samsung, LG..."
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Model</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.model}
                                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                    placeholder="Model number"
                                    required
                                />
                            </div>
                        </div>

                        {/* Property & Room */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                            <div className="form-group">
                                <label className="form-label">Property</label>
                                <select
                                    className="form-input"
                                    value={formData.propertyId}
                                    onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                                    required
                                >
                                    {properties.map((prop) => (
                                        <option key={prop.id} value={prop.id}>
                                            {prop.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Room</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.room}
                                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                                    placeholder="Living Room, Bedroom..."
                                    required
                                />
                            </div>
                        </div>

                        {/* Purchase Date & Price */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                            <div className="form-group">
                                <label className="form-label">Purchase Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.purchaseDate}
                                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Purchase Price (₹)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.purchasePrice}
                                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                                    placeholder="25000"
                                />
                            </div>
                        </div>

                        {/* Warranty & Serial Number */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                            <div className="form-group">
                                <label className="form-label">Warranty (Years)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.warrantyYears}
                                    onChange={(e) => setFormData({ ...formData, warrantyYears: e.target.value })}
                                    min="0"
                                    max="10"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Serial Number</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.serialNumber}
                                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                                    placeholder="Optional"
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="form-group">
                            <label className="form-label">Notes (Optional)</label>
                            <textarea
                                className="form-input"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Any additional information..."
                                rows={2}
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            <Package size={18} />
                            Add Appliance
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AddApplianceModal




