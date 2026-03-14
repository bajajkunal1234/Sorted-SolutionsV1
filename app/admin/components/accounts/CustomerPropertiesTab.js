'use client'

import { useState, useEffect } from 'react';
import { MapPin, Plus, Home, Building2, Loader2, Unlink } from 'lucide-react';

const MUMBAI_LOCALITIES = [
    { name: 'Andheri East', pincode: '400069' },
    { name: 'Andheri West', pincode: '400058' },
    { name: 'Bandra East', pincode: '400051' },
    { name: 'Bandra West', pincode: '400050' },
    { name: 'Borivali East', pincode: '400066' },
    { name: 'Borivali West', pincode: '400092' },
    { name: 'Goregaon East', pincode: '400063' },
    { name: 'Goregaon West', pincode: '400104' },
    { name: 'Juhu', pincode: '400049' },
    { name: 'Kandivali East', pincode: '400101' },
    { name: 'Kandivali West', pincode: '400067' },
    { name: 'Khar West', pincode: '400052' },
    { name: 'Malad East', pincode: '400097' },
    { name: 'Malad West', pincode: '400064' },
    { name: 'Santacruz East', pincode: '400055' },
    { name: 'Santacruz West', pincode: '400054' },
    { name: 'Vile Parle East', pincode: '400057' },
    { name: 'Vile Parle West', pincode: '400056' },
    { name: 'Powai', pincode: '400076' },
    { name: 'Dadar West', pincode: '400028' },
    { name: 'Lower Parel', pincode: '400013' },
    { name: 'Worli', pincode: '400018' },
];

function CustomerPropertiesTab({ customerId }) {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [duplicate, setDuplicate] = useState(null);

    // Form state for adding
    const [newProperty, setNewProperty] = useState({
        flat_number: '',
        building_name: '',
        address: '',
        locality: '',
        city: 'Mumbai',
        pincode: '',
        property_type: 'residential'
    });

    useEffect(() => {
        if (customerId) fetchProperties();
    }, [customerId]);

    const fetchProperties = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/properties?customer_id=${customerId}`);
            const data = await res.json();
            if (data.success) {
                setProperties(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch properties:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLocalityChange = (e) => {
        const localityName = e.target.value;
        const found = MUMBAI_LOCALITIES.find(l => l.name === localityName);
        setNewProperty({
            ...newProperty,
            locality: localityName,
            pincode: found ? found.pincode : ''
        });
    };

    const handleAddProperty = async (forceCreate = false) => {
        if (!newProperty.address.trim()) {
            alert("Street address is required");
            return;
        }
        setSubmitting(true);
        setDuplicate(null);
        try {
            const body = forceCreate ? { ...newProperty, customer_id: customerId, force_create: true } : { ...newProperty, customer_id: customerId };
            const res = await fetch('/api/admin/properties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.duplicate) {
                setDuplicate(data.existing);
                return;
            }
            if (data.success) {
                await fetchProperties();
                setNewProperty({ flat_number: '', building_name: '', address: '', locality: '', city: 'Mumbai', pincode: '', property_type: 'residential' });
                setIsAdding(false);
            } else {
                alert(data.error || 'Failed to add property');
            }
        } catch (error) {
            console.error(error);
            alert('Something went wrong adding the property.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUnlink = async (linkId) => {
        if (!window.confirm('Are you sure you want to unlink this property? Their history will remain intact.')) return;
        try {
            const res = await fetch('/api/admin/properties/unlink', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ link_id: linkId })
            });
            if (res.ok) {
                fetchProperties();
            }
        } catch (error) {
            console.error(error);
            alert("Error unlinking property");
        }
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /> Loading properties...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, margin: 0 }}>
                    Properties
                </h3>
                <button
                    className="btn btn-primary"
                    onClick={() => setIsAdding(true)}
                    style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                >
                    <Plus size={16} />
                    Add Property
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {properties.map(property => (
                    <div
                        key={property.id}
                        style={{
                            padding: 'var(--spacing-md)',
                            backgroundColor: 'var(--bg-elevated)',
                            borderRadius: 'var(--radius-md)',
                            border: `1px solid var(--border-primary)`
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                {property.property_type === 'commercial' ? (
                                    <Building2 size={20} color="var(--color-primary)" />
                                ) : (
                                    <Home size={20} color="var(--color-primary)" />
                                )}
                                <div>
                                    <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                                        {[property.flat_number, property.building_name, property.address].filter(Boolean).join(', ')}
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>
                                        {[property.locality, property.city, property.pincode].filter(Boolean).join(', ')} ({property.property_type || 'residential'})
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleUnlink(property.link_id)}
                                className="btn-icon"
                                title="Unlink Property"
                                style={{ padding: '6px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}
                            >
                                <Unlink size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isAdding && (
                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-sm)'
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Flat / Wing (optional)"
                            value={newProperty.flat_number}
                            onChange={(e) => setNewProperty({ ...newProperty, flat_number: e.target.value })}
                        />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Building Name (optional)"
                            value={newProperty.building_name}
                            onChange={(e) => setNewProperty({ ...newProperty, building_name: e.target.value })}
                        />
                    </div>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Street Address / Area *"
                        value={newProperty.address}
                        onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                        <select className="form-input" value={newProperty.locality} onChange={handleLocalityChange}>
                            <option value="">Select Locality...</option>
                            {MUMBAI_LOCALITIES.map((loc) => (
                                <option key={loc.name} value={loc.name}>{loc.name}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Pincode"
                            value={newProperty.pincode}
                            readOnly
                            style={{ opacity: 0.6 }}
                        />
                    </div>
                    {/* Duplicate warning */}
                    {duplicate && (
                        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>⚠️ This property already exists</div>
                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>
                                {[duplicate.flat_number, duplicate.building_name, duplicate.address].filter(Boolean).join(', ')}<br />
                                {[duplicate.locality, duplicate.city, duplicate.pincode].filter(Boolean).join(', ')}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => { setDuplicate(null); setIsAdding(false); fetchProperties(); }}>OK, noted</button>
                                <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => handleAddProperty(true)}>Create new anyway</button>
                            </div>
                        </div>
                    )}
                    {!duplicate && <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end', marginTop: 10 }}>
                        <button className="btn btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={() => handleAddProperty(false)} disabled={submitting}>
                            {submitting && <Loader2 size={14} className="animate-spin" style={{ marginRight: '6px' }} />}
                            Save Property
                        </button>
                    </div>}
                </div>
            )}

            {properties.length === 0 && !isAdding && (
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
                        No Properties Linked
                    </p>
                    <p style={{ fontSize: 'var(--font-size-sm)' }}>
                        Click Add Property to link a physical address to this customer.
                    </p>
                </div>
            )}
        </div>
    );
}

export default CustomerPropertiesTab;
