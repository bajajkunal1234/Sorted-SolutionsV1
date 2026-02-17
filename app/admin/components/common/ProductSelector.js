import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Loader2, Package } from 'lucide-react';
import { productsAPI } from '@/lib/adminAPI';
import AutocompleteSearch from '@/components/admin/AutocompleteSearch';

function ProductSelector({ value, onChange, label = 'Item/Product', onProductSelect }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch products from API
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const data = await productsAPI.getAll();
                setProducts(data || []);
            } catch (err) {
                console.error('Error fetching products for selector:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    const selectedProduct = products.find(prod => prod.id === value);

    // Sync search term with selected product name
    useEffect(() => {
        if (selectedProduct) {
            setSearchTerm(selectedProduct.name);
        } else if (!value) {
            setSearchTerm('');
        }
    }, [value, selectedProduct]);

    const handleProductSelect = (product) => {
        onChange(product.id);
        setSearchTerm(product.name);

        // If onProductSelect callback is provided, pass full product details
        if (onProductSelect) {
            onProductSelect({
                productId: product.id,
                description: product.name,
                hsn: product.hsn_code,
                unit: product.unit,
                rate: product.rate,
                taxRate: product.tax_rate,
                sku: product.sku
            });
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                {label} * {loading && <Loader2 size={12} className="animate-spin" style={{ display: 'inline', marginLeft: '4px' }} />}
            </label>

            <AutocompleteSearch
                placeholder={`Search ${label}...`}
                value={searchTerm}
                onChange={setSearchTerm}
                suggestions={products}
                onSelect={handleProductSelect}
                searchKey="name"
                loading={loading}
                renderSuggestion={(prod) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                padding: '6px',
                                borderRadius: '6px',
                                backgroundColor: 'var(--bg-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Package size={14} style={{ color: 'var(--color-primary)' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{prod.name}</span>
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                    {prod.sku && `${prod.sku} • `}HSN: {prod.hsn_code}
                                </span>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-primary)' }}>
                                ₹{prod.rate?.toLocaleString() || 0}
                            </div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                {prod.current_stock} in stock
                            </div>
                        </div>
                    </div>
                )}
            />

            {/* Show selected product details */}
            {selectedProduct && (
                <div style={{
                    marginTop: 'var(--spacing-xs)',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    backgroundColor: 'rgba(16, 185, 129, 0.05)',
                    border: '1px solid rgba(16, 185, 129, 0.1)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--font-size-xs)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 'var(--spacing-sm)'
                }}>
                    <div>
                        <span style={{ color: 'var(--text-secondary)' }}>HSN Code</span>
                        <div style={{ fontWeight: 600 }}>{selectedProduct.hsn_code}</div>
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-secondary)' }}>GST Rate</span>
                        <div style={{ fontWeight: 600 }}>{selectedProduct.tax_rate}%</div>
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Unit</span>
                        <div style={{ fontWeight: 600 }}>{selectedProduct.unit}</div>
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Price</span>
                        <div style={{ fontWeight: 600 }}>₹{selectedProduct.rate?.toLocaleString() || 0}</div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProductSelector;
