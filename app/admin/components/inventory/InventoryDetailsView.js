'use client'

import { Package, DollarSign, TrendingUp, AlertCircle, Tag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/accountingHelpers';
import { getStockStatus, getStockStatusColor, getStockStatusLabel, formatStock } from '@/lib/utils/inventoryHelpers';
import { productCategories } from '@/lib/data/inventoryData';

function InventoryDetailsView({ products, onProductClick }) {
    const getCategoryName = (categoryId) => {
        const category = productCategories.find(c => c.id === categoryId);
        return category?.name || categoryId;
    };

    return (
        <div style={{ padding: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {products.map(product => {
                    const stockStatus = getStockStatus(product.currentStock, product.reorderLevel, product.type === 'service');
                    const statusColor = getStockStatusColor(stockStatus);
                    const statusLabel = getStockStatusLabel(stockStatus);
                    const margin = (product.salePrice || 0) - (product.purchasePrice || 0);
                    const marginPercent = product.purchasePrice ? ((margin / product.purchasePrice) * 100).toFixed(1) : 0;

                    return (
                        <div
                            key={product.id}
                            onClick={() => onProductClick?.(product)}
                            style={{
                                backgroundColor: 'var(--bg-elevated)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-lg)',
                                padding: 'var(--spacing-lg)',
                                cursor: 'pointer',
                                transition: 'all var(--transition-fast)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateX(4px)';
                                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                                e.currentTarget.style.borderColor = 'var(--color-primary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateX(0)';
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.borderColor = 'var(--border-primary)';
                            }}
                        >
                            {/* Header Row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                                        <Package size={24} style={{ color: 'var(--color-primary)' }} />
                                        <h3 style={{
                                            fontSize: 'var(--font-size-lg)',
                                            fontWeight: 600,
                                            color: 'var(--text-primary)',
                                            margin: 0
                                        }}>
                                            {product.name}
                                        </h3>
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                                        {product.sku}
                                    </div>
                                </div>

                                <div style={{
                                    padding: '6px 12px',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 600,
                                    backgroundColor: `${statusColor}20`,
                                    color: statusColor,
                                    textTransform: 'capitalize'
                                }}>
                                    {statusLabel}
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: 'var(--spacing-md)',
                                marginBottom: 'var(--spacing-md)'
                            }}>
                                {/* Category & Type */}
                                <div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                        Category & Type
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                        <Tag size={14} style={{ color: 'var(--text-secondary)' }} />
                                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>
                                            {getCategoryName(product.category)}
                                        </span>
                                        <span style={{
                                            padding: '2px 6px',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: 'var(--font-size-xs)',
                                            backgroundColor: 'var(--bg-tertiary)',
                                            color: 'var(--text-secondary)',
                                            textTransform: 'capitalize'
                                        }}>
                                            {product.type}
                                        </span>
                                    </div>
                                </div>

                                {/* Brand */}
                                {product.brand && (
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                            Brand
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>
                                            {product.brand}
                                        </div>
                                    </div>
                                )}

                                {/* Stock (for products only) */}
                                {product.type === 'product' && (
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                            Current Stock
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {formatStock(product.currentStock, product.unitOfMeasure)}
                                        </div>
                                        {product.reorderLevel && (
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                Reorder at: {product.reorderLevel}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Pricing Row */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                gap: 'var(--spacing-md)',
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                <div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                        Sale Price
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <DollarSign size={16} style={{ color: 'var(--color-success)' }} />
                                        <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {formatCurrency(product.salePrice)}
                                        </span>
                                    </div>
                                </div>

                                {product.purchasePrice && (
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                            Purchase Price
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                            {formatCurrency(product.purchasePrice)}
                                        </div>
                                    </div>
                                )}

                                {product.purchasePrice && (
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                            Profit Margin
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <TrendingUp size={16} style={{ color: 'var(--color-success)' }} />
                                            <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-success)' }}>
                                                {formatCurrency(margin)} ({marginPercent}%)
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {product.type === 'product' && product.currentStock && product.purchasePrice && (
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                            Stock Value
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {formatCurrency(product.currentStock * product.purchasePrice)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* GST Info */}
                            {product.gstApplicable && (
                                <div style={{
                                    marginTop: 'var(--spacing-sm)',
                                    padding: 'var(--spacing-sm)',
                                    backgroundColor: 'var(--bg-tertiary)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--text-secondary)'
                                }}>
                                    GST: {product.gstRate}% | HSN: {product.hsnCode}
                                </div>
                            )}

                            {/* Low Stock Warning */}
                            {stockStatus === 'low' && (
                                <div style={{
                                    marginTop: 'var(--spacing-sm)',
                                    padding: 'var(--spacing-sm)',
                                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                    borderRadius: 'var(--radius-sm)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-xs)',
                                    fontSize: 'var(--font-size-sm)',
                                    color: 'var(--color-warning)'
                                }}>
                                    <AlertCircle size={16} />
                                    Low stock - Consider reordering
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {products.length === 0 && (
                <div style={{
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

export default InventoryDetailsView;
