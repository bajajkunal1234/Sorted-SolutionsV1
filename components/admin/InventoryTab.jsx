'use client'

import { useState } from 'react';
import { Search, Plus, Grid, Columns, Table as TableIcon, List, ChevronDown, X } from 'lucide-react';
import { sampleProducts, productCategories, stockStatuses } from '@/data/inventoryData';
import { filterProducts, sortProducts, getUniqueBrands } from '@/utils/inventoryHelpers';
import InventoryTableView from '@/components/inventory/InventoryTableView';
import InventoryCardView from '@/components/inventory/InventoryCardView';
import InventoryKanbanView from '@/components/inventory/InventoryKanbanView';
import InventoryDetailsView from '@/components/inventory/InventoryDetailsView';
import ProductDetailModal from './ProductDetailModal';
import NewProductForm from '@/components/inventory/NewProductForm';

function InventoryTab() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
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

    // Fetch products from API
    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/admin/products');
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch products');
            }

            setProducts(result.data || []);
        } catch (err) {
            console.error('Error fetching products:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

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
        .filter(p => p.type === 'product' && p.currentStock !== null)
        .reduce((sum, p) => sum + p.currentStock, 0);

    const handleUpdateProduct = async (updatedProduct) => {
        try {
            const response = await fetch('/api/admin/products', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedProduct)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update product');
            }

            // Refresh products list
            await fetchProducts();
        } catch (err) {
            console.error('Error updating product:', err);
            alert(`Failed to update product: ${err.message}`);
        }
    };

    const handleCreateProduct = async (newProduct) => {
        try {
            const response = await fetch('/api/admin/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProduct)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create product');
            }

            // Refresh products list
            await fetchProducts();
            setShowCreateForm(false);
        } catch (err) {
            console.error('Error creating product:', err);
            alert(`Failed to create product: ${err.message}`);
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

                <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                    <Search
                        size={16}
                        style={{
                            position: 'absolute',
                            left: 'var(--spacing-sm)',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-tertiary)'
                        }}
                    />
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            paddingLeft: '2rem',
                            paddingTop: '6px',
                            paddingBottom: '6px',
                            fontSize: 'var(--font-size-sm)'
                        }}
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
                            padding: '4px 8px',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: viewType === type ? 'var(--color-primary)' : 'var(--bg-elevated)',
                            color: viewType === type ? 'var(--text-inverse)' : 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)'
                        }}
                    >
                        <Icon size={14} />
                    </button>
                ))}

                <span style={{ borderLeft: '1px solid var(--border-primary)', height: '16px', margin: '0 4px' }} />

                {/* Type Filter Button */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        style={{
                            appearance: 'none',
                            padding: '4px 24px 4px 8px',
                            fontSize: 'var(--font-size-xs)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        <option value="all">All Types</option>
                        <option value="product">Products</option>
                        <option value="service">Services</option>
                        <option value="combo">Combos</option>
                    </select>
                    <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                </div>

                {/* Category Filter Button */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        style={{
                            appearance: 'none',
                            padding: '4px 24px 4px 8px',
                            fontSize: 'var(--font-size-xs)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        <option value="all">All Categories</option>
                        {productCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                </div>

                {/* Brand Filter Button */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={filterBrand}
                        onChange={(e) => setFilterBrand(e.target.value)}
                        style={{
                            appearance: 'none',
                            padding: '4px 24px 4px 8px',
                            fontSize: 'var(--font-size-xs)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        <option value="all">All Brands</option>
                        {brands.map(brand => (
                            <option key={brand} value={brand}>{brand}</option>
                        ))}
                    </select>
                    <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                </div>

                {/* Stock Status Filter Button */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={filterStockStatus}
                        onChange={(e) => setFilterStockStatus(e.target.value)}
                        style={{
                            appearance: 'none',
                            padding: '4px 24px 4px 8px',
                            fontSize: 'var(--font-size-xs)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        <option value="all">All Stock</option>
                        <option value={stockStatuses.IN_STOCK}>In Stock</option>
                        <option value={stockStatuses.LOW_STOCK}>Low Stock</option>
                        <option value={stockStatuses.OUT_OF_STOCK}>Out of Stock</option>
                    </select>
                    <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                </div>

                <span style={{ borderLeft: '1px solid var(--border-primary)', height: '16px', margin: '0 4px' }} />

                {/* Sort Button */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{
                            appearance: 'none',
                            padding: '4px 24px 4px 8px',
                            fontSize: 'var(--font-size-xs)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        <option value="name">Sort: Name</option>
                        <option value="stock">Sort: Stock</option>
                        <option value="price">Sort: Price</option>
                        <option value="category">Sort: Category</option>
                        <option value="sku">Sort: SKU</option>
                    </select>
                    <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                </div>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                {viewType === 'table' && <InventoryTableView products={filteredProducts} onProductClick={setSelectedProduct} />}
                {viewType === 'card' && <InventoryCardView products={filteredProducts} onProductClick={setSelectedProduct} />}
                {viewType === 'kanban' && (
                    <InventoryKanbanView
                        products={filteredProducts}
                        onProductClick={setSelectedProduct}
                        onProductUpdate={handleUpdateProduct}
                    />
                )}
                {viewType === 'details' && <InventoryDetailsView products={filteredProducts} onProductClick={setSelectedProduct} />}
            </div>

            {/* Summary Footer */}
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

            {/* Product Detail Modal */}
            {selectedProduct && (
                <ProductDetailModal
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                    onUpdate={handleUpdateProduct}
                />
            )}

            {/* Create Product Form */}
            {showCreateForm && (
                <NewProductForm
                    onClose={() => setShowCreateForm(false)}
                    onSave={handleCreateProduct}
                />
            )}
        </div>
    );
}

export default InventoryTab;





