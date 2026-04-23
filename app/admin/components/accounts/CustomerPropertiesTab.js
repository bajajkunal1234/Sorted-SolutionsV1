'use client'

import { useState, useEffect, useRef } from 'react';
import { MapPin, Plus, Home, Building2, Loader2, Unlink, Link2, Search, X, Check } from 'lucide-react';

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
    const [isLinking, setIsLinking] = useState(false);
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

    const handleLinkExisting = async () => {
        if (!duplicate?.id) return;
        setSubmitting(true);
        try {
            const res = await fetch('/api/admin/properties/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer_id: customerId, property_id: duplicate.id })
            });
            const data = await res.json();
            if (data.success) {
                setDuplicate(null);
                setIsAdding(false);
                setNewProperty({ flat_number: '', building_name: '', address: '', locality: '', city: 'Mumbai', pincode: '', property_type: 'residential' });
                await fetchProperties();
            } else {
                alert(data.error || 'Failed to link property');
            }
        } catch (err) {
            console.error(err);
            alert('Something went wrong linking the property.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /> Loading properties...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, margin: 0 }}>
                    Properties
                </h3>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => { setIsLinking(true); setIsAdding(false); }}
                        style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: 5, border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', background: 'rgba(56,189,248,0.08)' }}
                    >
                        <Link2 size={15} />
                        Link Property
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => { setIsAdding(true); setIsLinking(false); }}
                        style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                    >
                        <Plus size={16} />
                        Add Property
                    </button>
                </div>
            </div>

            {/* Link Property Modal */}
            {isLinking && (
                <LinkPropertyModal
                    customerId={customerId}
                    linkedPropertyIds={(properties || []).map(p => p.id)}
                    onClose={() => setIsLinking(false)}
                    onLinked={() => { setIsLinking(false); fetchProperties(); }}
                />
            )}

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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-sm)' }}>
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
                            onChange={(e) => setNewProperty({ ...newProperty, pincode: e.target.value })}
                        />
                        <select 
                            className="form-input" 
                            value={newProperty.property_type || 'residential'} 
                            onChange={(e) => setNewProperty({ ...newProperty, property_type: e.target.value })}
                        >
                            <option value="residential">Residential</option>
                            <option value="commercial">Commercial</option>
                        </select>
                    </div>
                    {duplicate && (
                        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>⚠️ This property already exists</div>
                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 }}>
                                {[duplicate.flat_number, duplicate.building_name, duplicate.address].filter(Boolean).join(', ')}<br />
                                {[duplicate.locality, duplicate.city, duplicate.pincode].filter(Boolean).join(', ')}
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button
                                    className="btn btn-primary"
                                    style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 5 }}
                                    onClick={handleLinkExisting}
                                    disabled={submitting}
                                >
                                    🔗 Link to this customer
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    style={{ fontSize: 12, padding: '6px 10px' }}
                                    onClick={() => handleAddProperty(true)}
                                    disabled={submitting}
                                >
                                    Create new anyway
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    style={{ fontSize: 12, padding: '6px 10px' }}
                                    onClick={() => { setDuplicate(null); setIsAdding(false); fetchProperties(); }}
                                >
                                    Cancel
                                </button>
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

// ─── Link Property Modal ──────────────────────────────────────────────────────
function LinkPropertyModal({ customerId, linkedPropertyIds, onClose, onLinked }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [linking, setLinking] = useState(null); // property id being linked
    const [linked, setLinked] = useState(new Set()); // successfully just linked in this session
    const timerRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, []);

    const doSearch = async (q) => {
        if (!q || q.trim().length < 2) { setResults([]); return; }
        setSearching(true);
        try {
            const url = q.trim()
                ? `/api/admin/properties?q=${encodeURIComponent(q.trim())}&limit=30`
                : `/api/admin/properties?limit=30`;
            const res = await fetch(url);
            const data = await res.json();
            setResults((data.data || []).filter(p => !linkedPropertyIds.includes(p.id) && !linked.has(p.id)));
        } catch (e) {
            console.error(e);
        } finally {
            setSearching(false);
        }
    };

    const handleQueryChange = (val) => {
        setQuery(val);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => doSearch(val), 320);
    };

    const handleLink = async (property) => {
        setLinking(property.id);
        try {
            const res = await fetch('/api/admin/properties/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer_id: customerId, property_id: property.id }),
            });
            const data = await res.json();
            if (data.success) {
                setLinked(prev => new Set([...prev, property.id]));
                setResults(prev => prev.filter(p => p.id !== property.id));
                onLinked(); // refresh parent list (but keep modal open so user can link more)
            } else {
                alert(data.error || 'Failed to link property');
            }
        } catch (e) {
            alert('Something went wrong linking the property.');
        } finally {
            setLinking(null);
        }
    };

    const inputStyle = {
        width: '100%',
        background: 'var(--bg-elevated, rgba(255,255,255,0.06))',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 10,
        padding: '10px 12px 10px 38px',
        color: '#f8fafc',
        fontSize: 14,
        outline: 'none',
        boxSizing: 'border-box',
    };

    return (
        <div
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{ background: 'linear-gradient(180deg,#1e293b,#0f172a)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 16 }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Link2 size={18} color="#38bdf8" />
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>Link Existing Property</span>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8' }}>
                        <X size={14} />
                    </button>
                </div>

                <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                    Search for a property that already exists in the system and link it to this customer.
                </p>

                {/* Search Input */}
                <div style={{ position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => handleQueryChange(e.target.value)}
                        placeholder="Search by building, address, locality, pincode..."
                        style={inputStyle}
                    />
                    {searching && (
                        <Loader2 size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569', animation: 'spin 1s linear infinite' }} />
                    )}
                    {query && !searching && (
                        <button onClick={() => { setQuery(''); setResults([]); }} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center' }}>
                            <X size={13} />
                        </button>
                    )}
                </div>

                {/* Results */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
                    {!searching && query.trim().length >= 2 && results.length === 0 && (
                        <div style={{ padding: '32px 16px', textAlign: 'center', color: '#475569', fontSize: 13 }}>
                            <Home size={32} style={{ margin: '0 auto 10px', opacity: 0.35, display: 'block' }} />
                            No unlisted properties found for "{query}".
                        </div>
                    )}
                    {!query.trim() && (
                        <div style={{ padding: '28px 16px', textAlign: 'center', color: '#475569', fontSize: 13 }}>
                            <Search size={28} style={{ margin: '0 auto 10px', opacity: 0.3, display: 'block' }} />
                            Type at least 2 characters to search properties.
                        </div>
                    )}
                    {results.map(prop => {
                        const isLinkingThis = linking === prop.id;
                        const label = [prop.flat_number, prop.building_name, prop.address].filter(Boolean).join(', ');
                        const sub = [prop.locality, prop.city, prop.pincode].filter(Boolean).join(', ');
                        return (
                            <div key={prop.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: prop.latitude ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <MapPin size={16} color={prop.latitude ? '#10b981' : '#f59e0b'} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{sub}</div>
                                </div>
                                <button
                                    onClick={() => handleLink(prop)}
                                    disabled={isLinkingThis}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 5,
                                        padding: '6px 12px',
                                        background: isLinkingThis ? 'rgba(56,189,248,0.06)' : 'rgba(56,189,248,0.12)',
                                        border: '1px solid rgba(56,189,248,0.3)',
                                        borderRadius: 8,
                                        color: '#38bdf8',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: isLinkingThis ? 'not-allowed' : 'pointer',
                                        flexShrink: 0,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {isLinkingThis ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Link2 size={12} />}
                                    {isLinkingThis ? 'Linking...' : 'Link'}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#94a3b8', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Done</button>
                </div>
            </div>
        </div>
    );
}
