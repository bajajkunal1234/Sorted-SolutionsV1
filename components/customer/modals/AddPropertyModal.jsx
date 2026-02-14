'use client'

import React, { useState } from 'react'
import { X, MapPin, Home, Building2 } from 'lucide-react'

function AddPropertyModal({ isOpen, onClose, onAdd }) {
    const [formData, setFormData] = useState({
        name: '',
        type: 'apartment',
        address: '',
        city: '',
        pincode: '',
        rooms: {
            bedrooms: 2,
            bathrooms: 2,
            kitchen: 1,
            livingRoom: 1,
            other: 0,
        },
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        onAdd({
            ...formData,
            id: Date.now(),
            createdAt: new Date().toISOString(),
        })
        onClose()
        setFormData({
            name: '',
            type: 'apartment',
            address: '',
            city: '',
            pincode: '',
            rooms: { bedrooms: 2, bathrooms: 2, kitchen: 1, livingRoom: 1, other: 0 },
        })
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h3>Add Property</h3>
                    <button onClick={onClose} className="icon-btn">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Property Name */}
                        <div className="form-group">
                            <label className="form-label">Property Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., My Home, Office"
                                required
                            />
                        </div>

                        {/* Property Type */}
                        <div className="form-group">
                            <label className="form-label">Property Type</label>
                            <select
                                className="form-input"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="apartment">Apartment</option>
                                <option value="house">Independent House</option>
                                <option value="villa">Villa</option>
                                <option value="office">Office</option>
                                <option value="shop">Shop</option>
                            </select>
                        </div>

                        {/* Address */}
                        <div className="form-group">
                            <label className="form-label">Address</label>
                            <textarea
                                className="form-input"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Flat/House No., Building Name, Street"
                                rows={2}
                                required
                            />
                        </div>

                        {/* City & Pincode */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-md)' }}>
                            <div className="form-group">
                                <label className="form-label">City</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder="Mumbai"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Pincode</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.pincode}
                                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                    placeholder="400001"
                                    required
                                    maxLength={6}
                                />
                            </div>
                        </div>

                        {/* Rooms */}
                        <div className="form-group">
                            <label className="form-label">Rooms</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-sm)' }}>
                                <div>
                                    <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Bedrooms</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.rooms.bedrooms}
                                        onChange={(e) => setFormData({ ...formData, rooms: { ...formData.rooms, bedrooms: parseInt(e.target.value) } })}
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Bathrooms</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.rooms.bathrooms}
                                        onChange={(e) => setFormData({ ...formData, rooms: { ...formData.rooms, bathrooms: parseInt(e.target.value) } })}
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Kitchen</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.rooms.kitchen}
                                        onChange={(e) => setFormData({ ...formData, rooms: { ...formData.rooms, kitchen: parseInt(e.target.value) } })}
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Living Room</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.rooms.livingRoom}
                                        onChange={(e) => setFormData({ ...formData, rooms: { ...formData.rooms, livingRoom: parseInt(e.target.value) } })}
                                        min="0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Add Property
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AddPropertyModal




