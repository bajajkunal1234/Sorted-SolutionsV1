'use client'

import { Package, DollarSign, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/accountingHelpers';
import { getStockStatus, getStockStatusColor, getStockStatusLabel, formatStock } from '@/lib/utils/inventoryHelpers';
import { productCategories } from '@/lib/data/inventoryData';

function InventoryCardView({ products, onProductClick }) {
    const getCategoryName = (categoryId) => {
        const category = productCategories.find(c => c.id === categoryId);
        return category?.name || categoryId;
    };

    return (
        <div style={{
            padding: 'var(--spacing-md)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 'var(--spacing-md)'
        }}>
            {products.map(product => {
                const stockStatus = getStockStatus(product.currentStock, product.reorderLevel, product.type === 'service');
                const statusColor = getStockStatusColor(stockStatus);
                const statusLabel = getStockStatusLabel(stockStatus);

                return (
                    <div
                        key={product.id}
                        onClick={() => onProductClick?.(product)}
                        style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--spacing-md)',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--spacing-sm)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                            e.currentTarget.style.borderColor = 'var(--color-primary)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.borderColor = 'var(--border-primary)';
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                                <h3 style={{
                                    fontSize: 'var(--font-size-base)',
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    marginBottom: '4px',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                }}>
                                    {product.name}
                                </h3>
                                <div style={{
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--text-tertiary)',
                                    fontFamily: 'monospace'
                                }}>
                                    {product.sku}
                                </div>
                            </div>
                            <div style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: statusColor,
                                flexShrink: 0,
                                marginLeft: 'var(--spacing-sm)'
                            }}
                                title={statusLabel}
                            />
                        </div>

                        {/* Icon */}
                        <div style={{
                            width: '100%',
                            height: '120px',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <Package size={48} style={{ color: 'var(--text-tertiary)', opacity: 0.3 }} />
                            {product.type === 'service' && (
                                <div style={{
                                    position: 'absolute',
                                    top: 'var(--spacing-xs)',
                                    right: 'var(--spacing-xs)',
                                    padding: '2px 8px',
                                    backgroundColor: 'var(--color-info)',
                                    color: 'var(--text-inverse)',
                                    fontSize: 'var(--font-size-xs)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontWeight: 500
                                }}>
                                    Service
                                </div>
                            )}
                            {product.type === 'combo' && (
                                <div style={{
                                    position: 'absolute',
                                    top: 'var(--spacing-xs)',
                                    right: 'var(--spacing-xs)',
                                    padding: '2px 8px',
                                    backgroundColor: 'var(--color-secondary)',
                                    color: 'var(--text-inverse)',
                                    fontSize: 'var(--font-size-xs)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontWeight: 500
                                }}>
                                    Combo
                                </div>
                            )}
                        </div>

                        {/* Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                    Category
                                </span>
                                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--text-primary)' }}>
                                    {getCategoryName(product.category)}
                                </span>
                            </div>

                            {product.brand && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        Brand
                                    </span>
                                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--text-primary)' }}>
                                        {product.brand}
                                    </span>
                                </div>
                            )}

                            {product.type === 'product' && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        Stock
                                    </span>
                                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {formatStock(product.currentStock, product.unitOfMeasure)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{
                            paddingTop: 'var(--spacing-sm)',
                            borderTop: '1px solid var(--border-primary)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <DollarSign size={14} style={{ color: 'var(--text-tertiary)' }} />
                                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {formatCurrency(product.salePrice)}
                                </span>
                            </div>

                            {stockStatus === 'low' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertCircle size={14} style={{ color: 'var(--color-warning)' }} />
                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning)', fontWeight: 500 }}>
                                        Low Stock
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {products.length === 0 && (
                <div style={{
                    gridColumn: '1 / -1',
                    padding: 'var(--spacing-2xl)',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)'
                }}>
                    No products found. Try adjusting your filters.
                </div>
            )}
        </div>
    );
}

export default InventoryCardView;
