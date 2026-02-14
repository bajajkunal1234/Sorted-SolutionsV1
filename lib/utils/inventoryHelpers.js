import { stockStatuses } from '../data/inventoryData';

/**
 * Get stock status based on current stock and reorder level
 */
export const getStockStatus = (currentStock, reorderLevel, isService = false) => {
    if (isService || currentStock === null) {
        return stockStatuses.NOT_APPLICABLE;
    }

    if (currentStock === 0) {
        return stockStatuses.OUT_OF_STOCK;
    }

    if (currentStock <= reorderLevel) {
        return stockStatuses.LOW_STOCK;
    }

    return stockStatuses.IN_STOCK;
};

/**
 * Get stock status color
 */
export const getStockStatusColor = (status) => {
    const colors = {
        [stockStatuses.IN_STOCK]: 'var(--color-success)',
        [stockStatuses.LOW_STOCK]: 'var(--color-warning)',
        [stockStatuses.OUT_OF_STOCK]: 'var(--color-danger)',
        [stockStatuses.NOT_APPLICABLE]: 'var(--text-tertiary)'
    };

    return colors[status] || 'var(--text-secondary)';
};

/**
 * Get stock status label
 */
export const getStockStatusLabel = (status) => {
    const labels = {
        [stockStatuses.IN_STOCK]: 'In Stock',
        [stockStatuses.LOW_STOCK]: 'Low Stock',
        [stockStatuses.OUT_OF_STOCK]: 'Out of Stock',
        [stockStatuses.NOT_APPLICABLE]: 'N/A'
    };

    return labels[status] || 'Unknown';
};

/**
 * Calculate stock value
 */
export const calculateStockValue = (stock, price) => {
    if (!stock || !price) return 0;
    return stock * price;
};

/**
 * Generate product SKU
 */
export const generateProductSKU = (type, existingProducts) => {
    const prefix = {
        'product': 'PROD',
        'service': 'SERV',
        'combo': 'COMBO'
    }[type] || 'ITEM';

    // Find highest number for this prefix
    const existing = existingProducts
        .filter(p => p.sku && p.sku.startsWith(prefix))
        .map(p => {
            const match = p.sku.match(/\d+$/);
            return match ? parseInt(match[0]) : 0;
        });

    const maxNum = existing.length > 0 ? Math.max(...existing) : 0;
    const nextNum = (maxNum + 1).toString().padStart(3, '0');

    return `${prefix}-${nextNum}`;
};

/**
 * Filter products based on criteria
 */
export const filterProducts = (products, filters) => {
    return products.filter(product => {
        // Type filter
        if (filters.type && filters.type !== 'all' && product.type !== filters.type) {
            return false;
        }

        // Category filter
        if (filters.category && filters.category !== 'all' && product.category !== filters.category) {
            return false;
        }

        // Brand filter
        if (filters.brand && filters.brand !== 'all' && product.brand !== filters.brand) {
            return false;
        }

        // Stock status filter
        if (filters.stockStatus && filters.stockStatus !== 'all') {
            const status = getStockStatus(product.currentStock, product.reorderLevel, product.type === 'service');
            if (status !== filters.stockStatus) {
                return false;
            }
        }

        // Search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const matchesName = product.name.toLowerCase().includes(searchLower);
            const matchesSKU = product.sku.toLowerCase().includes(searchLower);
            const matchesCategory = product.category?.toLowerCase().includes(searchLower);
            const matchesBrand = product.brand?.toLowerCase().includes(searchLower);

            if (!matchesName && !matchesSKU && !matchesCategory && !matchesBrand) {
                return false;
            }
        }

        return true;
    });
};

/**
 * Sort products
 */
export const sortProducts = (products, sortBy) => {
    return [...products].sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name);

            case 'stock':
                const stockA = a.currentStock || 0;
                const stockB = b.currentStock || 0;
                return stockB - stockA;

            case 'price':
                return (b.salePrice || 0) - (a.salePrice || 0);

            case 'category':
                return (a.category || '').localeCompare(b.category || '');

            case 'sku':
                return a.sku.localeCompare(b.sku);

            default:
                return 0;
        }
    });
};

/**
 * Group products by category for kanban view
 */
export const groupByCategory = (products) => {
    const groups = {};

    products.forEach(product => {
        const category = product.category || 'uncategorized';
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(product);
    });

    return groups;
};

/**
 * Group products by stock status for kanban view
 */
export const groupByStockStatus = (products) => {
    const groups = {
        [stockStatuses.IN_STOCK]: [],
        [stockStatuses.LOW_STOCK]: [],
        [stockStatuses.OUT_OF_STOCK]: []
    };

    products.forEach(product => {
        const status = getStockStatus(product.currentStock, product.reorderLevel, product.type === 'service');
        if (status !== stockStatuses.NOT_APPLICABLE && groups[status]) {
            groups[status].push(product);
        }
    });

    return groups;
};

/**
 * Calculate profit margin
 */
export const calculateMargin = (salePrice, purchasePrice) => {
    if (!salePrice || !purchasePrice) return 0;
    const margin = ((salePrice - purchasePrice) / salePrice) * 100;
    return parseFloat(margin.toFixed(2));
};

/**
 * Format stock display
 */
export const formatStock = (stock, unit) => {
    if (stock === null || stock === undefined) return 'N/A';
    return `${stock} ${unit || 'pcs'}`;
};

/**
 * Get category color
 */
export const getCategoryColor = (categoryId, categories) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#6b7280';
};

/**
 * Check if product needs reorder
 */
export const needsReorder = (product) => {
    if (product.type === 'service' || product.currentStock === null) {
        return false;
    }

    return product.currentStock <= product.reorderLevel;
};

/**
 * Get all unique brands from products
 */
export const getUniqueBrands = (products) => {
    const brands = products
        .map(p => p.brand)
        .filter(b => b !== null && b !== undefined);

    return [...new Set(brands)].sort();
};
