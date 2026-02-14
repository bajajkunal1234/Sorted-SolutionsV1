'use client'

import { useState } from 'react';
import { MapPin, Plus, Edit2, Trash2, Check, Home, Building2 } from 'lucide-react';
import { customerProperties } from '@/lib/data/rentalsAmcData';

function CustomerPropertiesTab({ customerId }) {
    const [properties, setProperties] = useState(
        customerProperties.filter(p => p.customerId === customerId)
    );
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const handleSetPrimary = (propertyId) => {
        setProperties(properties.map(p => ({
            ...p,
            isPrimary: p.id === propertyId
        })));
    };

    const handleDelete = (propertyId) => {
        if (properties.length === 1) {
            alert('Cannot delete the only address');
            return;
        }
        if (window.confirm('Are you sure you want to delete this address?')) {
            setProperties(properties.filter(p => p.id !== propertyId));
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, margin: 0 }}>
                    Customer Addresses
                </h3>
                <button
                    className="btn btn-primary"
                    onClick={() => setIsAdding(true)}
                    style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                >
                    <Plus size={16} />
                    Add Address
                </button>
            </div>

            {/* Properties List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {properties.map(property => (
                    <div
                        key={property.id}
                        style={{
                            padding: 'var(--spacing-md)',
                            backgroundColor: 'var(--bg-elevated)',
                            borderRadius: 'var(--radius-md)',
                            border: `2px solid ${property.isPrimary ? 'var(--color-primary)' : 'var(--border-primary)'}`
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                {property.propertyType === 'residential' ? (
                                    <Home size={20} color="var(--color-primary)" />
                                ) : (
                                    <Building2 size={20} color="var(--color-primary)" />
                                )}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                        <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                                            {property.label}
                                        </span>
                                        {property.isPrimary && (
                                            <span style={{
                                                padding: '2px 6px',
                                                backgroundColor: 'var(--color-primary)',
                                                color: 'white',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: 'var(--font-size-xs)',
                                                fontWeight: 600
                                            }}>
                                                PRIMARY
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>
                                        {property.propertyType}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                {!property.isPrimary && (
                                    <button
                                        onClick={() => handleSetPrimary(property.id)}
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: 'var(--font-size-xs)',
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-sm)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Check size={14} style={{ marginRight: '4px' }} />
                                        Set Primary
                                    </button>
                                )}
                                <button
                                    onClick={() => setEditingId(property.id)}
                                    className="btn-icon"
                                    style={{ padding: '4px' }}
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    onClick={() => handleDelete(property.id)}
                                    className="btn-icon"
                                    style={{ padding: '4px' }}
                                    disabled={properties.length === 1}
                                >
                                    <Trash2 size={14} color={properties.length > 1 ? '#ef4444' : 'var(--text-tertiary)'} />
                                </button>
                            </div>
                        </div>

                        {/* Address Details */}
                        <div style={{
                            padding: 'var(--spacing-sm)',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 'var(--font-size-sm)',
                            lineHeight: 1.6,
                            marginBottom: 'var(--spacing-sm)'
                        }}>
                            <div>{property.address.line1}</div>
                            {property.address.line2 && <div>{property.address.line2}</div>}
                            <div>{property.address.area}, {property.address.city}</div>
                            <div>{property.address.state} - {property.address.pincode}</div>
                            {property.address.landmark && (
                                <div style={{ color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                    Landmark: {property.address.landmark}
                                </div>
                            )}
                        </div>

                        {/* Contact & Access Info */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Contact Person</div>
                                <div style={{ fontWeight: 500 }}>{property.contactPerson}</div>
                                <div style={{ color: 'var(--text-secondary)' }}>{property.contactPhone}</div>
                            </div>
                            {property.accessInstructions && (
                                <div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Access Instructions</div>
                                    <div style={{ color: 'var(--text-secondary)' }}>{property.accessInstructions}</div>
                                </div>
                            )}
                        </div>

                        {/* Installed Products */}
                        {property.installedProducts && property.installedProducts.length > 0 && (
                            <div style={{
                                marginTop: 'var(--spacing-sm)',
                                padding: 'var(--spacing-sm)',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 'var(--font-size-xs)'
                            }}>
                                <div style={{ color: 'var(--text-tertiary)', marginBottom: '4px' }}>Installed Products/Services</div>
                                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                                    {property.installedProducts.map(productId => (
                                        <span
                                            key={productId}
                                            style={{
                                                padding: '2px 6px',
                                                backgroundColor: 'var(--color-primary)',
                                                color: 'white',
                                                borderRadius: 'var(--radius-sm)',
                                                fontWeight: 500
                                            }}
                                        >
                                            {productId}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {properties.length === 0 && (
                <div style={{
                    padding: 'var(--spacing-xl)',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)',
                    border: '2px dashed var(--border-primary)'
                }}>
                    <MapPin size={48} style={{ margin: '0 auto var(--spacing-md)', opacity: 0.5 }} />
                    <p style={{ fontSize: 'var(--font-size-md)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                        No Addresses Added
                    </p>
                    <p style={{ fontSize: 'var(--font-size-sm)' }}>
                        Add customer addresses for service and delivery locations
                    </p>
                </div>
            )}
        </div>
    );
}

export default CustomerPropertiesTab;
