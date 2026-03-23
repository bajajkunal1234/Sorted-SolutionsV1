'use client'

import { useState, useEffect, useRef } from 'react';
import { Calculator, Plus, Trash2, Search, Send, FileText, X, ChevronDown, AlertTriangle, Package, Wrench, MessageSquare } from 'lucide-react';
import { inventoryAPI, productLinksAPI } from '@/lib/adminAPI';

// ── Helper ──────────────────────────────────────────────────────────────────
const calcTotals = (items) => {
    const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
    const gst = items.reduce((s, i) => s + (i.qty * i.rate * (i.taxRate || 18)) / 100, 0);
    return { subtotal, gst, total: subtotal + gst };
};

const newRow = (overrides = {}) => ({
    _id: Date.now() + Math.random(),
    inventoryId: null,
    name: '',
    type: 'product', // 'product' | 'service'
    qty: 1,
    rate: 0,
    taxRate: 18,
    isManual: false,
    ...overrides,
});

// ── Sub-component: Item Row ──────────────────────────────────────────────────
function ItemRow({ item, inventory, onUpdate, onRemove, productLinks }) {
    const [search, setSearch] = useState(item.name);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    const filtered = search.length > 0
        ? inventory.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 10)
        : [];

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selectInventoryItem = (inv) => {
        setSearch(inv.name);
        setOpen(false);
        const updated = {
            inventoryId: inv.id,
            name: inv.name,
            type: inv.category?.toLowerCase() === 'service' ? 'service' : 'product',
            rate: inv.sale_price || 0,
            taxRate: inv.tax_rate || 18,
            isManual: false,
        };
        onUpdate(updated);

        // Auto-add linked service if product has one and auto_add is on
        if (updated.type === 'product' && productLinks?.length) {
            const link = productLinks.find(l => l.product_id === inv.id && l.auto_add);
            if (link?.service) {
                // We signal the parent to add the linked service row
                onUpdate({ ...updated, _linkedService: link.service });
            }
        }
    };

    const amount = item.qty * item.rate;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 60px 90px 80px 32px', gap: '6px', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-primary)' }}>
            {/* Type icon */}
            <div title={item.type === 'service' ? 'Service' : 'Product'} style={{ textAlign: 'center', color: item.type === 'service' ? '#8b5cf6' : '#3b82f6' }}>
                {item.type === 'service' ? <Wrench size={14} /> : <Package size={14} />}
            </div>

            {/* Name / search */}
            <div ref={ref} style={{ position: 'relative' }}>
                {item.isManual ? (
                    <input
                        className="form-input"
                        value={item.name}
                        onChange={e => onUpdate({ name: e.target.value })}
                        placeholder="Item description"
                        style={{ padding: '5px 8px', fontSize: '13px', width: '100%' }}
                    />
                ) : (
                    <>
                        <div style={{ position: 'relative' }}>
                            <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                            <input
                                className="form-input"
                                value={search}
                                onChange={e => { setSearch(e.target.value); setOpen(true); onUpdate({ name: e.target.value, inventoryId: null }); }}
                                onFocus={() => setOpen(true)}
                                placeholder="Search inventory..."
                                style={{ padding: '5px 8px 5px 26px', fontSize: '13px', width: '100%' }}
                            />
                        </div>
                        {open && filtered.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', maxHeight: '200px', overflow: 'auto' }}>
                                {filtered.map(inv => (
                                    <div key={inv.id} onMouseDown={() => selectInventoryItem(inv)} style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderBottom: '1px solid var(--border-primary)' }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <span>{inv.name}</span>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>₹{inv.sale_price?.toLocaleString('en-IN') || '0'}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Qty */}
            <input type="number" value={item.qty} min="1" onChange={e => onUpdate({ qty: Math.max(1, parseInt(e.target.value) || 1) })}
                className="form-input" style={{ padding: '5px 6px', fontSize: '13px', textAlign: 'center' }} />

            {/* Rate */}
            <input type="number" value={item.rate} min="0" step="0.01" onChange={e => onUpdate({ rate: parseFloat(e.target.value) || 0 })}
                className="form-input" style={{ padding: '5px 6px', fontSize: '13px', textAlign: 'right' }} />

            {/* Amount */}
            <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>

            {/* Remove */}
            <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', justifyContent: 'center' }}>
                <Trash2 size={14} color="#ef4444" />
            </button>
        </div>
    );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function RepairCalculator({ job, onCreateQuotation, onClose, applianceType }) {
    const [items, setItems] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [productLinks, setProductLinks] = useState([]);
    const [warrantyWarning] = useState(job?.product?.warranty?.status === 'in-warranty' || job?.warranty_status === 'in-warranty');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([inventoryAPI.getAll(), productLinksAPI.getAll()])
            .then(([inv, links]) => {
                setInventory(inv || []);
                setProductLinks(links || []);

                // Pre-populate service charge based on appliance type via product-links
                const defaultItems = [];

                // If there are product-links with auto_add for this appliance type, suggest them
                // Otherwise start with one empty row
                defaultItems.push(newRow({ type: 'service', name: 'Service Charge', rate: 500, isManual: true }));
                setItems(defaultItems);
            })
            .catch(() => {
                setItems([newRow({ type: 'service', name: 'Service Charge', rate: 500, isManual: true })]);
            })
            .finally(() => setLoading(false));
    }, []);

    const updateItem = (idx, changes) => {
        setItems(prev => {
            const next = prev.map((item, i) => i === idx ? { ...item, ...changes } : item);
            // If a linked service was auto-added, append it
            if (changes._linkedService) {
                const svc = changes._linkedService;
                const alreadyExists = next.some(it => it.inventoryId === svc.id);
                if (!alreadyExists) {
                    return [...next, newRow({ inventoryId: svc.id, name: svc.name, type: 'service', rate: svc.sale_price || 0, taxRate: svc.tax_rate || 18, isManual: false })];
                }
            }
            return next;
        });
    };

    const addRow = (type = 'product', manual = false) => {
        setItems(prev => [...prev, newRow({ type, isManual: manual })]);
    };

    const removeRow = (idx) => {
        setItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
    };

    const { subtotal, gst, total } = calcTotals(items);

    const handleWhatsApp = () => {
        const customer = job?.customer || {};
        const phone = customer.mobile || customer.phone || '';
        if (!phone) { alert('No customer phone number on file'); return; }

        const lines = items.map((it, i) => `${i + 1}. ${it.name} × ${it.qty} = ₹${(it.qty * it.rate).toLocaleString('en-IN')}`).join('\n');
        const text = `*Repair Estimate*\nJob: ${job?.job_number || job?.id || ''}\nCustomer: ${customer.name || job?.customer_name || ''}\n\n${lines}\n\nSubtotal: ₹${subtotal.toLocaleString('en-IN')}\nGST: ₹${gst.toFixed(0)}\n*Total: ₹${total.toLocaleString('en-IN')}*\n\nPlease confirm to proceed.`;
        window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleCreateQuotation = () => {
        const quotationItems = items.filter(it => it.name).map(it => ({
            productId: it.inventoryId || null,
            description: it.name,
            qty: it.qty,
            rate: it.rate,
            taxRate: it.taxRate,
            amount: it.qty * it.rate,
            isManual: it.isManual,
        }));
        onCreateQuotation(quotationItems);
    };

    if (loading) return (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading inventory...
        </div>
    );

    return (
        <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '85vh' }}>
            {/* Header */}
            <div style={{ padding: '14px 16px', backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calculator size={18} color="#8b5cf6" />
                    <span style={{ fontWeight: 700, fontSize: '15px' }}>Repair Estimate Calculator</span>
                    {job?.job_number && <span style={{ fontSize: '12px', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '9999px' }}>#{job.job_number}</span>}
                </div>
                {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={18} /></button>}
            </div>

            {/* Warranty warning */}
            {warrantyWarning && (
                <div style={{ padding: '8px 16px', backgroundColor: '#fef3c7', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#92400e' }}>
                    <AlertTriangle size={14} />
                    <strong>Under Warranty</strong> — verify before charging for spare parts
                </div>
            )}

            {/* Items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 60px 90px 80px 32px', gap: '6px', padding: '0 0 6px', borderBottom: '2px solid var(--border-primary)', marginBottom: '4px' }}>
                    <div />
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Item / Product</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', textTransform: 'uppercase' }}>Qty</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right', textTransform: 'uppercase' }}>Rate (₹)</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right', textTransform: 'uppercase' }}>Amount</div>
                    <div />
                </div>

                {items.map((item, idx) => (
                    <ItemRow
                        key={item._id}
                        item={item}
                        inventory={inventory}
                        productLinks={productLinks}
                        onUpdate={(changes) => updateItem(idx, changes)}
                        onRemove={() => removeRow(idx)}
                    />
                ))}

                {/* Add row buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                    <button onClick={() => addRow('product', false)} className="btn btn-secondary" style={{ fontSize: '12px', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Plus size={12} /><Package size={12} /> Add Spare Part
                    </button>
                    <button onClick={() => addRow('service', false)} className="btn btn-secondary" style={{ fontSize: '12px', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Plus size={12} /><Wrench size={12} /> Add Service
                    </button>
                    <button onClick={() => addRow('product', true)} style={{ fontSize: '12px', padding: '5px 12px', border: '1px dashed var(--border-primary)', background: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Plus size={12} /> Manual Entry
                    </button>
                </div>
            </div>

            {/* Totals */}
            <div style={{ padding: '12px 16px', backgroundColor: 'rgba(139,92,246,0.06)', borderTop: '1px solid var(--border-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                    <span style={{ fontWeight: 600 }}>₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>GST</span>
                    <span style={{ fontWeight: 600 }}>₹{gst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-primary)' }}>
                    <span style={{ fontWeight: 700, fontSize: '15px' }}>Total Estimate</span>
                    <span style={{ fontWeight: 700, fontSize: '18px', color: '#8b5cf6' }}>₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
            </div>

            {/* Action Buttons */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-primary)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                    onClick={handleWhatsApp}
                    style={{ flex: '1', padding: '10px', backgroundColor: '#25D366', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minWidth: '140px' }}
                >
                    <MessageSquare size={15} /> Share Estimate
                </button>
                <button
                    onClick={handleCreateQuotation}
                    disabled={items.every(it => !it.name)}
                    style={{ flex: '2', padding: '10px', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minWidth: '160px', opacity: items.every(it => !it.name) ? 0.5 : 1 }}
                >
                    <FileText size={15} /> Customer Approved → Create Quotation
                </button>
            </div>
        </div>
    );
}
