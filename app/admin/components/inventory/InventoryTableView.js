'use client'

import { useState, useCallback } from 'react';
import { Trash2, CheckSquare } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/accountingHelpers';
import { getStockStatus, getStockStatusColor, getStockStatusLabel, formatStock } from '@/lib/utils/inventoryHelpers';

/**
 * InventoryTableView
 *
 * visibleColumns — Set of column IDs using the same snake_case keys as inventoryColumns[]
 *   e.g. new Set(['sku','name','type','category','brand','current_stock','sale_price',
 *                  'hsn_code','hsn_description','gst_rate','job_type','status'])
 *
 * onDelete(id)          — delete a single item
 * onDeleteMany(ids[])   — bulk delete
 */
function InventoryTableView({ products, onProductClick, categories = [], visibleColumns, onDelete, onDeleteMany }) {
    const [selectedIds, setSelectedIds] = useState(new Set());

    const isVisible = (col) => !visibleColumns || visibleColumns.has(col);

    const toggleSelect = useCallback((id, e) => {
        e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const toggleAll = useCallback(() => {
        if (selectedIds.size === products.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(products.map(p => p.id)));
        }
    }, [selectedIds, products]);

    const handleBulkDelete = async () => {
        if (!selectedIds.size) return;
        if (!window.confirm(`Delete ${selectedIds.size} selected item(s)? This cannot be undone.`)) return;
        if (onDeleteMany) await onDeleteMany([...selectedIds]);
        setSelectedIds(new Set());
    };

    const handleSingleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('Delete this item? This cannot be undone.')) return;
        if (onDelete) await onDelete(id);
        setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    };

    const thBase = {
        padding: '8px 10px',
        textAlign: 'left',
        fontWeight: 600,
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--text-tertiary)',
        whiteSpace: 'nowrap',
        borderBottom: '2px solid var(--border-primary)',
        backgroundColor: 'var(--bg-secondary)',
    };
    const thRight = { ...thBase, textAlign: 'right' };
    const thCenter = { ...thBase, textAlign: 'center' };
    const td = { padding: '8px 10px', verticalAlign: 'middle' };
    const tdRight = { ...td, textAlign: 'right' };
    const tdCenter = { ...td, textAlign: 'center' };

    const allSelected = products.length > 0 && selectedIds.size === products.length;
    const someSelected = selectedIds.size > 0 && selectedIds.size < products.length;

    return (
        <div>
            {/* ── Bulk action bar ── */}
            {selectedIds.size > 0 && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 14px',
                    backgroundColor: 'rgba(99,102,241,0.08)',
                    borderBottom: '1px solid rgba(99,102,241,0.2)',
                    fontSize: '13px', color: 'var(--text-primary)'
                }}>
                    <CheckSquare size={14} style={{ color: '#6366f1' }} />
                    <span><strong>{selectedIds.size}</strong> item{selectedIds.size !== 1 ? 's' : ''} selected</span>
                    <button
                        onClick={handleBulkDelete}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '4px 12px', fontSize: '12px', fontWeight: 600,
                            backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444',
                            border: '1px solid rgba(239,68,68,0.25)', borderRadius: '6px',
                            cursor: 'pointer', transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
                    >
                        <Trash2 size={12} /> Delete Selected
                    </button>
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        style={{ fontSize: '12px', color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}
                    >
                        Clear
                    </button>
                </div>
            )}

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr>
                            {/* Select-all checkbox */}
                            <th style={{ ...thCenter, width: '36px', padding: '8px 6px' }}>
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    ref={el => { if (el) el.indeterminate = someSelected; }}
                                    onChange={toggleAll}
                                    style={{ width: 14, height: 14, accentColor: '#6366f1', cursor: 'pointer' }}
                                />
                            </th>
                            {isVisible('sku')              && <th style={thBase}>SKU</th>}
                            {isVisible('name')             && <th style={thBase}>Name</th>}
                            {isVisible('type')             && <th style={thBase}>Type</th>}
                            {isVisible('job_type')         && <th style={thBase}>Job Type</th>}
                            {isVisible('category')         && <th style={thBase}>Category</th>}
                            {isVisible('brand')            && <th style={thBase}>Brand</th>}
                            {isVisible('current_stock')    && <th style={thRight}>Stock</th>}
                            {isVisible('min_stock_level')  && <th style={thRight}>Min Stock</th>}
                            {isVisible('sale_price')       && <th style={thRight}>Sale Price</th>}
                            {isVisible('purchase_price')   && <th style={thRight}>Purchase</th>}
                            {isVisible('dealer_price')     && <th style={thRight}>Dealer</th>}
                            {isVisible('retail_price')     && <th style={thRight}>Retail</th>}
                            {isVisible('unit_of_measure')  && <th style={thBase}>Unit</th>}
                            {isVisible('hsn_code')         && <th style={thBase}>HSN / SAC</th>}
                            {isVisible('hsn_description')  && <th style={thBase}>HSN Description</th>}
                            {isVisible('gst_rate')         && <th style={thRight}>GST %</th>}
                            {isVisible('status')           && <th style={thCenter}>Status</th>}
                            {/* Delete action column */}
                            <th style={{ ...thCenter, width: '36px' }} />
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(product => {
                            const isSelected = selectedIds.has(product.id);
                            const stockStatus = getStockStatus(product.currentStock, product.reorderLevel, product.type === 'service');
                            const statusColor = getStockStatusColor(stockStatus);
                            const statusLabel = getStockStatusLabel(stockStatus);

                            const JOB_TYPE_LABELS = {
                                install_uninstall:   'Install / Uninstall',
                                service_maintenance: 'Service / Maint.',
                                repair:              'Repair',
                            };

                            return (
                                <tr
                                    key={product.id}
                                    onClick={() => onProductClick?.(product)}
                                    style={{
                                        borderBottom: '1px solid var(--border-primary)',
                                        transition: 'background-color 0.1s',
                                        cursor: 'pointer',
                                        backgroundColor: isSelected ? 'rgba(99,102,241,0.06)' : 'transparent'
                                    }}
                                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isSelected ? 'rgba(99,102,241,0.06)' : 'transparent'; }}
                                >
                                    {/* Row checkbox */}
                                    <td style={tdCenter} onClick={e => toggleSelect(product.id, e)}>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {}}
                                            style={{ width: 14, height: 14, accentColor: '#6366f1', cursor: 'pointer' }}
                                        />
                                    </td>

                                    {isVisible('sku') && (
                                        <td style={td}>
                                            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                {product.sku}
                                            </span>
                                        </td>
                                    )}

                                    {isVisible('name') && (
                                        <td style={td}>
                                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                                {product.name}
                                            </span>
                                        </td>
                                    )}

                                    {isVisible('type') && (
                                        <td style={td}>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
                                                fontWeight: 500,
                                                backgroundColor: product.type === 'service' ? 'rgba(99,102,241,0.1)' : 'rgba(16,185,129,0.1)',
                                                color: product.type === 'service' ? '#6366f1' : '#10b981',
                                                textTransform: 'capitalize'
                                            }}>
                                                {product.type}
                                            </span>
                                        </td>
                                    )}

                                    {isVisible('job_type') && (
                                        <td style={td}>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                {JOB_TYPE_LABELS[product.job_type] || product.job_type || '—'}
                                            </span>
                                        </td>
                                    )}

                                    {isVisible('category') && (
                                        <td style={td}>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                {product.category || '—'}
                                            </span>
                                        </td>
                                    )}

                                    {isVisible('brand') && (
                                        <td style={td}>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                {product.brand || '—'}
                                            </span>
                                        </td>
                                    )}

                                    {isVisible('current_stock') && (
                                        <td style={tdRight}>
                                            {product.type === 'service' ? (
                                                <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>N/A</span>
                                            ) : (
                                                <span style={{ fontWeight: 500 }}>
                                                    {formatStock(product.currentStock, product.unitOfMeasure)}
                                                </span>
                                            )}
                                        </td>
                                    )}

                                    {isVisible('min_stock_level') && (
                                        <td style={tdRight}>
                                            {product.type === 'service' ? (
                                                <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>N/A</span>
                                            ) : (
                                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                    {product.minStockLevel ?? '—'}
                                                </span>
                                            )}
                                        </td>
                                    )}

                                    {isVisible('sale_price') && (
                                        <td style={tdRight}>
                                            <span style={{ fontWeight: 600 }}>{formatCurrency(product.salePrice)}</span>
                                        </td>
                                    )}

                                    {isVisible('purchase_price') && (
                                        <td style={tdRight}>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                                                {product.purchasePrice ? formatCurrency(product.purchasePrice) : '—'}
                                            </span>
                                        </td>
                                    )}

                                    {isVisible('dealer_price') && (
                                        <td style={tdRight}>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                                                {product.dealer_price ? formatCurrency(product.dealer_price) : '—'}
                                            </span>
                                        </td>
                                    )}

                                    {isVisible('retail_price') && (
                                        <td style={tdRight}>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                                                {product.retail_price ? formatCurrency(product.retail_price) : '—'}
                                            </span>
                                        </td>
                                    )}

                                    {isVisible('unit_of_measure') && (
                                        <td style={td}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                {product.unitOfMeasure || '—'}
                                            </span>
                                        </td>
                                    )}

                                    {isVisible('hsn_code') && (
                                        <td style={td}>
                                            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                {product.hsnCode || product.hsn_code || '—'}
                                            </span>
                                        </td>
                                    )}

                                    {isVisible('hsn_description') && (
                                        <td style={td}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                {product.hsn_description || '—'}
                                            </span>
                                        </td>
                                    )}

                                    {isVisible('gst_rate') && (
                                        <td style={tdRight}>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                {product.gst_rate != null ? `${product.gst_rate}%` : '—'}
                                            </span>
                                        </td>
                                    )}

                                    {isVisible('status') && (
                                        <td style={tdCenter}>
                                            <span
                                                style={{
                                                    display: 'inline-block', width: '10px', height: '10px',
                                                    borderRadius: '50%', backgroundColor: statusColor
                                                }}
                                                title={statusLabel}
                                            />
                                        </td>
                                    )}

                                    {/* Per-row delete button */}
                                    <td style={tdCenter} onClick={e => handleSingleDelete(e, product.id)}>
                                        <button
                                            title="Delete"
                                            style={{
                                                padding: '3px 5px', border: 'none', borderRadius: '4px',
                                                backgroundColor: 'transparent', cursor: 'pointer',
                                                color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center',
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {products.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-tertiary)' }}>
                        No products found. Try adjusting your filters.
                    </div>
                )}
            </div>
        </div>
    );
}

export default InventoryTableView;
