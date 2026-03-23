'use client'

import { useState, useEffect } from 'react';
import { Link2, Trash2, Plus, Loader2, Package, Zap, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import { inventoryAPI, productLinksAPI } from '@/lib/adminAPI';

function ComboProductsLinking() {
    const [links, setLinks] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const [selectedProduct, setSelectedProduct] = useState('');
    const [selectedService, setSelectedService] = useState('');
    const [notes, setNotes] = useState('');

    const products  = inventory.filter(i => i.type === 'product' || !i.type || i.type === 'product');
    const services  = inventory.filter(i => i.type === 'service');

    const load = async () => {
        try {
            setLoading(true);
            const [linksData, invData] = await Promise.all([
                productLinksAPI.getAll(),
                inventoryAPI.getAll(),
            ]);
            setLinks(linksData || []);
            setInventory(invData || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleCreate = async () => {
        if (!selectedProduct || !selectedService) {
            setError('Please select both a product and a service.');
            return;
        }
        if (selectedProduct === selectedService) {
            setError('Product and service cannot be the same item.');
            return;
        }
        // prevent duplicate
        const alreadyLinked = links.some(
            l => l.product?.id === selectedProduct && l.service?.id === selectedService
        );
        if (alreadyLinked) {
            setError('This product-service combo already exists.');
            return;
        }

        try {
            setSaving(true);
            setError(null);
            const created = await productLinksAPI.create(selectedProduct, selectedService, notes);
            setLinks(prev => [created, ...prev]);
            setSelectedProduct('');
            setSelectedService('');
            setNotes('');
        } catch (err) {
            setError('Failed to create link: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Remove this product-service link?')) return;
        try {
            await productLinksAPI.delete(id);
            setLinks(prev => prev.filter(l => l.id !== id));
        } catch (err) {
            setError('Failed to delete: ' + err.message);
        }
    };

    const handleToggleAutoAdd = async (link) => {
        try {
            await productLinksAPI.toggleAutoAdd(link.id, !link.auto_add);
            setLinks(prev => prev.map(l => l.id === link.id ? { ...l, auto_add: !l.auto_add } : l));
        } catch (err) {
            setError('Failed to update: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px', color: 'var(--text-secondary)' }}>
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                Loading links...
            </div>
        );
    }

    return (
        <div style={{ padding: 'var(--spacing-lg)', maxWidth: '900px', margin: '0 auto' }}>

            {/* Header */}
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Link2 size={18} style={{ color: 'white' }} />
                    </div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Combo Products Linking</h2>
                </div>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', margin: 0 }}>
                    Link a <strong>product</strong> to a <strong>service</strong>. When the product is added to a sales invoice or quotation, the linked service charge will be <strong>auto-added</strong> automatically.
                </p>
            </div>

            {/* Error Banner */}
            {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', marginBottom: 'var(--spacing-md)', color: '#ef4444', fontSize: '13px' }}>
                    <AlertCircle size={15} />
                    {error}
                    <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
                </div>
            )}

            {/* Create Form */}
            <div style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, margin: '0 0 12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Create New Link</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
                    {/* Product Selector */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px', color: 'var(--text-tertiary)' }}>
                            <Package size={11} style={{ display: 'inline', marginRight: '4px' }} />Product
                        </label>
                        <select
                            className="form-input"
                            value={selectedProduct}
                            onChange={e => { setSelectedProduct(e.target.value); setError(null); }}
                            style={{ width: '100%' }}
                        >
                            <option value="">— Select Product —</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ''}</option>
                            ))}
                        </select>
                    </div>

                    {/* Arrow */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', paddingTop: '18px', color: 'var(--text-tertiary)' }}>
                        <Link2 size={20} style={{ color: '#6366f1' }} />
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>auto-adds</span>
                    </div>

                    {/* Service Selector */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px', color: 'var(--text-tertiary)' }}>
                            <Zap size={11} style={{ display: 'inline', marginRight: '4px' }} />Service Charge
                        </label>
                        <select
                            className="form-input"
                            value={selectedService}
                            onChange={e => { setSelectedService(e.target.value); setError(null); }}
                            style={{ width: '100%' }}
                        >
                            <option value="">— Select Service —</option>
                            {services.map(s => (
                                <option key={s.id} value={s.id}>{s.name}{s.sale_price ? ` — ₹${s.sale_price}` : ''}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Notes + Create */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Notes (optional)"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        style={{ flex: 1, fontSize: '13px' }}
                    />
                    <button
                        onClick={handleCreate}
                        disabled={saving || !selectedProduct || !selectedService}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '8px 18px', backgroundColor: '#6366f1', color: 'white',
                            border: 'none', borderRadius: '8px', cursor: saving || !selectedProduct || !selectedService ? 'not-allowed' : 'pointer',
                            fontWeight: 600, fontSize: '13px', opacity: saving || !selectedProduct || !selectedService ? 0.6 : 1,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        Link
                    </button>
                </div>

                {services.length === 0 && !loading && (
                    <p style={{ fontSize: '12px', color: '#f59e0b', marginTop: '8px', marginBottom: 0 }}>
                        ⚠ No services found in inventory. Add services first via the Inventory tab.
                    </p>
                )}
            </div>

            {/* Links Table */}
            <div style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, margin: 0 }}>
                        Existing Links <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>({links.length})</span>
                    </h3>
                </div>

                {links.length === 0 ? (
                    <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                        No links created yet. Use the form above to link a product to a service.
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product</th>
                                <th style={{ padding: '10px 4px', textAlign: 'center', fontSize: '11px', color: 'var(--text-tertiary)' }}></th>
                                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Auto-adds Service</th>
                                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Auto-Add</th>
                                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {links.map(link => (
                                <tr key={link.id} style={{ borderBottom: '1px solid var(--border-primary)' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>

                                    <td style={{ padding: '10px 14px' }}>
                                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{link.product?.name || '—'}</div>
                                        {link.product?.sku && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{link.product.sku}</div>}
                                    </td>

                                    <td style={{ padding: '10px 4px', textAlign: 'center' }}>
                                        <Link2 size={14} style={{ color: '#6366f1' }} />
                                    </td>

                                    <td style={{ padding: '10px 14px' }}>
                                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#10b981' }}>{link.service?.name || '—'}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', gap: '6px' }}>
                                            {link.service?.sale_price && <span>₹{link.service.sale_price}</span>}
                                            {link.service?.gst_rate && <span>GST {link.service.gst_rate}%</span>}
                                            {link.notes && <span>· {link.notes}</span>}
                                        </div>
                                    </td>

                                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleToggleAutoAdd(link)}
                                            title={link.auto_add ? 'Auto-add is ON — click to disable' : 'Auto-add is OFF — click to enable'}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto', color: link.auto_add ? '#10b981' : 'var(--text-tertiary)' }}
                                        >
                                            {link.auto_add
                                                ? <ToggleRight size={26} />
                                                : <ToggleLeft size={26} />
                                            }
                                        </button>
                                    </td>

                                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleDelete(link.id)}
                                            title="Remove link"
                                            style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', padding: '5px 8px', display: 'flex', alignItems: 'center', margin: 'auto' }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default ComboProductsLinking;
