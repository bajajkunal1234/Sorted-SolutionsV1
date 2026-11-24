'use client'

import React, { useState, useCallback } from 'react';
import { Trash2, CheckSquare, Archive, ArchiveRestore, ArrowUp, ArrowDown, ArrowUpDown, Image as ImageIcon } from 'lucide-react';
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

function ThumbnailPreview({ product }) {
    const [imgError, setImgError] = useState(false);

    const imageUrl = !imgError ? (
        product.web_details?.thumbnail_image ||
        (Array.isArray(product.images) && product.images[0]) ||
        (typeof product.images === 'string' && product.images) ||
        product.image ||
        product.image_url ||
        null
    ) : null;

    return (
        <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            verticalAlign: 'middle',
            flexShrink: 0
        }}>
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt=""
                    loading="lazy"
                    onError={() => setImgError(true)}
                    style={{
                        width: '32px',
                        height: '32px',
                        objectFit: 'cover',
                        display: 'block'
                    }}
                />
            ) : (
                <ImageIcon size={14} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
            )}
        </div>
    );
}

function InventoryTableView({ products, groupBy = 'none', groupedProducts = [], onProductClick, categories = [], visibleColumns, onDelete, onDeleteMany, onArchive, onRestore, showArchived = false, sortBy = 'name', onSortChange }) {
    const [selectedIds, setSelectedIds] = useState(new Set());

    const isVisible = (col) => !visibleColumns || visibleColumns.has(col);
    // Sort mapping and header click handler
    const COLUMN_SORT_KEYS = {
        name: { asc: 'name', desc: 'name_desc' },
        sku: { asc: 'sku', desc: 'sku_desc' },
        sale_price: { asc: 'price_asc', desc: 'price_desc' },
        current_stock: { asc: 'stock_asc', desc: 'stock_desc' },
        purchase_price: { asc: 'purchase_price_asc', desc: 'purchase_price_desc' },
    };

    const getSortInfo = useCallback((colId) => {
        const keys = COLUMN_SORT_KEYS[colId] || { asc: colId, desc: `${colId}_desc` };
        let currentDirection = null;
        if (
            sortBy === keys.asc ||
            (colId === 'sale_price' && (sortBy === 'sale_price' || sortBy === 'price_asc')) ||
            (colId === 'current_stock' && (sortBy === 'current_stock' || sortBy === 'stock_asc')) ||
            (colId === 'purchase_price' && (sortBy === 'purchase_price' || sortBy === 'purchase_price_asc'))
        ) {
            currentDirection = 'asc';
        } else if (
            sortBy === keys.desc ||
            (colId === 'sale_price' && (sortBy === 'sale_price_desc' || sortBy === 'price_desc')) ||
            (colId === 'current_stock' && (sortBy === 'current_stock_desc' || sortBy === 'stock_desc')) ||
            (colId === 'purchase_price' && sortBy === 'purchase_price_desc')
        ) {
            currentDirection = 'desc';
        }
        return { keys, currentDirection };
    }, [sortBy]);

    const handleHeaderClick = useCallback((colId) => {
        if (!onSortChange) return;
        const { keys, currentDirection } = getSortInfo(colId);
        if (currentDirection === 'asc') {
            onSortChange(keys.desc);
        } else {
            onSortChange(keys.asc);
        }
    }, [onSortChange, getSortInfo]);

    const renderSortableHeader = (colId, label, align = 'left', width = 'auto') => {
        const { currentDirection } = getSortInfo(colId);
        const isActive = Boolean(currentDirection);
        const textAlign = align === 'right' ? 'right' : (align === 'center' ? 'center' : 'left');
        const justify = align === 'right' ? 'flex-end' : (align === 'center' ? 'center' : 'flex-start');

        return (
            <th
                key={colId}
                onClick={() => handleHeaderClick(colId)}
                title={`Click to sort by ${label}`}
                style={{
                    padding: '8px 10px',
                    fontWeight: 600,
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: isActive ? '#818cf8' : 'var(--text-tertiary)',
                    backgroundColor: isActive ? 'rgba(99,102,241,0.06)' : 'var(--bg-secondary)',
                    borderBottom: isActive ? '2px solid #6366f1' : '2px solid var(--border-primary)',
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    cursor: 'pointer',
                    userSelect: 'none',
                    textAlign,
                    width,
                    transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                    if (!isActive) {
                        e.currentTarget.style.color = 'var(--text-primary)';
                        e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isActive) {
                        e.currentTarget.style.color = 'var(--text-tertiary)';
                        e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    }
                }}
            >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: justify, gap: '4px', width: '100%' }}>
                    <span>{label}</span>
                    {currentDirection === 'asc' && <ArrowUp size={12} style={{ color: '#6366f1', flexShrink: 0 }} />}
                    {currentDirection === 'desc' && <ArrowDown size={12} style={{ color: '#6366f1', flexShrink: 0 }} />}
                    {!currentDirection && <ArrowUpDown size={11} style={{ opacity: 0.25, flexShrink: 0 }} />}
                </div>
            </th>
        );
    };


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

    const handleBulkArchive = async () => {
        if (!selectedIds.size) return;
        if (!window.confirm(`Archive ${selectedIds.size} selected item(s)?`)) return;
        for (const id of [...selectedIds]) {
            if (onArchive) await onArchive(id);
        }
        setSelectedIds(new Set());
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
        position: 'sticky',
        top: 0,
        zIndex: 10,
    };
    const thRight = { ...thBase, textAlign: 'right' };
    const thCenter = { ...thBase, textAlign: 'center' };
    const td = { padding: '8px 10px', verticalAlign: 'middle' };
    const tdRight = { ...td, textAlign: 'right' };
    const tdCenter = { ...td, textAlign: 'center' };

    const allSelected = products.length > 0 && selectedIds.size === products.length;
    const someSelected = selectedIds.size > 0 && selectedIds.size < products.length;

    const renderRow = (product) => {
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

                {isVisible('image') && (
                    <td style={{ padding: '3px 4px', textAlign: 'center', verticalAlign: 'middle', width: '44px', minWidth: '44px', lineHeight: 1 }}>
                        <ThumbnailPreview product={product} />
                    </td>
                )}

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

                {isVisible('subtype') && (
                    <td style={td}>
                        <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: (product.subtype || 'tech') === 'web' ? 'rgba(56,189,248,0.12)' : 'rgba(148,163,184,0.12)',
                            color: (product.subtype || 'tech') === 'web' ? '#38bdf8' : '#94a3b8',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                        }}>
                            {product.subtype || 'tech'}
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

                {isVisible('subcategory') && (
                    <td style={td}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {product.subcategory || '—'}
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

                {/* Per-row action buttons */}
                <td style={tdCenter} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                        {showArchived ? (
                            // Archived view: show Restore button
                            <button
                                title="Restore to Active"
                                onClick={() => onRestore?.(product.id)}
                                style={{ padding: '3px 5px', border: 'none', borderRadius: '4px', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#10b981'; e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.08)'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                                <ArchiveRestore size={13} />
                            </button>
                        ) : (
                            <>
                                {/* Archive */}
                                {onArchive && (
                                    <button
                                        title="Archive"
                                        onClick={() => { if (window.confirm(`Archive "${product.name}"?`)) onArchive(product.id); }}
                                        style={{ padding: '3px 5px', border: 'none', borderRadius: '4px', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                                        onMouseEnter={e => { e.currentTarget.style.color = '#f59e0b'; e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.08)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                        <Archive size={13} />
                                    </button>
                                )}
                                {/* Delete */}
                                <button
                                    title="Delete"
                                    onClick={() => onDelete?.(product.id)}
                                    style={{ padding: '3px 5px', border: 'none', borderRadius: '4px', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                    <Trash2 size={13} />
                                </button>
                            </>
                        )}
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div style={{ width: '100%' }}>
            {/* ── Bulk action bar ── */}
            {selectedIds.size > 0 && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 14px',
                    backgroundColor: 'rgba(99,102,241,0.08)',
                    borderBottom: '1px solid rgba(99,102,241,0.2)',
                    fontSize: '13px', color: 'var(--text-primary)',
                    flexShrink: 0
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
                    {onArchive && !showArchived && (
                        <button
                            onClick={handleBulkArchive}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                padding: '4px 12px', fontSize: '12px', fontWeight: 600,
                                backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b',
                                border: '1px solid rgba(245,158,11,0.25)', borderRadius: '6px',
                                cursor: 'pointer', transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.2)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.1)'}
                        >
                            <Archive size={12} /> Archive Selected
                        </button>
                    )}
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        style={{ fontSize: '12px', color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}
                    >
                        Clear
                    </button>
                </div>
            )}

            <div style={{ width: '100%' }}>
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
                            {isVisible('image')            && renderSortableHeader('image', 'Image', 'center', '44px')}
                            {isVisible('sku')              && renderSortableHeader('sku', 'SKU', 'left')}
                            {isVisible('name')             && renderSortableHeader('name', 'Name', 'left')}
                            {isVisible('type')             && renderSortableHeader('type', 'Type', 'left')}
                            {isVisible('subtype')          && renderSortableHeader('subtype', 'Subtype', 'left')}
                            {isVisible('job_type')         && renderSortableHeader('job_type', 'Job Type', 'left')}
                            {isVisible('category')         && renderSortableHeader('category', 'Category', 'left')}
                            {isVisible('subcategory')      && renderSortableHeader('subcategory', 'Subcategory', 'left')}
                            {isVisible('brand')            && renderSortableHeader('brand', 'Brand', 'left')}
                            {isVisible('current_stock')    && renderSortableHeader('current_stock', 'Stock', 'right')}
                            {isVisible('min_stock_level')  && renderSortableHeader('min_stock_level', 'Min Stock', 'right')}
                            {isVisible('sale_price')       && renderSortableHeader('sale_price', 'Sale Price', 'right')}
                            {isVisible('purchase_price')   && renderSortableHeader('purchase_price', 'Purchase', 'right')}
                            {isVisible('dealer_price')     && renderSortableHeader('dealer_price', 'Dealer', 'right')}
                            {isVisible('retail_price')     && renderSortableHeader('retail_price', 'Retail', 'right')}
                            {isVisible('unit_of_measure')  && renderSortableHeader('unit_of_measure', 'Unit', 'left')}
                            {isVisible('hsn_code')         && renderSortableHeader('hsn_code', 'HSN / SAC', 'left')}
                            {isVisible('hsn_description')  && renderSortableHeader('hsn_description', 'HSN Description', 'left')}
                            {isVisible('gst_rate')         && renderSortableHeader('gst_rate', 'GST %', 'right')}
                            {isVisible('status')           && renderSortableHeader('status', 'Status', 'center')}
                            {/* Delete action column */}
                            <th style={{ ...thCenter, width: '36px' }} />
                        </tr>
                    </thead>
                    <tbody>
                        {groupBy === 'none' ? (
                            products.map(renderRow)
                        ) : (
                            groupedProducts.map(({ label, items }) => (
                                <React.Fragment key={label || 'all'}>
                                    <tr style={{ backgroundColor: 'var(--bg-elevated)' }}>
                                        <td colSpan={100} style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-primary)', fontSize: '12px' }}>
                                            {label} <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 400 }}>({items.length} item{items.length !== 1 ? 's' : ''})</span>
                                        </td>
                                    </tr>
                                    {items.map(renderRow)}
                                </React.Fragment>
                            ))
                        )}
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
