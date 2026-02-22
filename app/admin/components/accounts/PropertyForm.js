'use client'

import { useState } from 'react';
import { Save, X } from 'lucide-react';

function PropertyForm({ customerId, onSave, onClose }) {
    const [formData, setFormData] = useState({
        property_name: '',
        address: {
            line1: '',
            locality: '',
            pincode: '',
            city: 'Agra',
            state: 'Uttar Pradesh'
        }
    });

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.address.line1 || !formData.address.locality || !formData.address.pincode) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);
            const propertyData = {
                ...formData,
                customer_id: customerId
            };
            if (onSave) await onSave(propertyData);
        } catch (err) {
            console.error('Error saving property:', err);
            alert('Failed to save property: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            padding: 'var(--spacing-md)',
            border: '2px solid var(--color-primary)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-secondary)',
            marginTop: 'var(--spacing-sm)'
        }}>
            <h4 style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--spacing-sm)' }}>Add New Property</h4>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                <div className="form-group">
                    <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>Property Name (Optional)</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="e.g., Home, Office, Warehouse"
                        value={formData.property_name}
                        onChange={(e) => setFormData({ ...formData, property_name: e.target.value })}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>Address Line 1 *</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Flat/House No, Building Name"
                        value={formData.address.line1}
                        onChange={(e) => setFormData({
                            ...formData,
                            address: { ...formData.address, line1: e.target.value }
                        })}
                        required
                    />
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                    <div className="form-group">
                        <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>Locality/Area *</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Area name"
                            value={formData.address.locality}
                            onChange={(e) => setFormData({
                                ...formData,
                                address: { ...formData.address, locality: e.target.value }
                            })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>Pincode *</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="6 digits"
                            value={formData.address.pincode}
                            onChange={(e) => setFormData({
                                ...formData,
                                address: { ...formData.address, pincode: e.target.value }
                            })}
                            maxLength={6}
                            required
                        />
                    </div>
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                    <div className="form-group">
                        <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>City</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.address.city}
                            onChange={(e) => setFormData({
                                ...formData,
                                address: { ...formData.address, city: e.target.value }
                            })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>State</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.address.state}
                            onChange={(e) => setFormData({
                                ...formData,
                                address: { ...formData.address, state: e.target.value }
                            })}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-xs)' }}>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : <><Save size={16} /> Save Property</>}
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        <X size={16} /> Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

export default PropertyForm;
