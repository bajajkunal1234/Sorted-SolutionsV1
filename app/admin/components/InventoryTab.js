'use client'

import { useState, useEffect } from 'react';
import { Search, Plus, Grid, Columns, Table as TableIcon, List, ChevronDown, X, SlidersHorizontal, RefreshCw } from 'lucide-react';
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
    
    // UI Utility states
    const [showColumnPicker, setShowColumnPicker] = useState(false);
    const defaultVisibleCols = ['sku', 'name', 'type', 'category', 'brand', 'current_stock', 'sale_price', 'status'];
    const [visibleColumns, setVisibleColumns] = useState(new Set(defaultVisibleCols));
    const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'archived' | 'all'
    // Dependency modal state
    const [dependencyModal, setDependencyModal] = useState(null); // { product, dependencies[] }

    const toggleColumn = (colId) => {
        setVisibleColumns(prev => {
            const next = new Set(prev);
            if (next.has(colId)) next.delete(colId);
            else next.add(colId);
            return next;
        });
    };

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
        // 0. Status filter (active / archived / all)
        if (statusFilter === 'active') res = res.filter(p => p.status !== 'archived');
        else if (statusFilter === 'archived') res = res.filter(p => p.status === 'archived');
        // 'all' → no filter
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
        { id: 'name',             label: 'Item Name' },
        { id: 'sku',              label: 'SKU' },
        { id: 'type',             label: 'Type' },
        { id: 'job_type',         label: 'Job Type' },
        { id: 'category',         label: 'Category' },
        { id: 'brand',            label: 'Brand' },
        { id: 'current_stock',    label: 'Current Stock' },
        { id: 'min_stock_level',  label: 'Min Stock Level' },
        { id: 'sale_price',       label: 'Sale Price' },
        { id: 'purchase_price',   label: 'Purchase Price' },
        { id: 'dealer_price',     label: 'Dealer Price' },
        { id: 'retail_price',     label: 'Retail Price' },
        { id: 'unit_of_measure',  label: 'Unit' },
        { id: 'hsn_code',         label: 'HSN / SAC Code' },
        { id: 'hsn_description',  label: 'HSN Description' },
        { id: 'gst_rate',         label: 'GST Rate (%)' },
        { id: 'status',           label: 'Status' },
    ];

    const getTemplateConfig = () => {
       return {
           dummyRow: {
               name: 'Example Product',
               sku: '',                    // leave blank — auto-generated on import
               type: 'product',           // 'product' or 'service'
               job_type: 'repair',        // 'install_uninstall' | 'service_maintenance' | 'repair' | (leave blank)
               category: 'Air Conditioners',
               brand: 'Samsung',
               current_stock: 50,
               min_stock_level: 10,
               sale_price: 1200,
               purchase_price: 800,
               dealer_price: 1000,
               retail_price: 1500,
               unit_of_measure: 'pcs',    // pcs / kg / ltr / mtr / box / set / unit
               hsn_code: '8415',
               hsn_description: 'Air Conditioning Machines',
               gst_rate: 18,              // 0 / 5 / 12 / 18 / 28  (GST always applicable)
               status: 'active'           // 'active' or 'inactive'
           }
       };
    };

    const handleBulkImport = async (parsedRows) => {
        if (!parsedRows || parsedRows.length === 0) return;

        const confirmMsg = `Import ${parsedRows.length} item(s) into Inventory?`;
        if (!window.confirm(confirmMsg)) return;

        // Build a set of existing names (case-insensitive) to skip duplicates
        const existingNames = new Set(products.map(p => (p.name || '').toLowerCase().trim()));

        let successCount = 0;
        let skippedCount = 0;
        const errors = [];
        const newItems = [];

        for (const row of parsedRows) {
            const rowName = row.name || row['Item Name'] || `Row ${successCount + errors.length + skippedCount + 1}`;
            const rowNameKey = rowName.toLowerCase().trim();

            // Skip if name already exists in DB or in this same import batch
            if (existingNames.has(rowNameKey)) {
                skippedCount++;
                console.log(`Import skipped (duplicate): "${rowName}"`);
                continue;
            }

            try {
                const result = await inventoryAPI.create(row);

                // Create initial stock log if applicable
                if (result.type === 'product' && result.current_stock > 0) {
                    try {
                        await inventoryLogsAPI.create({
                            inventory_id: result.id,
                            type: 'initial',
                            quantity_changed: result.current_stock,
                            previous_quantity: 0,
                            new_quantity: result.current_stock,
                            reference_type: 'manual',
                            notes: 'Initial stock on bulk import'
                        });
                    } catch (logErr) {
                        console.warn('Stock log failed (non-fatal):', logErr);
                    }
                }

                // Track this name so duplicates within same file are also caught
                existingNames.add(rowNameKey);

                newItems.push({
                    ...result,
                    currentStock: result.current_stock,
                    minStockLevel: result.min_stock_level,
                    reorderLevel: result.min_stock_level,
                    salePrice: result.sale_price,
                    purchasePrice: result.purchase_price,
                    unitOfMeasure: result.unit_of_measure,
                    hsnCode: result.hsn_code,
                    stockStatus: getStockStatus(result.current_stock, result.min_stock_level, result.type === 'service')
                });
                successCount++;
            } catch (err) {
                console.error(`Import failed for "${rowName}":`, err);
                errors.push(`• ${rowName}: ${err.message || 'Unknown error'}`);
            }
        }

        // Batch-add all successfully imported items to state
        if (newItems.length > 0) {
            setProducts(prev => [...prev, ...newItems]);

            // ── Sync new categories/brands into lookup tables ─────────────────
            // Bulk import saves category/brand as text on the item row, but the
            // Create form pulls from inventory_categories / inventory_brands tables.
            // Auto-create any new ones so the form dropdowns stay up to date.
            try {
                const existingCatNames = new Set((categories || []).map(c => (c.name || '').toLowerCase()));
                const existingBrandNames = new Set((managedBrands || []).map(b => (b.name || '').toLowerCase()));

                const newCatNames = [...new Set(newItems.map(i => i.category).filter(Boolean))]
                    .filter(name => !existingCatNames.has(name.toLowerCase()));
                const newBrandNames = [...new Set(newItems.map(i => i.brand).filter(Boolean))]
                    .filter(name => !existingBrandNames.has(name.toLowerCase()));

                await Promise.all([
                    ...newCatNames.map(name => inventoryCategoriesAPI.create({ name }).catch(() => null)),
                    ...newBrandNames.map(name => inventoryBrandsAPI.create({ name }).catch(() => null))
                ]);

                // Refresh dropdowns
                const [freshCats, freshBrands] = await Promise.all([
                    inventoryCategoriesAPI.getAll(),
                    inventoryBrandsAPI.getAll()
                ]);
                setCategories(freshCats || []);
                setManagedBrands(freshBrands || []);
            } catch (syncErr) {
                console.warn('Category/brand sync after import failed (non-fatal):', syncErr);
            }
        }

        let summary = `Import Complete!\n\n✅ Imported: ${successCount}\n⏭️ Skipped (already exist): ${skippedCount}\n❌ Failed: ${errors.length}`;
        if (errors.length > 0) {
            summary += `\n\nFailed rows:\n${errors.slice(0, 10).join('\n')}`;
            if (errors.length > 10) summary += `\n…and ${errors.length - 10} more (check console).`;
        }
        alert(summary);
    };

    const handleCreateProduct = async (newProduct) => {
        // NOTE: this function re-throws on failure so callers (incl. bulk import) can detect errors.
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
    };

    const handleDeleteProduct = async (id) => {
        try {
            await inventoryAPI.delete(id);
            setProducts(prevProducts => prevProducts.filter(p => p.id !== id));
            setSelectedProduct(null);
        } catch (err) {
            // Blocking dependency error — show modal instead of plain alert
            if (err.blocking && err.blocking.length > 0) {
                const product = products.find(p => p.id === id);
                setDependencyModal({ product, dependencies: err.blocking });
                return;
            }
            console.error('Error deleting product:', err);
            alert('Failed to delete product: ' + err.message);
        }
    };

    const handleArchiveProduct = async (id) => {
        try {
            await inventoryAPI.update(id, { status: 'archived' });
            setProducts(prev => prev.map(p => p.id === id ? { ...p, status: 'archived' } : p));
            setSelectedProduct(null);
            setDependencyModal(null);
        } catch (err) {
            console.error('Error archiving product:', err);
            alert('Failed to archive: ' + err.message);
        }
    };

    const handleRestoreProduct = async (id) => {
        try {
            await inventoryAPI.update(id, { status: 'active' });
            setProducts(prev => prev.map(p => p.id === id ? { ...p, status: 'active' } : p));
        } catch (err) {
            console.error('Error restoring product:', err);
            alert('Failed to restore: ' + err.message);
        }
    };

    const handleDeleteMany = async (ids) => {
        const blockedItems = [];
        const deletedIds = [];
        for (const id of ids) {
            try {
                await inventoryAPI.delete(id);
                deletedIds.push(id);
            } catch (err) {
                if (err.blocking) {
                    const p = products.find(x => x.id === id);
                    blockedItems.push(p?.name || id);
                } else {
                    console.error('Delete failed for id:', id, err);
                }
            }
        }
        setProducts(prev => prev.filter(p => !deletedIds.includes(p.id)));
        if (blockedItems.length > 0) {
            alert(`${blockedItems.length} item(s) could not be deleted because they are in use:\n• ${blockedItems.join('\n• ')}\n\nArchive them instead.`);
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Row 1: Header */}
            <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}
                    style={{ padding: '6px 16px', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                    <Plus size={15} /> Create
                </button>
            </div>

            {/* Row 2: View Type Toggles + Columns + Refresh + Count */}
            <div style={{ padding: '6px 12px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <select
                    value={viewType}
                    onChange={(e) => setViewType(e.target.value)}
                    style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid var(--border-primary)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                    <option value="table">Table View</option>
                    <option value="card">Card View</option>
                    <option value="kanban">Kanban View</option>
                    <option value="details">Details View</option>
                </select>

                {/* Status filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid var(--border-primary)', borderRadius: '6px', backgroundColor: statusFilter === 'archived' ? 'rgba(239,68,68,0.08)' : 'var(--bg-primary)', color: statusFilter === 'archived' ? '#ef4444' : 'var(--text-secondary)', cursor: 'pointer' }}
                >
                    <option value="active">Active Items</option>
                    <option value="archived">🗄️ Archived</option>
                    <option value="all">All Items</option>
                </select>

                <div style={{ position: 'relative' }}>
                    <button onClick={() => setShowColumnPicker(p => !p)}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', border: '1px solid var(--border-primary)', borderRadius: '6px', backgroundColor: showColumnPicker ? '#6366f1' : 'transparent', color: showColumnPicker ? 'white' : '#94a3b8', cursor: 'pointer', fontSize: '12px', transition: 'all 0.15s' }}>
                        <SlidersHorizontal size={13} /> Columns
                    </button>
                    {showColumnPicker && (
                        <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 200, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '10px 0', minWidth: '220px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', maxHeight: '350px', overflowY: 'auto' }}>
                            <div style={{ padding: '4px 14px 8px', fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Toggle Columns</div>
                            {inventoryColumns.map((col) => (
                                <div key={col.id} style={{ display: 'flex', alignItems: 'center', padding: '5px 14px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, flex: 1, margin: 0 }}>
                                        <input type="checkbox" checked={visibleColumns.has(col.id)} onChange={() => toggleColumn(col.id)}
                                            style={{ accentColor: '#6366f1', width: 14, height: 14, margin: 0, cursor: 'pointer' }} />
                                        {col.label}
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ flex: 1 }} />

                <ImportExportButtons 
                    data={processedProducts} 
                    columns={inventoryColumns.filter(c => visibleColumns.has(c.id))} 
                    exportFilename="SortedSolutions_Inventory"
                    onImport={handleBulkImport}
                    templateConfig={getTemplateConfig()}
                />

                <button
                    onClick={() => { const tmp = viewType; setViewType('__reset__'); setTimeout(() => setViewType(tmp), 0); }}
                    title="Refresh"
                    style={{ padding: '5px 10px', fontSize: '12px', cursor: 'pointer', border: '1px solid var(--border-primary)', borderRadius: '6px', backgroundColor: 'transparent', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s' }}
                >
                    <RefreshCw size={13} /> Refresh
                </button>
                <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span>{processedProducts.length} / {products.length} entries</span>
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: '2px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border-primary)', backgroundColor: currentPage === 1 ? 'var(--bg-secondary)' : 'var(--bg-elevated)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)' }}>Prev</button>
                            <span style={{ fontSize: '11px' }}>{currentPage} / {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ padding: '2px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border-primary)', backgroundColor: currentPage === totalPages ? 'var(--bg-secondary)' : 'var(--bg-elevated)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)' }}>Next</button>
                        </div>
                    )}
                </div>
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
                        {viewType === 'table' && <InventoryTableView products={visibleProducts} onProductClick={setSelectedProduct} categories={categories} visibleColumns={visibleColumns} onDelete={handleDeleteProduct} onDeleteMany={handleDeleteMany} onArchive={handleArchiveProduct} onRestore={handleRestoreProduct} showArchived={statusFilter === 'archived'} />}
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
            {/* Dependency / Archive Modal */}
            {dependencyModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border-primary)', padding: '24px', maxWidth: '480px', width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ fontSize: '24px' }}>⚠️</div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>Cannot Delete — Item In Use</div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    <strong style={{ color: 'var(--text-primary)' }}>{dependencyModal.product?.name}</strong> is referenced in the following records:
                                </div>
                            </div>
                        </div>
                        <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', padding: '12px', marginBottom: '20px', maxHeight: '200px', overflowY: 'auto' }}>
                            {dependencyModal.dependencies.map((dep, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < dependencyModal.dependencies.length - 1 ? '1px solid var(--border-primary)' : 'none', fontSize: '12px' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{dep.table}</span>
                                    <span style={{ color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{dep.ref}{dep.date ? ` · ${new Date(dep.date).toLocaleDateString('en-IN')}` : ''}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>
                            To remove this item permanently, first clear it from all linked transactions. Or you can <strong>archive</strong> it — it will be hidden from active inventory but preserved for historical records.
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setDependencyModal(null)}
                                style={{ padding: '8px 18px', border: '1px solid var(--border-primary)', borderRadius: '8px', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}
                            >Cancel</button>
                            <button onClick={() => handleArchiveProduct(dependencyModal.product?.id)}
                                style={{ padding: '8px 18px', border: 'none', borderRadius: '8px', backgroundColor: '#f59e0b', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                            >🗃️ Archive Instead</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InventoryTab;
