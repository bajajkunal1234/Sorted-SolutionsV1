'use client'

import { useState, useEffect, useRef } from 'react';
import { Package, Tag, BarChart2, TrendingUp, TrendingDown, Filter, RefreshCcw, Search, List, Printer, Share2, ExternalLink } from 'lucide-react';
import { inventoryAPI, inventoryCategoriesAPI } from '@/lib/adminAPI';
import { getStockStatus, getStockStatusLabel, getStockStatusColor } from '@/lib/utils/inventoryHelpers';
import ProductDetailModal from '../ProductDetailModal';

const fmt = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function InventoryReports() {
    const [activeReport, setActiveReport] = useState('overview');
    const [inventory, setInventory] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterBrand, setFilterBrand] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [search, setSearch] = useState('');

    // Price Lists state
    const [selectedProduct, setSelectedProduct] = useState(null);
    const priceListRef = useRef(null);

    const loadInventory = async () => {
        try {
            setLoading(true);
            const [inv, cats] = await Promise.all([
                inventoryAPI.getAll(),
                inventoryCategoriesAPI.getAll()
            ]);
            setInventory(inv || []);
            setCategories(cats || []);
        } catch (err) {
            console.error('Failed to load inventory for reports:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadInventory(); }, []);

    const reports = [
        { id: 'overview', name: 'Overview', icon: BarChart2, color: '#6366f1' },
        { id: 'by-category', name: 'By Category', icon: Tag, color: '#10b981' },
        { id: 'by-brand', name: 'By Brand', icon: Package, color: '#f59e0b' },
        { id: 'stock-status', name: 'Stock Status', icon: TrendingUp, color: '#3b82f6' },
        { id: 'valuation', name: 'Valuation', icon: TrendingDown, color: '#ec4899' },
        { id: 'price-lists', name: 'Price Lists', icon: List, color: '#8b5cf6' },
    ];

    const brands = [...new Set(inventory.map(p => p.brand).filter(Boolean))].sort();

    const filtered = inventory.filter(p => {
        if (filterType !== 'all' && p.type !== filterType) return false;
        if (filterCategory !== 'all' && p.category !== filterCategory) return false;
        if (filterBrand !== 'all' && p.brand !== filterBrand) return false;
        if (search) {
            const s = search.toLowerCase();
            if (!p.name?.toLowerCase().includes(s) && !p.sku?.toLowerCase().includes(s)) return false;
        }
        return true;
    });

    // ── Computed metrics ──────────────────────────────────────────────────────
    const totalProducts = filtered.filter(p => p.type === 'product').length;
    const totalServices = filtered.filter(p => p.type === 'service').length;
    const totalStockValue = filtered.filter(p => p.type === 'product').reduce((sum, p) => sum + ((p.current_stock || 0) * (p.purchase_price || 0)), 0);
    const totalSaleValue = filtered.filter(p => p.type === 'product').reduce((sum, p) => sum + ((p.current_stock || 0) * (p.sale_price || 0)), 0);

    // Group by category
    const byCategory = categories.map(cat => {
        const items = filtered.filter(p => p.category === cat.name || p.category === cat.id);
        const stockValue = items.reduce((s, p) => s + ((p.current_stock || 0) * (p.purchase_price || 0)), 0);
        return { name: cat.name, count: items.length, stockValue, items };
    }).filter(c => c.count > 0);

    const catNames = categories.map(c => c.name);
    const catIds = categories.map(c => c.id);
    const uncategorized = filtered.filter(p => !catNames.includes(p.category) && !catIds.includes(p.category) && p.category);
    if (uncategorized.length > 0) {
        const uniqueCats = [...new Set(uncategorized.map(p => p.category))];
        uniqueCats.forEach(cat => {
            const items = uncategorized.filter(p => p.category === cat);
            byCategory.push({ name: cat, count: items.length, stockValue: items.reduce((s, p) => s + ((p.current_stock || 0) * (p.purchase_price || 0)), 0), items });
        });
    }

    const byBrand = brands.map(brand => {
        const items = filtered.filter(p => p.brand === brand);
        const stockValue = items.reduce((s, p) => s + ((p.current_stock || 0) * (p.purchase_price || 0)), 0);
        const saleValue = items.reduce((s, p) => s + ((p.current_stock || 0) * (p.sale_price || 0)), 0);
        return { name: brand, count: items.length, stockValue, saleValue, items };
    }).sort((a, b) => b.stockValue - a.stockValue);

    const outOfStock = filtered.filter(p => p.type === 'product' && (p.current_stock || 0) === 0);
    const lowStock = filtered.filter(p => p.type === 'product' && (p.current_stock || 0) > 0 && (p.current_stock || 0) <= (p.min_stock_level || 5));
    const inStock = filtered.filter(p => p.type === 'product' && (p.current_stock || 0) > (p.min_stock_level || 5));

    // Print handler
    const handlePrint = () => {
        const content = priceListRef.current?.innerHTML;
        if (!content) return;
        const win = window.open('', '_blank');
        win.document.write(`
            <html><head><title>Price List</title>
            <style>
                body { font-family: system-ui, sans-serif; font-size: 12px; margin: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
                th { background: #f3f4f6; font-weight: 600; }
                td.num { text-align: right; }
                h2 { margin: 0 0 4px; font-size: 18px; }
                p { margin: 0 0 12px; font-size: 12px; color: #6b7280; }
                .badge { display: inline-block; padding: 1px 6px; border-radius: 10px; font-size: 10px; font-weight: 600; }
                @media print { body { margin: 10px; } }
            </style></head><body>${content}</body></html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); }, 300);
    };

    // Share as CSV
    const handleShareCSV = () => {
        const headers = ['SKU', 'Name', 'Category', 'Brand', 'Type', 'Purchase Rate', 'Sale Price', 'Dealer Price', 'Retail Price'];
        const rows = filtered.map(p => [
            p.sku, p.name, p.category || '', p.brand || '', p.type,
            p.purchase_price || 0, p.sale_price || 0, p.dealer_price || 0, p.retail_price || 0
        ]);
        const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `price-list-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleProductSave = async (updatedProduct) => {
        try {
            await inventoryAPI.update(updatedProduct.id, updatedProduct);
            setSelectedProduct(null);
            await loadInventory();
        } catch (err) {
            console.error('Failed to update product:', err);
        }
    };

    const StatCard = ({ label, value, sub, color = 'var(--color-primary)' }) => (
        <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '6px' }}>{label}</div>
            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color }}>{value}</div>
            {sub && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '4px' }}>{sub}</div>}
        </div>
    );

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Inline product detail modal from Price Lists */}
            {selectedProduct && (
                <ProductDetailModal
                    product={selectedProduct}
                    categories={categories}
                    onClose={() => setSelectedProduct(null)}
                    onSave={handleProductSave}
                    onDelete={() => setSelectedProduct(null)}
                />
            )}

            {/* Header */}
            <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)' }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, marginBottom: '4px' }}>Inventory Reports</h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                    Analyse stock, valuation and product performance by category and brand
                </p>
            </div>

            {/* Report tabs */}
            <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', display: 'flex', gap: 'var(--spacing-xs)', overflowX: 'auto' }}>
                {reports.map(r => (
                    <button
                        key={r.id}
                        onClick={() => setActiveReport(r.id)}
                        style={{
                            padding: '7px 14px', fontSize: 'var(--font-size-sm)', fontWeight: 500, whiteSpace: 'nowrap',
                            backgroundColor: activeReport === r.id ? r.color : 'var(--bg-elevated)',
                            color: activeReport === r.id ? '#fff' : 'var(--text-primary)',
                            border: `1px solid ${activeReport === r.id ? r.color : 'var(--border-primary)'}`,
                            borderRadius: 'var(--radius-md)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            transition: 'all 0.15s'
                        }}
                    >
                        <r.icon size={14} />
                        {r.name}
                    </button>
                ))}
            </div>

            {/* Filters bar */}
            <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-primary)', display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                <Filter size={14} style={{ color: 'var(--text-tertiary)' }} />
                <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ fontSize: 'var(--font-size-sm)', padding: '5px 10px', maxWidth: '130px' }}>
                    <option value="all">All Types</option>
                    <option value="product">Products</option>
                    <option value="service">Services</option>
                </select>
                <select className="form-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ fontSize: 'var(--font-size-sm)', padding: '5px 10px', maxWidth: '160px' }}>
                    <option value="all">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <select className="form-select" value={filterBrand} onChange={e => setFilterBrand(e.target.value)} style={{ fontSize: 'var(--font-size-sm)', padding: '5px 10px', maxWidth: '150px' }}>
                    <option value="all">All Brands</option>
                    {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', padding: '5px 10px', flex: 1, maxWidth: '260px' }}>
                    <Search size={13} style={{ color: 'var(--text-tertiary)' }} />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." style={{ border: 'none', background: 'transparent', fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', outline: 'none', width: '100%' }} />
                </div>
                {activeReport === 'price-lists' && (
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginLeft: 'auto' }}>
                        <button onClick={handlePrint} className="btn btn-secondary" style={{ fontSize: 'var(--font-size-xs)', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Printer size={13} /> Print
                        </button>
                        <button onClick={handleShareCSV} className="btn btn-secondary" style={{ fontSize: 'var(--font-size-xs)', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Share2 size={13} /> Export CSV
                        </button>
                    </div>
                )}
                {activeReport !== 'price-lists' && (
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                        {loading ? 'Loading...' : `${filtered.length} items`}
                    </span>
                )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-2xl)', color: 'var(--text-secondary)' }}>
                        <RefreshCcw size={20} style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }} /> Loading inventory data...
                    </div>
                ) : (
                    <>
                        {/* ── OVERVIEW ── */}
                        {activeReport === 'overview' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--spacing-md)' }}>
                                    <StatCard label="Total Products" value={totalProducts} color="#6366f1" />
                                    <StatCard label="Total Services" value={totalServices} color="#10b981" />
                                    <StatCard label="Stock Cost Value" value={fmt(totalStockValue)} color="#f59e0b" sub="At purchase rate" />
                                    <StatCard label="Stock Sale Value" value={fmt(totalSaleValue)} color="#3b82f6" sub="At sale price" />
                                    <StatCard label="Gross Margin" value={fmt(totalSaleValue - totalStockValue)} color="#ec4899" sub={totalStockValue > 0 ? `${(((totalSaleValue - totalStockValue) / totalStockValue) * 100).toFixed(1)}%` : ''} />
                                </div>
                                <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
                                    <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', borderBottom: '1px solid var(--border-primary)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                        All Items ({filtered.length})
                                    </div>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}>
                                            <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                                <tr>
                                                    {['SKU', 'Name', 'Type', 'Category', 'Brand', 'Stock', 'Sale Price', 'Purchase Rate', 'Stock Value', 'Status'].map(h => (
                                                        <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Stock' || h.includes('Price') || h.includes('Rate') || h.includes('Value') ? 'right' : 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filtered.map(p => {
                                                    const status = getStockStatus(p.current_stock, p.min_stock_level, p.type === 'service');
                                                    const statusColor = getStockStatusColor(status);
                                                    const statusLabel = getStockStatusLabel(status);
                                                    return (
                                                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                            <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--color-primary)' }}>{p.sku}</td>
                                                            <td style={{ padding: '8px 12px', fontWeight: 500 }}>{p.name}</td>
                                                            <td style={{ padding: '8px 12px', textTransform: 'capitalize' }}>{p.type}</td>
                                                            <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{p.category || '—'}</td>
                                                            <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{p.brand || '—'}</td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{p.type === 'service' ? '—' : (p.current_stock ?? 0)}</td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{fmt(p.sale_price)}</td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{p.type === 'service' ? '—' : fmt(p.purchase_price)}</td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{p.type === 'service' ? '—' : fmt((p.current_stock || 0) * (p.purchase_price || 0))}</td>
                                                            <td style={{ padding: '8px 12px' }}>
                                                                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, backgroundColor: `${statusColor}18`, color: statusColor }}>
                                                                    {statusLabel}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── BY CATEGORY ── */}
                        {activeReport === 'by-category' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                {byCategory.length === 0 ? (
                                    <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>No data to display</div>
                                ) : byCategory.map(cat => (
                                    <div key={cat.name} style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
                                        <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                                <Tag size={14} style={{ color: '#10b981' }} />
                                                <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{cat.name}</span>
                                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: '10px' }}>{cat.count} item{cat.count !== 1 ? 's' : ''}</span>
                                            </div>
                                            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: '#10b981' }}>{fmt(cat.stockValue)} stock value</span>
                                        </div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}>
                                            <thead style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                                <tr>{['SKU', 'Name', 'Brand', 'Stock', 'Sale Price', 'Purchase Rate', 'Value'].map(h => <th key={h} style={{ padding: '6px 12px', textAlign: h === 'Stock' || h.includes('Price') || h.includes('Rate') || h === 'Value' ? 'right' : 'left', fontWeight: 600 }}>{h}</th>)}</tr>
                                            </thead>
                                            <tbody>
                                                {cat.items.map(p => (
                                                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                        <td style={{ padding: '6px 12px', fontFamily: 'monospace', color: 'var(--color-primary)' }}>{p.sku}</td>
                                                        <td style={{ padding: '6px 12px', fontWeight: 500 }}>{p.name}</td>
                                                        <td style={{ padding: '6px 12px', color: 'var(--text-secondary)' }}>{p.brand || '—'}</td>
                                                        <td style={{ padding: '6px 12px', textAlign: 'right' }}>{p.type === 'service' ? '—' : (p.current_stock ?? 0)}</td>
                                                        <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmt(p.sale_price)}</td>
                                                        <td style={{ padding: '6px 12px', textAlign: 'right' }}>{p.type === 'service' ? '—' : fmt(p.purchase_price)}</td>
                                                        <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600 }}>{p.type === 'service' ? '—' : fmt((p.current_stock || 0) * (p.purchase_price || 0))}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── BY BRAND ── */}
                        {activeReport === 'by-brand' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                {byBrand.length === 0 ? (
                                    <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>No brand data available</div>
                                ) : byBrand.map(b => (
                                    <div key={b.name} style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
                                        <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                                <Package size={14} style={{ color: '#f59e0b' }} />
                                                <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{b.name}</span>
                                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: '10px' }}>{b.count} item{b.count !== 1 ? 's' : ''}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>Cost: <strong style={{ color: '#f59e0b' }}>{fmt(b.stockValue)}</strong></span>
                                                <span style={{ color: 'var(--text-secondary)' }}>Retail: <strong style={{ color: '#10b981' }}>{fmt(b.saleValue)}</strong></span>
                                            </div>
                                        </div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}>
                                            <thead style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                                <tr>{['SKU', 'Name', 'Category', 'Stock', 'Sale Price', 'Purchase Rate', 'Cost Value', 'Sale Value'].map(h => <th key={h} style={{ padding: '6px 12px', textAlign: h === 'Stock' || h.includes('Price') || h.includes('Rate') || h.includes('Value') ? 'right' : 'left', fontWeight: 600 }}>{h}</th>)}</tr>
                                            </thead>
                                            <tbody>
                                                {b.items.map(p => (
                                                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                        <td style={{ padding: '6px 12px', fontFamily: 'monospace', color: 'var(--color-primary)' }}>{p.sku}</td>
                                                        <td style={{ padding: '6px 12px', fontWeight: 500 }}>{p.name}</td>
                                                        <td style={{ padding: '6px 12px', color: 'var(--text-secondary)' }}>{p.category || '—'}</td>
                                                        <td style={{ padding: '6px 12px', textAlign: 'right' }}>{p.type === 'service' ? '—' : (p.current_stock ?? 0)}</td>
                                                        <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmt(p.sale_price)}</td>
                                                        <td style={{ padding: '6px 12px', textAlign: 'right' }}>{p.type === 'service' ? '—' : fmt(p.purchase_price)}</td>
                                                        <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600 }}>{p.type === 'service' ? '—' : fmt((p.current_stock || 0) * (p.purchase_price || 0))}</td>
                                                        <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>{p.type === 'service' ? '—' : fmt((p.current_stock || 0) * (p.sale_price || 0))}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── STOCK STATUS ── */}
                        {activeReport === 'stock-status' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--spacing-md)' }}>
                                    <StatCard label="In Stock" value={inStock.length} color="#10b981" sub="Above reorder level" />
                                    <StatCard label="Low Stock" value={lowStock.length} color="#f59e0b" sub="At or below reorder level" />
                                    <StatCard label="Out of Stock" value={outOfStock.length} color="#ef4444" sub="Zero quantity" />
                                </div>
                                {[{ label: 'Out of Stock', items: outOfStock, color: '#ef4444' }, { label: 'Low Stock', items: lowStock, color: '#f59e0b' }, { label: 'In Stock', items: inStock, color: '#10b981' }].map(group => group.items.length > 0 && (
                                    <div key={group.label} style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: `1px solid ${group.color}30`, overflow: 'hidden' }}>
                                        <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', borderBottom: '1px solid var(--border-primary)', backgroundColor: `${group.color}10`, display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                            <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: group.color }}>{group.label}</span>
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>({group.items.length})</span>
                                        </div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}>
                                            <thead style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                                <tr>{['SKU', 'Name', 'Category', 'Brand', 'Current Stock', 'Reorder Level', 'Sale Price'].map(h => <th key={h} style={{ padding: '6px 12px', textAlign: h.includes('Stock') || h.includes('Level') || h.includes('Price') ? 'right' : 'left', fontWeight: 600 }}>{h}</th>)}</tr>
                                            </thead>
                                            <tbody>
                                                {group.items.map(p => (
                                                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                        <td style={{ padding: '6px 12px', fontFamily: 'monospace', color: 'var(--color-primary)' }}>{p.sku}</td>
                                                        <td style={{ padding: '6px 12px', fontWeight: 500 }}>{p.name}</td>
                                                        <td style={{ padding: '6px 12px', color: 'var(--text-secondary)' }}>{p.category || '—'}</td>
                                                        <td style={{ padding: '6px 12px', color: 'var(--text-secondary)' }}>{p.brand || '—'}</td>
                                                        <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700, color: group.color }}>{p.current_stock ?? 0}</td>
                                                        <td style={{ padding: '6px 12px', textAlign: 'right' }}>{p.min_stock_level ?? 0}</td>
                                                        <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmt(p.sale_price)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── VALUATION ── */}
                        {activeReport === 'valuation' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--spacing-md)' }}>
                                    <StatCard label="Total Cost Value" value={fmt(totalStockValue)} color="#6366f1" sub="Stock × Purchase Rate" />
                                    <StatCard label="Total Retail Value" value={fmt(totalSaleValue)} color="#10b981" sub="Stock × Sale Price" />
                                    <StatCard label="Potential Profit" value={fmt(totalSaleValue - totalStockValue)} color="#ec4899" />
                                </div>
                                <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
                                    <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', borderBottom: '1px solid var(--border-primary)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                        Valuation by Item (Products only)
                                    </div>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}>
                                            <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                                <tr>{['SKU', 'Name', 'Category', 'Brand', 'Stock', 'Purchase Rate', 'Sale Price', 'Cost Value', 'Retail Value', 'Margin'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Stock' || h.includes('Price') || h.includes('Rate') || h.includes('Value') || h === 'Margin' ? 'right' : 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>)}</tr>
                                            </thead>
                                            <tbody>
                                                {filtered.filter(p => p.type === 'product').sort((a, b) => ((b.current_stock || 0) * (b.purchase_price || 0)) - ((a.current_stock || 0) * (a.purchase_price || 0))).map(p => {
                                                    const costVal = (p.current_stock || 0) * (p.purchase_price || 0);
                                                    const saleVal = (p.current_stock || 0) * (p.sale_price || 0);
                                                    const margin = p.purchase_price > 0 ? (((p.sale_price - p.purchase_price) / p.purchase_price) * 100).toFixed(1) : '—';
                                                    return (
                                                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                            <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--color-primary)' }}>{p.sku}</td>
                                                            <td style={{ padding: '8px 12px', fontWeight: 500 }}>{p.name}</td>
                                                            <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{p.category || '—'}</td>
                                                            <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{p.brand || '—'}</td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{p.current_stock ?? 0}</td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{fmt(p.purchase_price)}</td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{fmt(p.sale_price)}</td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{fmt(costVal)}</td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>{fmt(saleVal)}</td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#6366f1' }}>{margin !== '—' ? `${margin}%` : '—'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '2px solid var(--border-primary)' }}>
                                                <tr>
                                                    <td colSpan={7} style={{ padding: '8px 12px', fontWeight: 600 }}>Total</td>
                                                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt(totalStockValue)}</td>
                                                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>{fmt(totalSaleValue)}</td>
                                                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#6366f1' }}>{totalStockValue > 0 ? `${(((totalSaleValue - totalStockValue) / totalStockValue) * 100).toFixed(1)}%` : '—'}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── PRICE LISTS ── */}
                        {activeReport === 'price-lists' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                {/* Info bar */}
                                <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', backgroundColor: '#8b5cf620', border: '1px solid #8b5cf640', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                    Click any product row to open its detail and edit prices. Use the filters above to narrow the list, then Print or Export CSV.
                                </div>

                                {/* Printable region */}
                                <div ref={priceListRef}>
                                    <h2 style={{ margin: 0, fontSize: '18px' }}>Price List</h2>
                                    <p style={{ margin: '4px 0 12px', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
                                        Generated {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        {filterCategory !== 'all' ? ` · Category: ${filterCategory}` : ''}
                                        {filterBrand !== 'all' ? ` · Brand: ${filterBrand}` : ''}
                                        {filterType !== 'all' ? ` · Type: ${filterType}` : ''}
                                    </p>

                                    <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}>
                                                <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                                    <tr>
                                                        {['SKU', 'Name', 'Category', 'Brand', 'Type', 'Purchase Rate', 'Sale Price', 'Dealer Price', 'Retail Price / MRP'].map(h => (
                                                            <th key={h} style={{ padding: '9px 12px', textAlign: h.includes('Rate') || h.includes('Price') ? 'right' : 'left', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '2px solid var(--border-primary)' }}>{h}</th>
                                                        ))}
                                                        <th style={{ padding: '9px 12px', fontWeight: 600, borderBottom: '2px solid var(--border-primary)' }}>Edit</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filtered.length === 0 ? (
                                                        <tr><td colSpan={10} style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>No items match your filters</td></tr>
                                                    ) : filtered.map((p, idx) => (
                                                        <tr
                                                            key={p.id}
                                                            style={{ borderBottom: '1px solid var(--border-primary)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-secondary)', cursor: 'pointer' }}
                                                            onClick={() => setSelectedProduct(p)}
                                                        >
                                                            <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>{p.sku}</td>
                                                            <td style={{ padding: '8px 12px', fontWeight: 500 }}>{p.name}</td>
                                                            <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{p.category || '—'}</td>
                                                            <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{p.brand || '—'}</td>
                                                            <td style={{ padding: '8px 12px' }}>
                                                                <span style={{ padding: '2px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: 600, backgroundColor: p.type === 'product' ? '#6366f118' : '#10b98118', color: p.type === 'product' ? '#6366f1' : '#10b981', textTransform: 'capitalize' }}>{p.type}</span>
                                                            </td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>{p.type === 'service' ? '—' : fmt(p.purchase_price)}</td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>{fmt(p.sale_price)}</td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#f59e0b' }}>{p.dealer_price > 0 ? fmt(p.dealer_price) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}</td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#8b5cf6' }}>{p.retail_price > 0 ? fmt(p.retail_price) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}</td>
                                                            <td style={{ padding: '8px 12px' }}>
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', fontSize: '11px' }}>
                                                                    <ExternalLink size={12} /> Edit
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default InventoryReports;
