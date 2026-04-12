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
import AutocompleteSearch from '@/components/admin/AutocompleteSearch';
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
    const [filterType, setFilterType] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterBrand, setFilterBrand] = useState('all');
    const [filterStockStatus, setFilterStockStatus] = useState('all');
    const [sortBy, setSortBy] = useState('name');
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

    const brands = getUniqueBrands(products);

    const filteredProducts = sortProducts(
        filterProducts(products, {
            type: filterType,
            category: filterCategory,
            brand: filterBrand,
            stockStatus: filterStockStatus,
            search: searchTerm
        }),
        sortBy
    );

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
            {/* Row 1: Tab Name + Search + Create Button */}
            <div style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-md)',
                flexWrap: 'wrap'
            }}>
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, minWidth: '100px' }}>
                    Inventory
                </h2>

                <div style={{ flex: 1, minWidth: '200px' }}>
                    <AutocompleteSearch
                        placeholder="Search products, SKUs, brands..."
                        value={searchTerm}
                        onChange={setSearchTerm}
                        suggestions={products}
                        onSelect={(item) => setSearchTerm(item.name || item.sku)}
                        searchKey="name"
                        renderSuggestion={(product) => (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                        {product.name}
                                    </span>
                                    <span style={{
                                        fontSize: 'var(--font-size-xs)',
                                        fontWeight: 600,
                                        color: product.current_stock <= (product.min_stock_level || 5) ? '#ef4444' : 'inherit'
                                    }}>
                                        {product.current_stock} in stock
                                    </span>
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                    {product.sku && `${product.sku} • `}{product.brand} • {product.category}
                                </div>
                            </div>
                        )}
                    />
                </div>

                <button
                    className="btn btn-primary"
                    onClick={() => setShowCreateForm(true)}
                    style={{ padding: '6px 16px', fontSize: 'var(--font-size-sm)' }}
                >
                    <Plus size={16} />
                    Create
                </button>
            </div>

            {/* Row 2: View Buttons + Compact Filter Buttons */}
            <div style={{
                padding: 'var(--spacing-xs) var(--spacing-md)',
                backgroundColor: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                {/* View Type Buttons */}
                {Object.entries(viewIcons).map(([type, Icon]) => (
                    <button
                        key={type}
                        onClick={() => setViewType(type)}
                        title={type.charAt(0).toUpperCase() + type.slice(1)}
                        style={{
                            padding: '6px 10px',
                            border: '1px solid var(--border-primary)',
                            borderRadius: '6px',
                            backgroundColor: viewType === type ? '#6366f1' : '#334155',
                            color: viewType === type ? 'white' : '#cbd5e1',
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Icon size={16} />
                    </button>
                ))}

                <span style={{ borderLeft: '1px solid var(--border-primary)', height: '16px', margin: '0 4px' }} />

                {/* Type Filter Button */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="form-select"
                        style={{ padding: '4px 24px 4px 8px', fontSize: 'var(--font-size-xs)', backgroundColor: '#334155', color: '#cbd5e1' }}
                    >
                        <option value="all">All Types</option>
                        <option value="product">Products</option>
                        <option value="service">Services</option>
                    </select>
                </div>

                {/* Category Filter Button */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="form-select"
                        style={{ padding: '4px 24px 4px 8px', fontSize: 'var(--font-size-xs)', backgroundColor: '#334155', color: '#cbd5e1' }}
                    >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                {/* Brand Filter Button */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={filterBrand}
                        onChange={(e) => setFilterBrand(e.target.value)}
                        className="form-select"
                        style={{ padding: '4px 24px 4px 8px', fontSize: 'var(--font-size-xs)', backgroundColor: '#334155', color: '#cbd5e1' }}
                    >
                        <option value="all">All Brands</option>
                        {brands.map(brand => (
                            <option key={brand} value={brand}>{brand}</option>
                        ))}
                    </select>
                </div>

                {/* Stock Status Filter Button */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={filterStockStatus}
                        onChange={(e) => setFilterStockStatus(e.target.value)}
                        className="form-select"
                        style={{ padding: '4px 24px 4px 8px', fontSize: 'var(--font-size-xs)', backgroundColor: '#334155', color: '#cbd5e1' }}
                    >
                        <option value="all">All Stock</option>
                        <option value={stockStatuses.IN_STOCK}>In Stock</option>
                        <option value={stockStatuses.LOW_STOCK}>Low Stock</option>
                        <option value={stockStatuses.OUT_OF_STOCK}>Out of Stock</option>
                    </select>
                </div>

                <span style={{ borderLeft: '1px solid var(--border-primary)', height: '16px', margin: '0 4px' }} />

                {/* Sort Button */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="form-select"
                        style={{ padding: '4px 24px 4px 8px', fontSize: 'var(--font-size-xs)', backgroundColor: '#334155', color: '#cbd5e1' }}
                    >
                        <option value="name">Sort: Name</option>
                        <option value="stock">Sort: Stock</option>
                        <option value="price">Sort: Price</option>
                        <option value="category">Sort: Category</option>
                        <option value="sku">Sort: SKU</option>
                    </select>
                </div>

                <div style={{ flex: 1 }} />
                
                <ImportExportButtons 
                    data={filteredProducts} 
                    columns={inventoryColumns} 
                    exportFilename="SortedSolutions_Inventory"
                    onImport={handleBulkImport}
                />
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
                        {viewType === 'table' && <InventoryTableView products={filteredProducts} onProductClick={setSelectedProduct} categories={categories} />}
                        {viewType === 'card' && <InventoryCardView products={filteredProducts} onProductClick={setSelectedProduct} categories={categories} />}
                        {viewType === 'kanban' && (
                            <InventoryKanbanView
                                products={filteredProducts}
                                onProductClick={setSelectedProduct}
                                onProductUpdate={handleUpdateProduct}
                                categories={categories}
                            />
                        )}
                        {viewType === 'details' && <InventoryDetailsView products={filteredProducts} onProductClick={setSelectedProduct} categories={categories} />}
                    </>
                )}
            </div>

            {/* Summary Footer */}
            {!loading && !error && (
                <div style={{
                    padding: 'var(--spacing-xs) var(--spacing-md)',
                    backgroundColor: 'var(--bg-secondary)',
                    borderTop: '1px solid var(--border-primary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 'var(--font-size-xs)'
                }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                        Showing {filteredProducts.length} of {products.length} items
                    </span>
                    <span style={{ fontWeight: 600 }}>
                        Total Stock: {totalStock} units
                    </span>
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
