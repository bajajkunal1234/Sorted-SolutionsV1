'use client'

import { useState } from 'react';
import { X, Package, FileText, Bell, History, DollarSign, Edit2, Save } from 'lucide-react';
import { formatCurrency } from '@/utils/accountingHelpers';
import { getStockStatus, getStockStatusLabel, getStockStatusColor, formatStock } from '@/utils/inventoryHelpers';
import { productCategories } from '@/data/inventoryData';

function ProductDetailModal({ product, onClose, onUpdate }) {
    const [activeTab, setActiveTab] = useState('details');
    const [isEditing, setIsEditing] = useState(false);
    const [editedProduct, setEditedProduct] = useState(product);

    const tabs = [
        { id: 'details', label: 'Master Details', icon: Package },
        { id: 'stock', label: 'Stock Movement', icon: History },
        { id: 'notes', label: 'Log Notes', icon: FileText },
        { id: 'reminders', label: 'Reminders', icon: Bell },
        { id: 'pricing', label: 'Pricing History', icon: DollarSign }
    ];

    const stockStatus = getStockStatus(product.currentStock, product.reorderLevel, product.type === 'service');
    const statusColor = getStockStatusColor(stockStatus);
    const statusLabel = getStockStatusLabel(stockStatus);
    const categoryName = productCategories.find(c => c.id === product.category)?.name || product.category;

    const handleSave = () => {
        onUpdate(editedProduct);
        setIsEditing(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh' }}>
                {/* Header */}
                <div className="modal-header" style={{ borderBottom: '2px solid var(--border-primary)' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                            <h2 className="modal-title" style={{ margin: 0 }}>{product.name}</h2>
                            <span style={{
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 'var(--font-size-xs)',
                                backgroundColor: `${statusColor}20`,
                                color: statusColor,
                                fontWeight: 500,
                                textTransform: 'capitalize'
                            }}>
                                {statusLabel}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: '4px', fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
                            <span style={{ fontFamily: 'monospace' }}>{product.sku}</span>
                            <span>•</span>
                            <span>{categoryName}</span>
                            <span>•</span>
                            <span style={{ textTransform: 'capitalize' }}>{product.type}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                        {activeTab === 'details' && (
                            <button
                                className="btn btn-secondary"
                                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                style={{ fontSize: 'var(--font-size-sm)' }}
                            >
                                {isEditing ? <><Save size={16} /> Save</> : <><Edit2 size={16} /> Edit</>}
                            </button>
                        )}
                        <button className="btn-icon" onClick={onClose} style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="modal-tabs" style={{ borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                className={`modal-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                    fontSize: 'var(--font-size-sm)'
                                }}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="modal-content" style={{ padding: 'var(--spacing-lg)', maxHeight: '60vh', overflowY: 'auto' }}>
                    {activeTab === 'details' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                            {/* Basic Information */}
                            <div>
                                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: 'var(--text-primary)' }}>
                                    Basic Information
                                </h3>
                                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Product Name *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={editedProduct.name}
                                            onChange={(e) => setEditedProduct({ ...editedProduct, name: e.target.value })}
                                            disabled={!isEditing}
                                            style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)' }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">SKU Code</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={editedProduct.sku}
                                            disabled
                                            style={{ backgroundColor: 'var(--bg-tertiary)', fontFamily: 'monospace' }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Type</label>
                                        <select className="form-select" value={editedProduct.type} disabled style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                            <option value="product">Product</option>
                                            <option value="service">Service</option>
                                            <option value="combo">Combo</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Category *</label>
                                        <select
                                            className="form-select"
                                            value={editedProduct.category}
                                            onChange={(e) => setEditedProduct({ ...editedProduct, category: e.target.value })}
                                            disabled={!isEditing}
                                            style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)' }}
                                        >
                                            {productCategories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Brand</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={editedProduct.brand || ''}
                                            onChange={(e) => setEditedProduct({ ...editedProduct, brand: e.target.value })}
                                            disabled={!isEditing}
                                            placeholder="Enter brand name"
                                            style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)' }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Unit of Measure</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={editedProduct.unitOfMeasure}
                                            disabled
                                            style={{ backgroundColor: 'var(--bg-tertiary)' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Pricing Information */}
                            <div style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-primary)'
                            }}>
                                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: 'var(--text-primary)' }}>
                                    Pricing Information
                                </h3>
                                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Sale Price *</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={editedProduct.salePrice}
                                            onChange={(e) => setEditedProduct({ ...editedProduct, salePrice: parseFloat(e.target.value) })}
                                            disabled={!isEditing}
                                            style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Purchase Price</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={editedProduct.purchasePrice || 0}
                                            onChange={(e) => setEditedProduct({ ...editedProduct, purchasePrice: parseFloat(e.target.value) })}
                                            disabled={!isEditing}
                                            placeholder="0.00"
                                            style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                        />
                                    </div>
                                </div>

                                <div style={{
                                    marginTop: 'var(--spacing-md)',
                                    padding: 'var(--spacing-sm)',
                                    backgroundColor: 'var(--bg-elevated)',
                                    borderRadius: 'var(--radius-sm)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Profit Margin:</span>
                                    <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, color: 'var(--color-success)' }}>
                                        {formatCurrency((editedProduct.salePrice || 0) - (editedProduct.purchasePrice || 0))}
                                    </span>
                                </div>
                            </div>

                            {/* Stock Information */}
                            {product.type === 'product' && (
                                <div style={{
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-primary)'
                                }}>
                                    <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: 'var(--text-primary)' }}>
                                        Stock Information
                                    </h3>
                                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                        <div className="form-group">
                                            <label className="form-label">Current Stock</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={editedProduct.currentStock || 0}
                                                disabled
                                                style={{ backgroundColor: 'var(--bg-elevated)', fontWeight: 600 }}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Reorder Level</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={editedProduct.reorderLevel || 0}
                                                onChange={(e) => setEditedProduct({ ...editedProduct, reorderLevel: parseInt(e.target.value) })}
                                                disabled={!isEditing}
                                                style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Stock Value</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formatCurrency((editedProduct.currentStock || 0) * (editedProduct.purchasePrice || 0))}
                                                disabled
                                                style={{ backgroundColor: 'var(--bg-elevated)', fontWeight: 600 }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* GST Details */}
                            {product.gstApplicable && (
                                <div style={{
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-primary)'
                                }}>
                                    <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: 'var(--text-primary)' }}>
                                        GST Details
                                    </h3>
                                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                        <div className="form-group">
                                            <label className="form-label">GST Rate</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={`${product.gstRate}%`}
                                                disabled
                                                style={{ backgroundColor: 'var(--bg-elevated)' }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">HSN Code</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={product.hsnCode}
                                                disabled
                                                style={{ backgroundColor: 'var(--bg-elevated)', fontFamily: 'monospace' }}
                                            />
                                        </div>
                                    </div>
                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--spacing-xs)', fontStyle: 'italic' }}>
                                        {product.hsnDescription}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'stock' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            {/* Stock Summary Cards */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: 'var(--spacing-md)'
                            }}>
                                <div style={{
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-primary)'
                                }}>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                        Current Stock
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {formatStock(product.currentStock, product.unitOfMeasure)}
                                    </div>
                                </div>

                                <div style={{
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-primary)'
                                }}>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                        Reorder Level
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-warning)' }}>
                                        {product.reorderLevel || 0}
                                    </div>
                                </div>

                                <div style={{
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-primary)'
                                }}>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                        Stock Status
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: statusColor }}>
                                        {statusLabel}
                                    </div>
                                </div>
                            </div>

                            {/* Stock Movement Placeholder */}
                            <div style={{
                                padding: 'var(--spacing-xl)',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                textAlign: 'center',
                                color: 'var(--text-tertiary)',
                                border: '2px dashed var(--border-primary)'
                            }}>
                                <History size={48} style={{ margin: '0 auto var(--spacing-md)', opacity: 0.5 }} />
                                <p style={{ fontSize: 'var(--font-size-md)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                    Stock Movement History
                                </p>
                                <p style={{ fontSize: 'var(--font-size-sm)' }}>
                                    Purchase orders, sales, and stock adjustments will appear here
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notes' && (
                        <div style={{
                            padding: 'var(--spacing-xl)',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            textAlign: 'center',
                            color: 'var(--text-tertiary)',
                            border: '2px dashed var(--border-primary)'
                        }}>
                            <FileText size={48} style={{ margin: '0 auto var(--spacing-md)', opacity: 0.5 }} />
                            <p style={{ fontSize: 'var(--font-size-md)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Log Notes
                            </p>
                            <p style={{ fontSize: 'var(--font-size-sm)' }}>
                                Add notes, images, and documents related to this product
                            </p>
                        </div>
                    )}

                    {activeTab === 'reminders' && (
                        <div style={{
                            padding: 'var(--spacing-xl)',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            textAlign: 'center',
                            color: 'var(--text-tertiary)',
                            border: '2px dashed var(--border-primary)'
                        }}>
                            <Bell size={48} style={{ margin: '0 auto var(--spacing-md)', opacity: 0.5 }} />
                            <p style={{ fontSize: 'var(--font-size-md)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Reminders
                            </p>
                            <p style={{ fontSize: 'var(--font-size-sm)' }}>
                                Set reminders for low stock, reorder points, and expiry dates
                            </p>
                        </div>
                    )}

                    {activeTab === 'pricing' && (
                        <div style={{
                            padding: 'var(--spacing-xl)',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            textAlign: 'center',
                            color: 'var(--text-tertiary)',
                            border: '2px dashed var(--border-primary)'
                        }}>
                            <DollarSign size={48} style={{ margin: '0 auto var(--spacing-md)', opacity: 0.5 }} />
                            <p style={{ fontSize: 'var(--font-size-md)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Pricing History
                            </p>
                            <p style={{ fontSize: 'var(--font-size-sm)' }}>
                                Track price changes and margin history over time
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer" style={{ borderTop: '2px solid var(--border-primary)', padding: 'var(--spacing-md) var(--spacing-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                            Last updated: {new Date().toLocaleDateString()}
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <button className="btn btn-secondary" onClick={onClose}>
                                Close
                            </button>
                            {isEditing && (
                                <button className="btn btn-primary" onClick={handleSave}>
                                    <Save size={16} />
                                    Save Changes
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProductDetailModal;





