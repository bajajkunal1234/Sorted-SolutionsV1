import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { sampleProducts } from '../../data/inventoryData';

function ProductSelector({ value, onChange, label = 'Item/Product', onProductSelect }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Get all products from inventory
    const allProducts = sampleProducts.map(product => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        unitOfMeasure: product.unitOfMeasure,
        hsnCode: product.hsnCode,
        gstRate: product.gstRate,
        sellingPrice: product.salePrice,
        type: product.type,
        category: product.category,
        currentStock: product.currentStock
    }));

    // Filter products based on search term
    const filteredProducts = allProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.hsnCode?.includes(searchTerm)
    );

    const selectedProduct = allProducts.find(prod => prod.id === value);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleProductSelect = (product) => {
        onChange(product.id);

        // If onProductSelect callback is provided, pass full product details
        if (onProductSelect) {
            onProductSelect({
                productId: product.id,
                description: product.name,
                hsn: product.hsnCode,
                unit: product.unitOfMeasure,
                rate: product.sellingPrice,
                taxRate: product.gstRate,
                sku: product.sku
            });
        }

        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                {label} *
            </label>

            {/* Custom Searchable Dropdown */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    fontSize: 'var(--font-size-sm)',
                    color: selectedProduct ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all var(--transition-fast)'
                }}
            >
                <span>{selectedProduct ? `${selectedProduct.name} (${selectedProduct.sku})` : `Select ${label}...`}</span>
                <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform var(--transition-fast)' }} />
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 'var(--spacing-xs)',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                    zIndex: 1000,
                    maxHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Search Input */}
                    <div style={{ padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--border-primary)' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Search products..."
                                className="form-input"
                                style={{
                                    width: '100%',
                                    paddingLeft: '32px',
                                    fontSize: 'var(--font-size-sm)'
                                }}
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Product List */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        maxHeight: '320px'
                    }}>
                        {filteredProducts.length > 0 ? (
                            filteredProducts.map(product => (
                                <div
                                    key={product.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleProductSelect(product);
                                    }}
                                    style={{
                                        padding: 'var(--spacing-sm) var(--spacing-md)',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid var(--border-primary)',
                                        transition: 'background-color var(--transition-fast)',
                                        backgroundColor: value === product.id ? 'var(--bg-secondary)' : 'transparent'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                    onMouseLeave={(e) => {
                                        if (value !== product.id) {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                {product.name}
                                            </div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                {product.sku} • HSN: {product.hsnCode} • {product.unitOfMeasure}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', marginLeft: 'var(--spacing-sm)' }}>
                                            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-primary)' }}>
                                                ₹{product.sellingPrice?.toLocaleString() || 0}
                                            </div>
                                            {product.type === 'product' && (
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: product.currentStock > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                                    Stock: {product.currentStock || 0}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{
                                padding: 'var(--spacing-lg)',
                                textAlign: 'center',
                                color: 'var(--text-tertiary)',
                                fontSize: 'var(--font-size-sm)'
                            }}>
                                No products found
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Show selected product details */}
            {selectedProduct && (
                <div style={{
                    marginTop: 'var(--spacing-xs)',
                    padding: 'var(--spacing-sm)',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--font-size-sm)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 'var(--spacing-xs)'
                }}>
                    <div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>HSN Code:</span>
                        <div style={{ fontWeight: 600 }}>{selectedProduct.hsnCode}</div>
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>GST Rate:</span>
                        <div style={{ fontWeight: 600 }}>{selectedProduct.gstRate}%</div>
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>Unit:</span>
                        <div style={{ fontWeight: 600 }}>{selectedProduct.unitOfMeasure}</div>
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>Price:</span>
                        <div style={{ fontWeight: 600 }}>₹{selectedProduct.sellingPrice?.toLocaleString() || 0}</div>
                    </div>
                    {selectedProduct.type === 'product' && (
                        <div>
                            <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>Stock:</span>
                            <div style={{ fontWeight: 600, color: selectedProduct.currentStock > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                {selectedProduct.currentStock || 0} {selectedProduct.unitOfMeasure}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default ProductSelector;



