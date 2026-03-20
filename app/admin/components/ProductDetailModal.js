import { useState, useEffect } from 'react';
import { X, Package, BarChart2, MessageSquare, History, DollarSign, Edit2, Save, Trash2, ArrowUpRight, ArrowDownLeft, RefreshCcw, Plus, Paperclip, TrendingUp, TrendingDown, ShoppingCart, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/accountingHelpers';
import { getStockStatus, getStockStatusLabel, getStockStatusColor, formatStock } from '@/lib/utils/inventoryHelpers';
import { inventoryLogsAPI, inventoryMovementAPI } from '@/lib/adminAPI';
import { productCategories } from '@/lib/data/inventoryData';

function ProductDetailModal({ product, onClose, onUpdate, onDelete, categories = [] }) {
    const [activeTab, setActiveTab] = useState('details');
    const [isEditing, setIsEditing] = useState(false);
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [movement, setMovement] = useState([]);
    const [loadingMovement, setLoadingMovement] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [noteFiles, setNoteFiles] = useState([]);
    const [submittingNote, setSubmittingNote] = useState(false);

    const [editedProduct, setEditedProduct] = useState({
        ...product,
        sale_price: parseFloat(product.sale_price) || 0,
        purchase_price: parseFloat(product.purchase_price) || 0,
        current_stock: parseFloat(product.current_stock) || 0,
        min_stock_level: parseInt(product.min_stock_level) || 0
    });

    // Fetch logs when interactions tab is active
    useEffect(() => {
        if (activeTab === 'interactions' && product.id) {
            const fetchLogs = async () => {
                try {
                    setLoadingLogs(true);
                    const logData = await inventoryLogsAPI.getByInventoryId(product.id);
                    setLogs(logData || []);
                } catch (err) {
                    console.error('Failed to fetch inventory logs:', err);
                } finally {
                    setLoadingLogs(false);
                }
            };
            fetchLogs();
        }
    }, [activeTab, product.id]);

    // Fetch movement data when analysis tab is active
    useEffect(() => {
        if (activeTab === 'analysis' && product.id) {
            const fetchMovement = async () => {
                try {
                    setLoadingMovement(true);
                    const movementData = await inventoryMovementAPI.getByInventoryId(product.id);
                    setMovement(movementData || []);
                } catch (err) {
                    console.error('Failed to fetch movement data:', err);
                } finally {
                    setLoadingMovement(false);
                }
            };
            fetchMovement();
        }
    }, [activeTab, product.id]);

    const tabs = [
        { id: 'details', label: 'Master Details', icon: Package },
        { id: 'interactions', label: 'Interactions', icon: MessageSquare },
        { id: 'analysis', label: 'Analysis', icon: BarChart2 },
    ];

    const stockStatus = getStockStatus(product.current_stock, product.min_stock_level, product.type === 'service');
    const statusColor = getStockStatusColor(stockStatus);
    const statusLabel = getStockStatusLabel(stockStatus);
    const categoryName = (categories.length > 0 ? categories : productCategories).find(c => c.id === product.category)?.name || product.category;

    const handleSave = () => {
        onUpdate(editedProduct);
        setIsEditing(false);
    };

    // ── Interaction helpers ────────────────────────────────────────────────────

    const getInteractionIcon = (type) => {
        switch (type) {
            case 'sale': return ShoppingCart;
            case 'purchase': return ShoppingCart;
            case 'edit': return Edit2;
            case 'initial': return Package;
            case 'adjustment': return RefreshCcw;
            default: return FileText;
        }
    };

    const getInteractionColor = (type) => {
        switch (type) {
            case 'sale': return '#10b981';
            case 'purchase': return '#6366f1';
            case 'edit': return '#f59e0b';
            case 'initial': return '#3b82f6';
            case 'adjustment': return '#8b5cf6';
            default: return 'var(--text-secondary)';
        }
    };

    const getInteractionLabel = (log) => {
        switch (log.type) {
            case 'edit': return 'Product details edited';
            case 'initial': return `Opening stock set: ${log.new_quantity} ${product.unit_of_measure || 'pcs'}`;
            case 'adjustment': return log.notes || 'Stock adjusted';
            case 'sale': return `Used in sales invoice`;
            case 'purchase': return `Added via purchase invoice`;
            default: return log.notes || log.type;
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        setSubmittingNote(true);
        try {
            await inventoryLogsAPI.create({
                inventory_id: product.id,
                type: 'note',
                quantity_changed: 0,
                previous_quantity: product.current_stock || 0,
                new_quantity: product.current_stock || 0,
                reference_type: 'manual',
                notes: newNote.trim()
            });
            // Refresh logs
            const logData = await inventoryLogsAPI.getByInventoryId(product.id);
            setLogs(logData || []);
            setNewNote('');
            setNoteFiles([]);
        } catch (err) {
            console.error('Failed to add note:', err);
        } finally {
            setSubmittingNote(false);
        }
    };

    // ── Analysis calculations ──────────────────────────────────────────────────

    const salesMovement = movement.filter(m => m.type === 'sale');
    const purchaseMovement = movement.filter(m => m.type === 'purchase');

    const totalSalesQty = salesMovement.reduce((sum, m) => sum + (m.qty || 0), 0);
    const totalPurchaseQty = purchaseMovement.reduce((sum, m) => sum + (m.qty || 0), 0);
    const openingQty = parseFloat(product.opening_balance_qty) || 0;
    const calculatedClosing = openingQty + totalPurchaseQty - totalSalesQty;

    const avgSalePrice = salesMovement.length > 0
        ? salesMovement.reduce((sum, m) => sum + (m.unit_price || 0), 0) / salesMovement.length
        : null;
    const avgPurchasePrice = purchaseMovement.length > 0
        ? purchaseMovement.reduce((sum, m) => sum + (m.unit_price || 0), 0) / purchaseMovement.length
        : null;

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
                        <button
                            className="btn btn-secondary"
                            style={{ color: '#ef4444', borderColor: '#ef4444' }}
                            onClick={onDelete}
                        >
                            <Trash2 size={16} />
                        </button>
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
                                style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="modal-content" style={{ padding: 'var(--spacing-lg)', maxHeight: '60vh', overflowY: 'auto' }}>

                    {/* ══ MASTER DETAILS TAB ══════════════════════════════════ */}
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
                                            <option value="">Select Category</option>
                                            {(categories.length > 0 ? categories : productCategories).map(cat => (
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
                                            value={editedProduct.unit_of_measure || ''}
                                            onChange={(e) => setEditedProduct({ ...editedProduct, unit_of_measure: e.target.value })}
                                            disabled={!isEditing || product.type === 'service'}
                                            style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Pricing Information */}
                            <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: 'var(--text-primary)' }}>
                                    Pricing Information
                                </h3>
                                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Sale Price *</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={editedProduct.sale_price}
                                            onChange={(e) => setEditedProduct({ ...editedProduct, sale_price: parseFloat(e.target.value) || 0 })}
                                            disabled={!isEditing}
                                            style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Purchase Price</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={editedProduct.purchase_price}
                                            onChange={(e) => setEditedProduct({ ...editedProduct, purchase_price: parseFloat(e.target.value) || 0 })}
                                            disabled={!isEditing}
                                            placeholder="0.00"
                                            style={{ backgroundColor: isEditing ? 'var(--bg-primary)' : 'var(--bg-elevated)' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-sm)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Profit Margin:</span>
                                    <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, color: 'var(--color-success)' }}>
                                        {formatCurrency((parseFloat(editedProduct.sale_price) || 0) - (parseFloat(editedProduct.purchase_price) || 0))}
                                    </span>
                                </div>
                            </div>

                            {/* GST Details */}
                            {product.gst_applicable && (
                                <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                                    <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: 'var(--text-primary)' }}>
                                        GST Details
                                    </h3>
                                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                        <div className="form-group">
                                            <label className="form-label">GST Rate</label>
                                            <input type="text" className="form-input" value={`${product.gst_rate || 0}%`} disabled style={{ backgroundColor: 'var(--bg-elevated)' }} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">HSN/SAC Code</label>
                                            <input type="text" className="form-input" value={product.hsn_code || product.sac_code || ''} disabled style={{ backgroundColor: 'var(--bg-elevated)', fontFamily: 'monospace' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}


                    {/* ══ INTERACTIONS TAB ════════════════════════════════════ */}
                    {activeTab === 'interactions' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>

                            {/* Add Note Section */}
                            <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', padding: 'var(--spacing-md)' }}>
                                <h4 style={{ margin: '0 0 var(--spacing-sm)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Add Note</h4>
                                <textarea
                                    className="form-textarea"
                                    rows={3}
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Add a note about this product (e.g. changed supplier, price negotiated)..."
                                    style={{ marginBottom: 'var(--spacing-sm)', resize: 'vertical' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                        <Paperclip size={14} />
                                        Attach file
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*,application/pdf"
                                            style={{ display: 'none' }}
                                            onChange={(e) => setNoteFiles(Array.from(e.target.files))}
                                        />
                                        {noteFiles.length > 0 && <span style={{ color: 'var(--color-primary)' }}>({noteFiles.length} file{noteFiles.length > 1 ? 's' : ''})</span>}
                                    </label>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleAddNote}
                                        disabled={!newNote.trim() || submittingNote}
                                        style={{ fontSize: 'var(--font-size-sm)', padding: '6px 14px' }}
                                    >
                                        <Plus size={14} />
                                        {submittingNote ? 'Saving...' : 'Add Note'}
                                    </button>
                                </div>
                            </div>

                            {/* Interaction Timeline */}
                            {loadingLogs ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)' }}>
                                    <RefreshCcw size={16} style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} />
                                    Loading interactions...
                                </div>
                            ) : logs.length === 0 ? (
                                <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-tertiary)', border: '2px dashed var(--border-primary)', borderRadius: 'var(--radius-md)' }}>
                                    <MessageSquare size={36} style={{ margin: '0 auto var(--spacing-sm)', opacity: 0.4 }} />
                                    <p style={{ fontWeight: 500 }}>No interactions yet</p>
                                    <p style={{ fontSize: 'var(--font-size-sm)' }}>Interactions will appear here as this product is used in invoices or edited.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                    {logs.map((log, idx) => {
                                        const Icon = getInteractionIcon(log.type);
                                        const color = getInteractionColor(log.type);
                                        const isLast = idx === logs.length - 1;
                                        return (
                                            <div key={log.id} style={{ display: 'flex', gap: 'var(--spacing-md)', position: 'relative' }}>
                                                {/* Timeline line */}
                                                {!isLast && (
                                                    <div style={{ position: 'absolute', left: '16px', top: '36px', bottom: 0, width: '2px', backgroundColor: 'var(--border-primary)' }} />
                                                )}
                                                {/* Icon */}
                                                <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: `${color}18`, border: `2px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                                                    <Icon size={14} style={{ color }} />
                                                </div>
                                                {/* Content */}
                                                <div style={{ flex: 1, paddingBottom: 'var(--spacing-md)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-sm)', marginBottom: '2px' }}>
                                                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>
                                                            {getInteractionLabel(log)}
                                                        </span>
                                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 500, letterSpacing: '0.04em', backgroundColor: `${color}14`, padding: '1px 6px', borderRadius: '4px' }}>
                                                            {log.type}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                                        {new Date(log.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        {' · '}
                                                        {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ══ ANALYSIS TAB ════════════════════════════════════════ */}
                    {activeTab === 'analysis' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                            {/* Summary Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--spacing-md)' }}>
                                {/* Current Sale Price */}
                                <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <TrendingUp size={12} /> Current Sale Price
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: '#10b981' }}>
                                        {formatCurrency(product.sale_price)}
                                    </div>
                                    {avgSalePrice !== null && (
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                            Avg sold: {formatCurrency(avgSalePrice)}
                                        </div>
                                    )}
                                </div>

                                {/* Current Purchase Price */}
                                <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <TrendingDown size={12} /> Current Purchase Price
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: '#6366f1' }}>
                                        {formatCurrency(product.purchase_price)}
                                    </div>
                                    {avgPurchasePrice !== null && (
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                            Avg purchased: {formatCurrency(avgPurchasePrice)}
                                        </div>
                                    )}
                                </div>

                                {/* Stock Now */}
                                {product.type === 'product' && (
                                    <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Package size={12} /> Current Stock
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: statusColor }}>
                                            {formatStock(product.current_stock, product.unit_of_measure)}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                            Value: {formatCurrency((product.current_stock || 0) * (product.purchase_price || 0))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Stock Equation — Products Only */}
                            {product.type === 'product' && (
                                <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                                    <h4 style={{ margin: '0 0 var(--spacing-md)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Stock Calculation</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-sm)', textAlign: 'center' }}>
                                        {[
                                            { label: 'Opening Stock', value: openingQty, color: 'var(--text-primary)' },
                                            { label: '+ Purchased', value: totalPurchaseQty, color: '#6366f1' },
                                            { label: '− Sold', value: totalSalesQty, color: '#ef4444' },
                                            { label: '= Closing Stock', value: calculatedClosing, color: '#10b981' }
                                        ].map((item, i) => (
                                            <div key={i} style={{ padding: 'var(--spacing-sm)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>{item.label}</div>
                                                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: item.color }}>
                                                    {item.value} <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 400 }}>{product.unit_of_measure || 'pcs'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Movement Table */}
                            <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
                                <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Movement Analysis</h4>
                                    {loadingMovement && <RefreshCcw size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                                </div>

                                {!loadingMovement && movement.length > 0 ? (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}>
                                            <thead style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                                <tr>
                                                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Date</th>
                                                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Voucher</th>
                                                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>Type</th>
                                                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Party</th>
                                                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Qty</th>
                                                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Unit Price</th>
                                                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {movement.map((entry, i) => {
                                                    const isSale = entry.type === 'sale';
                                                    return (
                                                        <tr key={i} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                                                                {new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </td>
                                                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                                                                {entry.voucher_number}
                                                            </td>
                                                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                                <span style={{
                                                                    padding: '2px 8px',
                                                                    borderRadius: 'var(--radius-sm)',
                                                                    fontSize: '10px',
                                                                    fontWeight: 600,
                                                                    backgroundColor: isSale ? '#10b98118' : '#6366f118',
                                                                    color: isSale ? '#10b981' : '#6366f1'
                                                                }}>
                                                                    {isSale ? 'SALE' : 'PURCHASE'}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{entry.party}</td>
                                                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: isSale ? '#ef4444' : '#10b981' }}>
                                                                {isSale ? '−' : '+'}{entry.qty} {product.unit_of_measure || 'pcs'}
                                                            </td>
                                                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatCurrency(entry.unit_price)}</td>
                                                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(entry.qty * entry.unit_price)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            {/* Summary row */}
                                            <tfoot style={{ backgroundColor: 'var(--bg-elevated)', borderTop: '2px solid var(--border-primary)' }}>
                                                <tr>
                                                    <td colSpan={4} style={{ padding: '10px 12px', fontWeight: 600 }}>Total</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                                                        <span style={{ color: '#10b981' }}>+{totalPurchaseQty}</span>
                                                        {' / '}
                                                        <span style={{ color: '#ef4444' }}>−{totalSalesQty}</span>
                                                    </td>
                                                    <td style={{ padding: '10px 12px' }} />
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                                                        {formatCurrency(movement.reduce((sum, m) => sum + (m.qty * m.unit_price), 0))}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                ) : !loadingMovement ? (
                                    <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                        <BarChart2 size={36} style={{ margin: '0 auto var(--spacing-sm)', opacity: 0.4 }} />
                                        <p style={{ fontWeight: 500 }}>No movement data yet</p>
                                        <p style={{ fontSize: 'var(--font-size-sm)' }}>Movement will appear here as this product is used in sales and purchase invoices.</p>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer" style={{ borderTop: '2px solid var(--border-primary)', padding: 'var(--spacing-md) var(--spacing-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                            Last updated: {product.updated_at ? new Date(product.updated_at).toLocaleDateString('en-GB') : 'N/A'}
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
