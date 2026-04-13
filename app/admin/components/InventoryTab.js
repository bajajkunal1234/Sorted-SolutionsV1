'use client'

import { useState, useEffect } from 'react';
import { Search, Plus, Grid, Columns, Table as TableIcon, List, ChevronDown, X } from 'lucide-react';
import { inventoryAPI, inventoryCategoriesAPI, inventoryBrandsAPI, inventoryLogsAPI, printTemplatesAPI } from '@/lib/adminAPI';
import { productCategories, stockStatuses } from '@/lib/data/inventoryData';
import { filterProducts, sortProducts, getUniqueBrands, getStockStatus } from '@/lib/utils/inventoryHelpers';
import InventoryTableView from './inventory/InventoryTableView';
import InventoryCardView from './inventory/InventoryCardView';
import InventoryKanbanView from './inventory/InventoryKanbanView';
import InventoryDetailsView from './inventory/InventoryDetailsView';
import ProductDetailModal from './ProductDetailModal';
import NewProductForm from './inventory/NewProductForm';
import InventorySearchPanel from '@/components/shared/InventorySearchPanel';
import ImportExportButtons from './shared/ImportExportButtons';

function InventoryTab() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [managedBrands, setManagedBrands] = useState([]);
    const [termsTemplates, setTermsTemplates] = useState([]);
    const [error, setError] = useState(null);
    const [viewType, setViewType] = useState('table');
    const [searchTerm, setSearchTerm] = useState('');
    const [groupBy, setGroupBy] = useState('none');
    const [sortBy, setSortBy] = useState('name');
    const [activeTags, setActiveTags] = useState([]);
    const [savedViews, setSavedViews] = useState([]);
    const [saveStatus, setSaveStatus] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 25;

    useEffect(() => {
        const saved = localStorage.getItem('sorted_inventory_views');
        if (saved) {
            try { setSavedViews(JSON.parse(saved)); } catch (e) {}
        }
    }, []);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Bubble newly-created categories/brands into parent state so next
    // form open doesn't re-fetch and lose them.
    const handleCategoryAdded = (newCat) => {
        setCategories(prev => {
            if (prev.some(c => c.id === newCat.id)) return prev;
            return [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name));
        });
    };
    const handleBrandAdded = (newBrand) => {
        setManagedBrands(prev => {
            if (prev.some(b => b.id === newBrand.id)) return prev;
            return [...prev, newBrand].sort((a, b) => a.name.localeCompare(b.name));
        });
    };

    // Fetch products on mount
    useEffect(() => {
        const fetchInventory = async () => {
            try {
                setLoading(true);
                // Fetch products first for faster initial load
                const productData = await inventoryAPI.getAll();

                const normalizedProducts = (productData || []).map(p => {
                    const currentStock = p.current_stock !== undefined ? p.current_stock : (p.currentStock !== undefined ? p.currentStock : p.quantity);
                    const minStockLevel = p.min_stock_level !== undefined ? p.min_stock_level : (p.minStockLevel !== undefined ? p.minStockLevel : p.reorder_level);
                    const isService = p.type === 'service';

                    return {
                        ...p,
                        // Normalize snake_case to camelCase for helper & component compatibility
                        currentStock,
                        minStockLevel,
                        reorderLevel: minStockLevel,
                        salePrice: p.sale_price !== undefined ? p.sale_price : (p.salePrice !== undefined ? p.salePrice : p.selling_price),
                        purchasePrice: p.purchase_price !== undefined ? p.purchase_price : (p.purchasePrice !== undefined ? p.purchasePrice : p.cost_price),
                        unitOfMeasure: p.unit_of_measure !== undefined ? p.unit_of_measure : (p.unitOfMeasure !== undefined ? p.unitOfMeasure : p.unit),
                        hsnCode: p.hsn_code !== undefined ? p.hsn_code : p.hsnCode,
                        stockStatus: getStockStatus(currentStock, minStockLevel, isService)
                    };
                });
                setProducts(normalizedProducts);
                setError(null);
                setLoading(false); // Immediate stop for products

                // Background fetch for non-critical data
                Promise.all([
                    inventoryCategoriesAPI.getAll(),
                    inventoryBrandsAPI.getAll(),
                    printTemplatesAPI.getAll()
                ]).then(([catData, brandData, tempData]) => {
                    setCategories(catData || []);
                    setManagedBrands(brandData || []);
                    setTermsTemplates(tempData || []);
                }).catch(err => console.error('Secondary fetching failed:', err));
            } catch (err) {
                console.error('Error fetching inventory:', err);
                setError('Failed to load inventory. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchInventory();
    }, []);

    const applyInventoryTags = (data, tags) => {
        if (!tags || tags.length === 0) return data;
        let res = [...data];
        tags.forEach(tag => {
            if (tag.filter) {
                const [k, v] = Object.entries(tag.filter)[0];
                if (k === 'stock_status') res = res.filter(d => d.stockStatus === v);
                else res = res.filter(d => String(d[k]) === String(v));
            }
            if (tag.conditions) {
                tag.conditions.forEach(c => {
                    res = res.filter(d => {
                        const val = String(d[c.field] || '').toLowerCase();
                        const filterVal = c.value.toLowerCase();
                        if (c.operator === 'contains') return val.includes(filterVal);
                        if (c.operator === 'not_contains') return !val.includes(filterVal);
                        if (c.operator === 'is') return val === filterVal;
                        if (c.operator === 'is_not') return val !== filterVal;
                        
                        const numVal = parseFloat(d[c.field]);
                        const numFilter = parseFloat(c.value);
                        if (!isNaN(numVal) && !isNaN(numFilter)) {
                            if (c.operator === 'gte') return numVal >= numFilter;
                            if (c.operator === 'lte') return numVal <= numFilter;
                            if (c.operator === 'eq') return numVal === numFilter;
                        }
                        return true;
                    });
                });
            }
        });
        return res;
    };

    const processedProducts = (() => {
        let res = [...products];
        // 1. Search term match
        if (searchTerm) {
            const s = searchTerm.toLowerCase();
            res = res.filter(p => 
                (p.name && p.name.toLowerCase().includes(s)) || 
                (p.sku && p.sku.toLowerCase().includes(s)) ||
                (p.category && p.category.toLowerCase().includes(s)) ||
                (p.brand && p.brand.toLowerCase().includes(s))
            );
        }
        // 2. Active filter tags
        res = applyInventoryTags(res, activeTags);
        // 3. Sort
        return res.sort((a, b) => {
            if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
            if (sortBy === 'stock_desc') return (b.currentStock || 0) - (a.currentStock || 0);
            if (sortBy === 'stock_asc') return (a.currentStock || 0) - (b.currentStock || 0);
            if (sortBy === 'price_desc') return (b.salePrice || 0) - (a.salePrice || 0);
            if (sortBy === 'price_asc') return (a.salePrice || 0) - (b.salePrice || 0);
            return (a.name || '').localeCompare(b.name || '');
        });
    })();

    // Apply pagination properly (25 elements)
    const totalPages = Math.max(1, Math.ceil(processedProducts.length / PAGE_SIZE));
    useEffect(() => { if (currentPage > totalPages) setCurrentPage(1); }, [processedProducts.length, currentPage, totalPages]);
    
    const visibleProducts = processedProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const getGroupedProducts = (data) => {
        if (groupBy === 'none') return [{ label: null, items: data }];
        const map = new Map();
        data.forEach(item => {
            let key = 'Other';
            if (groupBy === 'category') key = item.category || 'Uncategorized';
            else if (groupBy === 'brand') key = item.brand || 'No Brand';
            else if (groupBy === 'type') key = item.type || 'Unknown';
            else if (groupBy === 'stock') key = item.stockStatus || 'Unknown';
            
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(item);
        });
        return Array.from(map.entries())
            .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
            .map(([label, items]) => ({ label, items }));
    };

    const handleSaveNamedView = (name) => {
        setSaveStatus('saving');
        setTimeout(() => {
            const newView = {
                id: Date.now().toString(),
                name,
                searchTerm,
                groupBy,
                sortBy,
                activeTags,
                isDefault: false
            };
            const updated = [...savedViews, newView];
            setSavedViews(updated);
            localStorage.setItem('sorted_inventory_views', JSON.stringify(updated));
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(null), 1500);
        }, 400); // UI feedback delay imitation
    };

    const handleApplyView = (view) => {
        setSearchTerm(view.searchTerm || '');
        setGroupBy(view.groupBy || 'none');
        setSortBy(view.sortBy || 'name');
        setActiveTags(view.activeTags || []);
        setCurrentPage(1);
    };

    const handleDeleteView = (id) => {
        const updated = savedViews.filter(v => v.id !== id);
        setSavedViews(updated);
        localStorage.setItem('sorted_inventory_views', JSON.stringify(updated));
    };

    const handleSetDefaultView = (id) => {
        const updated = savedViews.map(v => ({ ...v, isDefault: v.id === id ? !v.isDefault : false }));
        setSavedViews(updated);
        localStorage.setItem('sorted_inventory_views', JSON.stringify(updated));
    };

    const viewIcons = {
        card: Grid,
        kanban: Columns,
        table: TableIcon,
        details: List
    };

    const totalStock = products
        .filter(p => p.type === 'product' && p.current_stock !== null)
        .reduce((sum, p) => sum + (p.current_stock || 0), 0);

    const handleUpdateProduct = async (updatedProduct) => {
        try {
            // Find current product to check for stock changes
            const currentProduct = products.find(p => p.id === updatedProduct.id);

            const result = await inventoryAPI.update(updatedProduct.id, updatedProduct);

            // Log an edit interaction
            try {
                await inventoryLogsAPI.create({
                    inventory_id: result.id,
                    type: 'edit',
                    quantity_changed: 0,
                    previous_quantity: currentProduct?.current_stock || 0,
                    new_quantity: result.current_stock || 0,
                    reference_type: 'manual',
                    notes: 'Product details edited via admin'
                });
            } catch (logErr) {
                console.error('Failed to create edit log:', logErr);
            }

            setProducts(prevProducts =>
                prevProducts.map(p => p.id === result.id ? { ...result, currentStock: result.current_stock, minStockLevel: result.min_stock_level, salePrice: result.sale_price, purchasePrice: result.purchase_price, unitOfMeasure: result.unit_of_measure, hsnCode: result.hsn_code, stockStatus: getStockStatus(result.current_stock, result.min_stock_level, result.type === 'service') } : p)
            );
            setSelectedProduct(null);
        } catch (err) {
            console.error('Error updating product:', err);
            alert('Failed to update product');
        }
    };

    const inventoryColumns = [
        { id: 'name', label: 'Item Name' },
        { id: 'sku', label: 'SKU' },
        { id: 'type', label: 'Type' },
        { id: 'category', label: 'Category' },
        { id: 'brand', label: 'Brand' },
        { id: 'currentStock', label: 'Current Stock' },
        { id: 'minStockLevel', label: 'Min Stock Level' },
        { id: 'salePrice', label: 'Sale Price' },
        { id: 'purchasePrice', label: 'Purchase Price' },
        { id: 'unitOfMeasure', label: 'Unit' },
        { id: 'hsnCode', label: 'HSN Code' }
    ];

    const getTemplateConfig = () => {
       return {
           dummyRow: { name: 'Premium Sensor', sku: 'SENS-001', type: 'product', category: 'Sensors', brand: 'TechBrand', currentStock: 50, minStockLevel: 10, salePrice: 1200, purchasePrice: 800, unitOfMeasure: 'pcs', hsnCode: '8536' }
       };
    };

    const handleBulkImport = async (parsedRows) => {
        if (!parsedRows || parsedRows.length === 0) return;
        
        const confirmMsg = `Are you sure you want to import ${parsedRows.length} items into Inventory?`;
        if (!window.confirm(confirmMsg)) return;
        
        let successCount = 0;
        let failCount = 0;
        
        for (const row of parsedRows) {
            try {
                // Ensure required minimal bindings and snake_case mapping for API if needed
                const payload = { ...row };
                if (payload.currentStock !== undefined) payload.current_stock = payload.currentStock;
                if (payload.minStockLevel !== undefined) payload.min_stock_level = payload.minStockLevel;
                if (payload.salePrice !== undefined) payload.sale_price = payload.salePrice;
                if (payload.purchasePrice !== undefined) payload.purchase_price = payload.purchasePrice;
                if (payload.unitOfMeasure !== undefined) payload.unit_of_measure = payload.unitOfMeasure;
                if (payload.hsnCode !== undefined) payload.hsn_code = payload.hsnCode;
                
                await handleCreateProduct(payload);
                successCount++;
            } catch (err) {
                console.error('Import row failed:', err);
                failCount++;
            }
        }
        
        alert(`Import Complete!\n\nSuccessful: ${successCount}\nFailed: ${failCount}`);
    };

    const handleCreateProduct = async (newProduct) => {
        try {
            const result = await inventoryAPI.create(newProduct);

            // Create initial stock log if it's a product with stock
            if (result.type === 'product' && result.current_stock > 0) {
                try {
                    await inventoryLogsAPI.create({
                        inventory_id: result.id,
                        type: 'initial',
                        quantity_changed: result.current_stock,
                        previous_quantity: 0,
                        new_quantity: result.current_stock,
                        reference_type: 'manual',
                        notes: 'Initial stock on creation'
                    });
                } catch (logErr) {
                    console.error('Failed to create initial stock log:', logErr);
                }
            }

            const normalizedResult = {
                ...result,
                currentStock: result.current_stock,
                minStockLevel: result.min_stock_level,
                reorderLevel: result.min_stock_level,
                salePrice: result.sale_price,
                purchasePrice: result.purchase_price,
                unitOfMeasure: result.unit_of_measure,
                hsnCode: result.hsn_code,
                stockStatus: getStockStatus(result.current_stock, result.min_stock_level, result.type === 'service')
            };
            setProducts(prevProducts => [...prevProducts, normalizedResult]);
            setShowCreateForm(false);
        } catch (err) {
            console.error('Error creating product:', err);
            alert('Failed to create product');
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;

        try {
            await inventoryAPI.delete(id);
            setProducts(prevProducts => prevProducts.filter(p => p.id !== id));
            setSelectedProduct(null);
        } catch (err) {
            console.error('Error deleting product:', err);
            alert('Failed to delete product');
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header: Title + Search Panel + View Dropdown + Import/Export + Create */}
            <div style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap'
            }}>
                <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>Inventory</span>
                
                <InventorySearchPanel
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    groupBy={groupBy}
                    onGroupByChange={setGroupBy}
                    sortBy={sortBy}
                    onSortByChange={setSortBy}
                    activeTags={activeTags}
                    onAddTag={t => setActiveTags(p => [...p.filter(x => x.id !== t.id), t])}
                    onRemoveTag={id => setActiveTags(p => p.filter(t => t.id !== id))}
                    savedViews={savedViews}
                    onSaveNamedView={handleSaveNamedView}
                    onApplyView={handleApplyView}
                    onDeleteView={handleDeleteView}
                    onSetDefaultView={handleSetDefaultView}
                    saveStatus={saveStatus}
                    onResetView={() => { setSearchTerm(''); setActiveTags([]); setGroupBy('none'); setSortBy('name'); }}
                />

                {/* View Dropdown */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={viewType}
                        onChange={(e) => setViewType(e.target.value)}
                        className="form-select"
                        style={{ padding: '6px 28px 6px 12px', fontSize: 'var(--font-size-sm)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '6px', cursor: 'pointer' }}
                    >
                        <option value="table">Table View</option>
                        <option value="card">Card View</option>
                        <option value="kanban">Kanban View</option>
                        <option value="details">Details View</option>
                    </select>
                </div>

                <span style={{ borderLeft: '1px solid var(--border-primary)', height: '20px', margin: '0 4px' }} />

                <ImportExportButtons 
                    data={processedProducts} 
                    columns={inventoryColumns} 
                    exportFilename="SortedSolutions_Inventory"
                    onImport={handleBulkImport}
                    templateConfig={getTemplateConfig()}
                />

                <button
                    className="btn btn-primary"
                    onClick={() => setShowCreateForm(true)}
                    style={{ padding: '6px 16px', fontSize: 'var(--font-size-sm)' }}
                >
                    <Plus size={16} />
                    Create
                </button>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                        <div className="loader" style={{ marginRight: 'var(--spacing-sm)' }}></div>
                        Loading inventory...
                    </div>
                ) : error ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ef4444', padding: 'var(--spacing-xl)' }}>
                        <X size={48} style={{ marginBottom: 'var(--spacing-md)' }} />
                        <p>{error}</p>
                        <button className="btn btn-secondary" onClick={() => window.location.reload()} style={{ marginTop: 'var(--spacing-md)' }}>
                            Retry
                        </button>
                    </div>
                ) : (
                    <>
                        {viewType === 'table' && <InventoryTableView products={visibleProducts} onProductClick={setSelectedProduct} categories={categories} />}
                        {viewType === 'card' && <InventoryCardView products={visibleProducts} onProductClick={setSelectedProduct} categories={categories} />}
                        {viewType === 'kanban' && (
                            <InventoryKanbanView
                                products={visibleProducts}
                                onProductClick={setSelectedProduct}
                                onProductUpdate={handleUpdateProduct}
                                categories={categories}
                            />
                        )}
                        {viewType === 'details' && <InventoryDetailsView products={visibleProducts} onProductClick={setSelectedProduct} categories={categories} />}
                    </>
                )}
            </div>

            {/* Summary & Pagination Footer */}
            {!loading && !error && (
                <div style={{
                    padding: '8px var(--spacing-md)',
                    backgroundColor: 'var(--bg-secondary)',
                    borderTop: '1px solid var(--border-primary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 'var(--font-size-sm)'
                }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{processedProducts.length}</span> entries 
                        {activeTags.length > 0 && ` (filtered from ${products.length})`}
                        <span style={{ marginLeft: '16px', color: 'var(--text-secondary)' }}>| Total Stock: {totalStock}</span>
                    </span>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {totalPages > 1 && (
                            <>
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    style={{
                                        padding: '4px 12px', fontSize: '13px', border: '1px solid var(--border-primary)', 
                                        borderRadius: '6px', backgroundColor: currentPage === 1 ? 'transparent' : 'var(--bg-elevated)',
                                        color: currentPage === 1 ? 'var(--text-disabled)' : 'var(--text-primary)',
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Previous
                                </button>
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    {currentPage} / {totalPages}
                                </span>
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        padding: '4px 12px', fontSize: '13px', border: '1px solid var(--border-primary)', 
                                        borderRadius: '6px', backgroundColor: currentPage === totalPages ? 'transparent' : 'var(--bg-elevated)',
                                        color: currentPage === totalPages ? 'var(--text-disabled)' : 'var(--text-primary)',
                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Next
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Product Detail Modal */}
            {selectedProduct && (
                <ProductDetailModal
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                    onUpdate={handleUpdateProduct}
                    onDelete={() => handleDeleteProduct(selectedProduct.id)}
                    categories={categories}
                    brands={managedBrands}
                />
            )}

            {/* Create Product Form */}
            {showCreateForm && (
                <NewProductForm
                    onClose={() => setShowCreateForm(false)}
                    onSave={handleCreateProduct}
                    categories={categories}
                    brands={managedBrands}
                    termsTemplates={termsTemplates}
                    existingProducts={products}
                    onCategoryAdded={handleCategoryAdded}
                    onBrandAdded={handleBrandAdded}
                />
            )}
        </div>
    );
}

export default InventoryTab;
