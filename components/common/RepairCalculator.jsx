'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Minus, X, Package, Wrench, ShoppingCart, MessageSquare, FileText, ChevronUp, ChevronDown, AlertTriangle, PenLine } from 'lucide-react';
import { inventoryAPI, productLinksAPI } from '@/lib/adminAPI';

// ── Price resolution ─────────────────────────────────────────────────────────
// priceType: 'sale' | 'dealer' | 'mrp' | 'custom'
const getPrice = (b) => {
    if (b.priceType === 'dealer')  return (b.dealer_price  != null && b.dealer_price  > 0) ? b.dealer_price  : (b.sale_price || 0);
    if (b.priceType === 'mrp')    return (b.retail_price   != null && b.retail_price   > 0) ? b.retail_price  : (b.sale_price || 0);
    if (b.priceType === 'custom') return b.customPrice || 0;
    return b.sale_price || 0; // default: sale
};

const fmt = (n) => (n || 0).toLocaleString('en-IN');

export default function RepairCalculator({ job, onCreateQuotation, onCreateInvoice, onApply, onClose }) {
    const [inventory, setInventory]       = useState([]);
    const [productLinks, setProductLinks] = useState([]);
    const [loading, setLoading]           = useState(true);
    const [search, setSearch]             = useState('');
    const [filter, setFilter]             = useState('all'); // 'all' | 'product' | 'service'
    const [basket, setBasket]             = useState([]); // { ...item, qty, priceType, customPrice }
    const [basketOpen, setBasketOpen]     = useState(false);
    const [showManual, setShowManual]     = useState(false);
    const [manualItem, setManualItem]     = useState({ name: '', rate: '', type: 'product' });

    const warrantyWarning =
        job?.product?.warranty?.status === 'in-warranty' ||
        job?.warranty_status === 'in-warranty';

    useEffect(() => {
        Promise.all([inventoryAPI.getAll(), productLinksAPI.getAll().catch(() => [])])
            .then(([inv, links]) => {
                setInventory(inv || []);
                setProductLinks(links || []);
            })
            .finally(() => setLoading(false));
    }, []);

    // ── Basket helpers ────────────────────────────────────────────────────────
    const addToBasket = (item) => {
        setBasket(prev => {
            const exists = prev.find(b => b.id === item.id);
            if (exists) return prev.map(b => b.id === item.id ? { ...b, qty: b.qty + 1 } : b);

            const newItem = { ...item, qty: 1, priceType: 'sale', customPrice: item.sale_price || 0 };
            const added = [newItem];

            // Auto-link service if product has one
            const link = productLinks.find(l => l.product_id === item.id && l.auto_add && l.service);
            const alreadyLinked = link && prev.some(b => b.id === link.service.id);
            if (link && !alreadyLinked) {
                added.push({
                    ...link.service,
                    id: link.service.id,
                    name: link.service.name,
                    sale_price: link.service.sale_price || 0,
                    tax_rate: link.service.tax_rate || 18,
                    itemType: 'service',
                    qty: 1,
                    priceType: 'sale',
                    customPrice: link.service.sale_price || 0,
                    autoLinked: true,
                });
            }
            return [...prev, ...added];
        });
    };

    const changeQty = (id, delta) =>
        setBasket(prev =>
            prev.map(b => b.id === id ? { ...b, qty: b.qty + delta } : b)
                .filter(b => b.qty > 0)
        );

    const removeFromBasket = (id) => setBasket(prev => prev.filter(b => b.id !== id));

    // Update price type for a basket item
    const setPriceType = (id, type) =>
        setBasket(prev => prev.map(b => b.id === id ? { ...b, priceType: type } : b));

    // Update custom price for a basket item
    const setCustomPrice = (id, val) =>
        setBasket(prev => prev.map(b => b.id === id ? { ...b, customPrice: val } : b));

    const addManual = () => {
        if (!manualItem.name.trim() || !manualItem.rate) return;
        const rate = parseFloat(manualItem.rate) || 0;
        const id = `manual-${Date.now()}`;
        setBasket(prev => [...prev, {
            id,
            name: manualItem.name,
            sale_price: rate,
            dealer_price: null,
            retail_price: null,
            tax_rate: 18,
            itemType: manualItem.type,
            qty: 1,
            priceType: 'sale',
            customPrice: rate,
            isManual: true,
        }]);
        setManualItem({ name: '', rate: '', type: 'product' });
        setShowManual(false);
    };

    // ── Totals (use resolved price per item) ──────────────────────────────────
    const subtotal  = basket.reduce((s, b) => s + b.qty * getPrice(b), 0);
    const gst       = basket.reduce((s, b) => s + b.qty * getPrice(b) * (b.tax_rate || 18) / 100, 0);
    const total     = subtotal + gst;
    const itemCount = basket.reduce((s, b) => s + b.qty, 0);

    // ── Filtered item list ────────────────────────────────────────────────────
    const visible = inventory.filter(item => {
        const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
        const isService   = item.type === 'service' || item.product_type === 'service';
        const matchFilter = filter === 'all' || (filter === 'service' ? isService : !isService);
        return matchSearch && matchFilter;
    });

    // ── Actions ───────────────────────────────────────────────────────────────
    const handleWhatsApp = () => {
        const phone = job?.customer?.mobile || job?.customer?.phone || '';
        if (!phone) { alert('No customer phone number found'); return; }
        const lines = basket
            .map((b, i) => `${i + 1}. ${b.name} × ${b.qty} = ₹${fmt(b.qty * getPrice(b))}`)
            .join('\n');
        const text = `*Repair Estimate*\nJob: ${job?.job_number || ''}\n\n${lines}\n\nSubtotal: ₹${fmt(subtotal)}\nGST: ₹${fmt(Math.round(gst))}\n*Total: ₹${fmt(Math.round(total))}*\n\nPlease confirm to proceed.`;
        window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    };

    const buildItems = () => basket.map(b => ({
        productId:   b.isManual ? null : b.id,
        description: b.name,
        type:        (b.itemType === 'service' || b.type === 'service' || b.product_type === 'service') ? 'service' : 'product',
        qty:         b.qty,
        rate:        getPrice(b),      // ← uses the user-selected price type
        taxRate:     b.tax_rate || 18,
    }));

    const handleCreateQuotation = () => onCreateQuotation(buildItems());
    const handleCreateInvoice   = () => onCreateInvoice(buildItems());

    // ── Styles ────────────────────────────────────────────────────────────────
    const pillStyle = (active) => ({
        padding: '6px 14px', border: 'none', borderRadius: '9999px', cursor: 'pointer',
        fontSize: '13px', fontWeight: 600,
        backgroundColor: active ? 'var(--color-primary)' : 'var(--bg-secondary)',
        color: active ? '#fff' : 'var(--text-secondary)', transition: 'all 0.15s',
    });

    // ── Price-type pill row for each basket item ──────────────────────────────
    const PRICE_OPTS = [
        { key: 'sale',   label: 'Sales',  field: 'sale_price'   },
        { key: 'dealer', label: 'Dealer', field: 'dealer_price'  },
        { key: 'mrp',    label: 'MRP',    field: 'retail_price'  },
        { key: 'custom', label: 'Custom', field: null            },
    ];

    const PricePills = ({ b }) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '5px' }}>
            {PRICE_OPTS.map(opt => {
                const rawVal = opt.field ? b[opt.field] : null;
                const available = opt.key === 'custom' || (rawVal != null && rawVal > 0);
                const isActive  = b.priceType === opt.key;

                return (
                    <button
                        key={opt.key}
                        disabled={!available}
                        onClick={() => setPriceType(b.id, opt.key)}
                        title={!available ? `No ${opt.label} price set` : `Use ${opt.label} price${rawVal != null ? ` (₹${fmt(rawVal)})` : ''}`}
                        style={{
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--border-primary)'}`,
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: available ? 'pointer' : 'not-allowed',
                            opacity: available ? 1 : 0.3,
                            backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                            color: isActive ? '#fff' : 'var(--text-secondary)',
                            transition: 'all 0.12s',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {opt.label}{rawVal != null && rawVal > 0 ? ` ₹${fmt(rawVal)}` : ''}
                    </button>
                );
            })}

            {/* Custom price input — shown only when Custom is selected */}
            {b.priceType === 'custom' && (
                <input
                    type="number"
                    min="0"
                    value={b.customPrice || ''}
                    onChange={e => setCustomPrice(b.id, parseFloat(e.target.value) || 0)}
                    placeholder="Enter ₹"
                    onClick={e => e.stopPropagation()}
                    style={{
                        width: '80px',
                        padding: '2px 6px',
                        borderRadius: '8px',
                        border: '1px solid var(--color-primary)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                        outline: 'none',
                    }}
                />
            )}
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────
    const content = (
        <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>

            {/* ── TOP BAR ── */}
            <div style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)', padding: '10px 14px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 700 }}>🧮 Estimate</span>
                        {job?.job_number && <span style={{ fontSize: '11px', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '9999px' }}>#{job.job_number}</span>}
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)' }}><X size={22} /></button>
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
                    <input
                        className="form-input"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search spare parts & services..."
                        style={{ paddingLeft: '32px', width: '100%', fontSize: '14px', padding: '10px 10px 10px 32px' }}
                        autoFocus
                    />
                </div>

                {/* Filter pills */}
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button style={pillStyle(filter === 'all')}     onClick={() => setFilter('all')}>All</button>
                    <button style={pillStyle(filter === 'product')} onClick={() => setFilter('product')}><Package size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Parts</button>
                    <button style={pillStyle(filter === 'service')} onClick={() => setFilter('service')}><Wrench  size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Services</button>
                </div>
            </div>

            {/* ── WARRANTY BANNER ── */}
            {warrantyWarning && (
                <div style={{ padding: '8px 14px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#92400e', flexShrink: 0 }}>
                    <AlertTriangle size={13} /><strong>Under Warranty</strong> — verify before charging for parts
                </div>
            )}

            {/* ── ITEM CARDS GRID ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px', paddingBottom: basket.length > 0 ? '90px' : '10px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading inventory...</div>
                ) : (
                    <>
                        {visible.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                No items found. Use Manual Entry below.
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                            {visible.map(item => {
                                const isService = item.type === 'service' || item.product_type === 'service';
                                const inBasket  = basket.find(b => b.id === item.id);
                                const qty       = inBasket?.qty || 0;
                                const accent    = isService ? '#8b5cf6' : '#3b82f6';

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => addToBasket({ ...item, itemType: isService ? 'service' : 'product' })}
                                        style={{
                                            backgroundColor: qty > 0 ? (isService ? 'rgba(139,92,246,0.12)' : 'rgba(59,130,246,0.1)') : 'var(--bg-elevated)',
                                            border: `2px solid ${qty > 0 ? accent : 'var(--border-primary)'}`,
                                            borderRadius: '12px',
                                            padding: '12px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                            position: 'relative',
                                            userSelect: 'none',
                                            WebkitTapHighlightColor: 'transparent',
                                        }}
                                    >
                                        {/* Type badge */}
                                        <div style={{ position: 'absolute', top: '8px', right: '8px', color: accent }}>
                                            {isService ? <Wrench size={12} /> : <Package size={12} />}
                                        </div>

                                        {/* Qty badge */}
                                        {qty > 0 && (
                                            <div style={{ position: 'absolute', top: '-8px', left: '-8px', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: accent, color: '#fff', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {qty}
                                            </div>
                                        )}

                                        {/* ── Name only — price intentionally hidden ── */}
                                        <div style={{ fontSize: '13px', fontWeight: 600, lineHeight: '1.3', paddingRight: '16px' }}>{item.name}</div>

                                        {/* Qty controls if already in basket */}
                                        {qty > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }} onClick={e => e.stopPropagation()}>
                                                <button onClick={() => changeQty(item.id, -1)} style={{ width: '26px', height: '26px', borderRadius: '50%', border: 'none', backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={13} /></button>
                                                <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'center', fontSize: '14px' }}>{qty}</span>
                                                <button onClick={() => changeQty(item.id,  1)} style={{ width: '26px', height: '26px', borderRadius: '50%', border: 'none', backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus  size={13} /></button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Manual Entry */}
                        <div style={{ marginTop: '12px', borderRadius: '12px', border: '1px dashed var(--border-primary)', overflow: 'hidden' }}>
                            <button
                                onClick={() => setShowManual(p => !p)}
                                style={{ width: '100%', padding: '12px 14px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}
                            >
                                <PenLine size={14} /> Add Item Not in Inventory
                                {showManual ? <ChevronUp size={14} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={14} style={{ marginLeft: 'auto' }} />}
                            </button>
                            {showManual && (
                                <div style={{ padding: '0 12px 12px', display: 'grid', gap: '8px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                                        <input className="form-input" placeholder="Item / Service name" value={manualItem.name} onChange={e => setManualItem(p => ({ ...p, name: e.target.value }))} style={{ fontSize: '14px', padding: '10px' }} />
                                        <select value={manualItem.type} onChange={e => setManualItem(p => ({ ...p, type: e.target.value }))} className="form-input" style={{ fontSize: '13px', padding: '10px' }}>
                                            <option value="product">Part</option>
                                            <option value="service">Service</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'center' }}>
                                        <input className="form-input" type="number" placeholder="Price (₹)" value={manualItem.rate} onChange={e => setManualItem(p => ({ ...p, rate: e.target.value }))} style={{ fontSize: '14px', padding: '10px' }} />
                                        <button onClick={addManual} style={{ padding: '10px 18px', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>+ Add</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* ── STICKY BASKET ── */}
            {basket.length > 0 && (
                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1300, backgroundColor: 'var(--bg-elevated)', borderTop: '2px solid var(--border-primary)', boxShadow: '0 -4px 20px rgba(0,0,0,0.2)' }}>

                    {/* Expanded basket items */}
                    {basketOpen && (
                        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-primary)', maxHeight: '50vh', overflowY: 'auto' }}>
                            {basket.map(b => (
                                <div key={b.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-primary)' }}>

                                    {/* Row: name | qty controls | resolved price | remove */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ flex: 1, fontSize: '13px', fontWeight: 500, minWidth: 0 }}>
                                            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
                                            {b.autoLinked && <span style={{ fontSize: '10px', color: '#8b5cf6' }}>auto-linked</span>}
                                        </div>

                                        {/* Qty controls */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                            <button onClick={() => changeQty(b.id, -1)} style={{ width: '24px', height: '24px', borderRadius: '50%', border: 'none', backgroundColor: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={11} /></button>
                                            <span style={{ fontWeight: 700, fontSize: '13px', minWidth: '18px', textAlign: 'center' }}>{b.qty}</span>
                                            <button onClick={() => changeQty(b.id,  1)} style={{ width: '24px', height: '24px', borderRadius: '50%', border: 'none', backgroundColor: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus  size={11} /></button>
                                        </div>

                                        {/* Resolved line total */}
                                        <div style={{ fontSize: '13px', fontWeight: 700, minWidth: '64px', textAlign: 'right', flexShrink: 0 }}>
                                            ₹{fmt(b.qty * getPrice(b))}
                                        </div>

                                        <button onClick={() => removeFromBasket(b.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-tertiary)', flexShrink: 0 }}><X size={14} /></button>
                                    </div>

                                    {/* ── Price-type selector row ── */}
                                    <PricePills b={b} />
                                </div>
                            ))}

                            {/* Subtotal / GST summary */}
                            <div style={{ paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    <span>Subtotal</span><span>₹{fmt(subtotal)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    <span>GST</span><span>₹{fmt(Math.round(gst))}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Basket summary bar */}
                    <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            onClick={() => setBasketOpen(p => !p)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', flex: 1, textAlign: 'left', padding: 0 }}
                        >
                            <div style={{ position: 'relative', display: 'inline-flex' }}>
                                <ShoppingCart size={22} color="var(--color-primary)" />
                                <span style={{ position: 'absolute', top: '-6px', right: '-8px', width: '16px', height: '16px', backgroundColor: '#ef4444', color: '#fff', borderRadius: '50%', fontSize: '9px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{itemCount}</span>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1 }}>{basketOpen ? 'Hide items' : `${itemCount} item${itemCount > 1 ? 's' : ''}`}</div>
                                <div style={{ fontSize: '17px', fontWeight: 800, color: '#8b5cf6', lineHeight: 1.2 }}>₹{fmt(Math.round(total))}</div>
                            </div>
                            <div style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }}>{basketOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</div>
                        </button>

                        {/* WhatsApp */}
                        <button onClick={handleWhatsApp} style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#25D366', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="Share estimate on WhatsApp">
                            <MessageSquare size={18} />
                        </button>

                        {onCreateQuotation && (
                            <button onClick={handleCreateQuotation} style={{ padding: '10px 14px', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                <FileText size={15} /> Quotation
                            </button>
                        )}
                        {onCreateInvoice && (
                            <button onClick={handleCreateInvoice} style={{ padding: '10px 14px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                <FileText size={15} /> Invoice
                            </button>
                        )}
                        {onApply && (
                            <button onClick={() => onApply(buildItems())} style={{ padding: '10px 14px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                <Plus size={15} /> Add to Document
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    if (typeof window === 'undefined') return content;
    return createPortal(content, document.body);
}
