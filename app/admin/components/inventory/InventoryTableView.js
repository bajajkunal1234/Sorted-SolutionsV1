'use client'

import { formatCurrency } from '@/lib/utils/accountingHelpers';
import { getStockStatus, getStockStatusColor, getStockStatusLabel, formatStock } from '@/lib/utils/inventoryHelpers';
import { productCategories } from '@/lib/data/inventoryData';

function InventoryTableView({ products, onProductClick, categories = [], visibleColumns }) {
    const getCategoryName = (categoryId) => {
        const category = categories.find(c => c.id === categoryId);
        return category?.name || categoryId;
    };

    const isVisible = (col) => !visibleColumns || visibleColumns.has(col);

    const thStyle = { padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600, resize: 'horizontal', overflow: 'hidden', minWidth: '80px', position: 'relative' };
    const thStyleRight = { ...thStyle, textAlign: 'right' };
    const thStyleCenter = { ...thStyle, textAlign: 'center' };

    return (
        <div style={{ padding: 'var(--spacing-md)' }}>
            <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 'var(--font-size-sm)'
            }}>
                <thead>
                    <tr style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderBottom: '2px solid var(--border-primary)'
                    }}>
                        {isVisible('sku') && <th style={thStyle}>SKU</th>}
                        {isVisible('name') && <th style={thStyle}>Name</th>}
                        {isVisible('type') && <th style={thStyle}>Type</th>}
                        {isVisible('category') && <th style={thStyle}>Category</th>}
                        {isVisible('brand') && <th style={thStyle}>Brand</th>}
                        {isVisible('currentStock') && <th style={thStyleRight}>Stock</th>}
                        {isVisible('salePrice') && <th style={thStyleRight}>Price</th>}
                        {isVisible('status') && <th style={thStyleCenter}>Status</th>}
                    </tr>
                </thead>
                <tbody>
                    {products.map(product => {
                        const stockStatus = getStockStatus(product.currentStock, product.reorderLevel, product.type === 'service');
                        const statusColor = getStockStatusColor(stockStatus);
                        const statusLabel = getStockStatusLabel(stockStatus);

                        return (
                            <tr
                                key={product.id}
                                onClick={() => onProductClick?.(product)}
                                style={{
                                    borderBottom: '1px solid var(--border-primary)',
                                    transition: 'background-color var(--transition-fast)',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                {isVisible('sku') && <td style={{ padding: 'var(--spacing-sm)' }}>
                                    <span style={{
                                        fontFamily: 'monospace',
                                        fontSize: 'var(--font-size-xs)',
                                        color: 'var(--text-tertiary)'
                                    }}>
                                        {product.sku}
                                    </span>
                                </td>}
                                {isVisible('name') && <td style={{ padding: 'var(--spacing-sm)' }}>
                                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                        {product.name}
                                    </div>
                                    {product.hsnCode && (
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                            HSN: {product.hsnCode}
                                        </div>
                                    )}
                                </td>}
                                {isVisible('type') && <td style={{ padding: 'var(--spacing-sm)' }}>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: 'var(--font-size-xs)',
                                        backgroundColor: 'var(--bg-tertiary)',
                                        textTransform: 'capitalize'
                                    }}>
                                        {product.type}
                                    </span>
                                </td>}
                                {isVisible('category') && <td style={{ padding: 'var(--spacing-sm)' }}>
                                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                        {getCategoryName(product.category)}
                                    </span>
                                </td>}
                                {isVisible('brand') && <td style={{ padding: 'var(--spacing-sm)' }}>
                                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                        {product.brand || '-'}
                                    </span>
                                </td>}
                                {isVisible('currentStock') && <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>
                                    {product.type === 'service' ? (
                                        <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}>N/A</span>
                                    ) : (
                                        <span style={{ fontWeight: 500 }}>
                                            {formatStock(product.currentStock, product.unitOfMeasure)}
                                        </span>
                                    )}
                                </td>}
                                {isVisible('salePrice') && <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>
                                    <span style={{ fontWeight: 600 }}>
                                        {formatCurrency(product.salePrice)}
                                    </span>
                                </td>}
                                {isVisible('status') && <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                    <span style={{
                                        display: 'inline-block',
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        backgroundColor: statusColor
                                    }}
                                        title={statusLabel}
                                    />
                                </td>}
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {products.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: 'var(--spacing-2xl)',
                    color: 'var(--text-tertiary)'
                }}>
                    No products found. Try adjusting your filters.
                </div>
            )}
        </div>
    );
}

export default InventoryTableView;
