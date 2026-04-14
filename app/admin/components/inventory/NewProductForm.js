'use client'

import { useState } from 'react';
import { X, Upload, Plus, Trash2 } from 'lucide-react';
import { generateProductSKU } from '@/lib/utils/inventoryHelpers';
import { inventoryCategoriesAPI, inventoryBrandsAPI } from '@/lib/adminAPI';


async function uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'media');
    formData.append('folder', 'inventory');
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Image upload failed');
    return data.url;
}


function NewProductForm({
    onClose,
    onSave,
    categories = [],
    brands = [],
    termsTemplates = [],
    existingProducts = [],
    onCategoryAdded,   // (categoryObj) => void  — bubbles real DB record to parent
    onBrandAdded,      // (brandObj) => void
}) {
    const [formData, setFormData] = useState({
        name: '',
        type: 'product',
        category: '',
        brand: '',
        description: '',
        images: [],

        // Product fields
        unitOfMeasure: 'pcs',
        openingBalance: {
            quantity: 0,
            date: new Date().toISOString().split('T')[0]
        },
        minStockLevel: '',

        // Service fields
        serviceTermsTemplate: '',

        // GST fields — always required
        gstRate: '',
        hsnCode: '',
        hsnDescription: '',

        // Pricing (4 prices)
        purchasePrice: '',
        salePrice: '',
        dealerPrice: '',
        retailPrice: ''
    });

    const [imagePreview, setImagePreview] = useState([]);
    const [saving, setSaving] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);

    // Auto-generate SKU from type + existing products
    const autoSKU = generateProductSKU(formData.type, existingProducts);

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        const newImages = files.map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));
        setImagePreview([...imagePreview, ...newImages]);
        setFormData({ ...formData, images: [...formData.images, ...files] });
    };

    const removeImage = (index) => {
        const newPreviews = imagePreview.filter((_, i) => i !== index);
        const newImages = formData.images.filter((_, i) => i !== index);
        setImagePreview(newPreviews);
        setFormData({ ...formData, images: newImages });
    };

    // ── Inline add category / brand ──────────────────────────────────────────
    const [addingList, setAddingList] = useState(null); // 'category' | 'brand' | null
    const [newListItem, setNewListItem] = useState('');
    const [addingListError, setAddingListError] = useState('');
    const [localCategories, setLocalCategories] = useState(categories);
    const [localBrands, setLocalBrands] = useState(brands);

    const handleAddListItem = async () => {
        const name = newListItem.trim();
        if (!name) return;
        try {
            if (addingList === 'category') {
                const created = await inventoryCategoriesAPI.create({ name });
                // Use the real DB record (has the real id)
                const newCat = created || { id: `_new_${name}`, name };
                setLocalCategories(prev => [...prev, newCat]);
                setFormData(prev => ({ ...prev, category: newCat.name }));
                // Bubble up to parent InventoryTab so future form opens see it
                if (onCategoryAdded) onCategoryAdded(newCat);
            } else {
                const created = await inventoryBrandsAPI.create({ name });
                const newBrand = created || { id: `_new_${name}`, name };
                setLocalBrands(prev => [...prev, newBrand]);
                setFormData(prev => ({ ...prev, brand: newBrand.name }));
                if (onBrandAdded) onBrandAdded(newBrand);
            }
            setNewListItem('');
            setAddingList(null);
            setAddingListError('');
        } catch (err) {
            setAddingListError(err?.message || 'Failed to add — it may already exist.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            // 1. Upload images first
            let imageUrls = [];
            if (formData.images.length > 0) {
                setUploadingImages(true);
                imageUrls = await Promise.all(formData.images.map(uploadImage));
                setUploadingImages(false);
            }

            // 2. Build product payload
            const newProduct = {
                name: formData.name,
                sku: autoSKU,
                type: formData.type,
                category: formData.category,
                brand: formData.brand || null,
                description: formData.description || null,
                images: imageUrls,                          // ✅ saved to DB
                unit_of_measure: formData.type === 'service' ? null : formData.unitOfMeasure,
                opening_balance_qty: formData.type === 'service' ? null : (parseFloat(formData.openingBalance.quantity) || 0),
                opening_balance_date: formData.type === 'service' ? null : formData.openingBalance.date,
                current_stock: formData.type === 'service' ? null : (parseFloat(formData.openingBalance.quantity) || 0),
                min_stock_level: formData.type === 'service' ? null : (parseFloat(formData.minStockLevel) || 0), // ✅
                purchase_price: parseFloat(formData.purchasePrice) || 0,
                sale_price: parseFloat(formData.salePrice) || 0,
                dealer_price: parseFloat(formData.dealerPrice) || 0,
                retail_price: parseFloat(formData.retailPrice) || 0,
                gst_applicable: true,                       // always mandatory
                gst_rate: parseFloat(formData.gstRate) || 0,
                hsn_code: formData.hsnCode || null,
                hsn_description: formData.hsnDescription || null,
                service_terms_template: formData.serviceTermsTemplate || null,
                status: 'active'
            };

            if (onSave) {
                await onSave(newProduct);
            }
            onClose();
        } catch (err) {
            console.error('Create product error:', err);
            alert('Failed to create: ' + (err.message || 'Unknown error'));
        } finally {
            setSaving(false);
            setUploadingImages(false);
        }
    };

    const showStockFields = formData.type === 'product';
    const showServiceFields = formData.type === 'service';
    const isSaving = saving || uploadingImages;
    const saveLabel = uploadingImages ? 'Uploading images...' : saving ? 'Saving...' : `Create ${formData.type === 'product' ? 'Product' : 'Service'}`;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
                <form onSubmit={handleSubmit}>
                    <div className="modal-header">
                        <h2 className="modal-title">Create New {formData.type === 'product' ? 'Product' : 'Service'}</h2>
                        <button type="button" className="btn-icon" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="modal-body">

                        {/* ── 1. Images (FIRST) ───────────────────────────── */}
                        <div className="card mb-md">
                            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>
                                {formData.type === 'service' ? 'Service' : 'Product'} Images
                            </h3>

                            <div className="form-group">
                                <label className="form-label">Upload Images</label>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-sm)',
                                    padding: 'var(--spacing-md)',
                                    border: '2px dashed var(--border-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    backgroundColor: 'var(--bg-secondary)',
                                    transition: 'border-color 0.2s'
                                }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-primary)'}
                                >
                                    <Upload size={20} style={{ color: 'var(--text-tertiary)' }} />
                                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                        Click to upload or drag &amp; drop images
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageUpload}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                            </div>

                            {imagePreview.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                                    {imagePreview.map((img, index) => (
                                        <div key={index} style={{ position: 'relative' }}>
                                            <img
                                                src={img.preview}
                                                alt={`Preview ${index + 1}`}
                                                style={{
                                                    width: '100%',
                                                    height: '100px',
                                                    objectFit: 'cover',
                                                    borderRadius: 'var(--radius-sm)'
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '4px',
                                                    right: '4px',
                                                    padding: '4px',
                                                    backgroundColor: 'var(--color-danger)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: 'var(--radius-sm)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── 2. Basic Information ─────────────────────────── */}
                        <div className="card mb-md">
                            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Basic Information</h3>

                            {/* Type Selection */}
                            <div className="form-group">
                                <label className="form-label">Type *</label>
                                <select
                                    className="form-select"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    required
                                >
                                    <option value="product">Product</option>
                                    <option value="service">Service</option>
                                </select>
                                <div style={{ marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                    Select type first — form fields will adapt accordingly
                                </div>
                            </div>

                            {/* SKU — auto-generated, read-only */}
                            <div className="form-group">
                                <label className="form-label">SKU (Auto-generated)</label>
                                <div style={{
                                    padding: '8px 12px',
                                    backgroundColor: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontFamily: 'monospace',
                                    fontSize: 'var(--font-size-sm)',
                                    color: 'var(--text-secondary)',
                                    letterSpacing: '0.05em'
                                }}>
                                    {autoSKU}
                                </div>
                                <div style={{ marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                    Automatically assigned on create
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">{formData.type === 'service' ? 'Service' : 'Product'} Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder={formData.type === 'service' ? 'e.g., AC Installation Service' : 'e.g., Samsung Split AC 1.5 Ton'}
                                />
                            </div>

                            {/* Inline add mini-modal */}
                            {addingList && (
                                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={() => { setAddingList(null); setNewListItem(''); setAddingListError(''); }}>
                                    <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-lg)', width: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                            <h4 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>
                                                Add New {addingList === 'category' ? 'Category' : 'Brand'}
                                            </h4>
                                            <button type="button" className="btn-icon" onClick={() => { setAddingList(null); setNewListItem(''); setAddingListError(''); }}><X size={16} /></button>
                                        </div>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={newListItem}
                                            onChange={e => { setNewListItem(e.target.value); setAddingListError(''); }}
                                            placeholder={addingList === 'category' ? 'e.g., Air Conditioners' : 'e.g., Samsung'}
                                            autoFocus
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddListItem())}
                                            style={{ marginBottom: 'var(--spacing-xs)' }}
                                        />
                                        {addingListError && <div style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--spacing-xs)' }}>{addingListError}</div>}
                                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                                            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={handleAddListItem}>Add {addingList === 'category' ? 'Category' : 'Brand'}</button>
                                            <button type="button" className="btn btn-secondary" onClick={() => { setAddingList(null); setNewListItem(''); setAddingListError(''); }}>Cancel</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                <div className="form-group">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <label className="form-label" style={{ margin: 0 }}>Category *</label>
                                        <button
                                            type="button"
                                            onClick={() => { setAddingList('category'); setNewListItem(''); setAddingListError(''); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
                                            title="Add new category"
                                        >
                                            <Plus size={12} /> Add new
                                        </button>
                                    </div>
                                    <select
                                        className="form-select"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        required
                                    >
                                        <option value="">— Select category —</option>
                                        {localCategories.map(cat => (
                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        {/* Brand is required for products, optional for services */}
                                        <label className="form-label" style={{ margin: 0 }}>
                                            Brand {formData.type === 'product' ? '*' : ''}
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => { setAddingList('brand'); setNewListItem(''); setAddingListError(''); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
                                            title="Add new brand"
                                        >
                                            <Plus size={12} /> Add new
                                        </button>
                                    </div>
                                    <select
                                        className="form-select"
                                        value={formData.brand}
                                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                        required={formData.type === 'product'}   /* ✅ optional for services */
                                    >
                                        <option value="">— Select brand —</option>
                                        {localBrands.map(b => (
                                            <option key={b.id} value={b.name}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-textarea"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    placeholder={formData.type === 'service' ? 'Service description...' : 'Product description...'}
                                />
                            </div>
                        </div>

                        {/* ── 3. Unit & Stock — Products Only ─────────────── */}
                        {showStockFields && (
                            <div className="card mb-md">
                                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Unit &amp; Opening Stock</h3>

                                <div className="form-group">
                                    <label className="form-label">Unit of Measure *</label>
                                    <select
                                        className="form-select"
                                        value={formData.unitOfMeasure}
                                        onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                                        required
                                    >
                                        <option value="pcs">Pieces (Pcs)</option>
                                        <option value="kg">Kilograms (Kg)</option>
                                        <option value="ltr">Liters (Ltr)</option>
                                        <option value="mtr">Meters (Mtr)</option>
                                        <option value="box">Box</option>
                                        <option value="set">Set</option>
                                        <option value="unit">Unit</option>
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-md)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Opening Balance (Qty)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.openingBalance.quantity}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                openingBalance: { ...formData.openingBalance, quantity: e.target.value }
                                            })}
                                            min="0"
                                            placeholder="0"
                                        />
                                    </div>

                                    {/* ✅ NEW: Min Stock Level */}
                                    <div className="form-group">
                                        <label className="form-label">Min Stock Level</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.minStockLevel}
                                            onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
                                            min="0"
                                            placeholder="e.g. 5"
                                        />
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '3px' }}>
                                            Alert threshold for low stock
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Opening Balance Date</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={formData.openingBalance.date}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                openingBalance: { ...formData.openingBalance, date: e.target.value }
                                            })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── 4. Service Terms — Services Only ─────────────── */}
                        {showServiceFields && (
                            <div className="card mb-md">
                                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Service Terms &amp; Conditions</h3>

                                <div className="form-group">
                                    <label className="form-label">Terms &amp; Conditions Template</label>
                                    <select
                                        className="form-select"
                                        value={formData.serviceTermsTemplate}
                                        onChange={(e) => setFormData({ ...formData, serviceTermsTemplate: e.target.value })}
                                    >
                                        <option value="">No Template (Add custom terms)</option>
                                        <optgroup label="Invoice Templates">
                                            {termsTemplates.filter(t => t.type === 'invoice').map(template => (
                                                <option key={template.id} value={template.id}>{template.name}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Service Templates">
                                            {termsTemplates.filter(t => t.type === 'service').map(template => (
                                                <option key={template.id} value={template.id}>{template.name}</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                    <div style={{ marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                        Manage templates in Reports → Print Setup
                                    </div>
                                </div>

                                {formData.serviceTermsTemplate && (
                                    <div style={{ marginTop: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        ✓ Template assigned: <strong>{termsTemplates.find(t => t.id === formData.serviceTermsTemplate)?.name}</strong>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── 5. GST Information — mandatory for all ──────── */}
                        <div className="card mb-md">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-md)' }}>
                                <h3 style={{ margin: 0 }}>GST Information</h3>
                                <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366f1', borderRadius: '999px' }}>Required</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-md)' }}>
                                <div className="form-group">
                                    <label className="form-label">GST Rate (%) *</label>
                                    <select
                                        className="form-select"
                                        value={formData.gstRate}
                                        onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Rate</option>
                                        <option value="0">0% (Exempt)</option>
                                        <option value="5">5%</option>
                                        <option value="12">12%</option>
                                        <option value="18">18%</option>
                                        <option value="28">28%</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">HSN / SAC Code *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.hsnCode}
                                        onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                                        placeholder={formData.type === 'service' ? 'e.g., 998519' : 'e.g., 8415'}
                                        required
                                    />
                                    <div style={{ marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                        {formData.type === 'service' ? 'SAC code for services' : 'HSN code for goods'}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">HSN Description</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.hsnDescription}
                                        onChange={(e) => setFormData({ ...formData, hsnDescription: e.target.value })}
                                        placeholder="e.g., Air Conditioning Machines"
                                    />
                                    <div style={{ marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Official description for GST filing</div>
                                </div>
                            </div>
                        </div>

                        {/* ── 6. Pricing ───────────────────────────────────── */}
                        <div className="card mb-md">
                            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Pricing</h3>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>

                                <div className="form-group">
                                    <label className="form-label">Purchase Rate (₹)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.purchasePrice}
                                        onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                    />
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '3px' }}>Your cost / purchase cost</div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Sale Price (₹) *</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.salePrice}
                                        onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                                        required
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                    />
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '3px' }}>Standard sale price</div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Dealer Price (₹)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.dealerPrice}
                                        onChange={(e) => setFormData({ ...formData, dealerPrice: e.target.value })}
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                    />
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '3px' }}>Price for dealers / partners</div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Retail Price / MRP (₹)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.retailPrice}
                                        onChange={(e) => setFormData({ ...formData, retailPrice: e.target.value })}
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                    />
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '3px' }}>Maximum Retail Price</div>
                                </div>
                            </div>

                            {/* Margin summary */}
                            {formData.purchasePrice && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)' }}>
                                    {[
                                        { label: 'Sale Margin', price: formData.salePrice },
                                        { label: 'Dealer Margin', price: formData.dealerPrice },
                                        { label: 'Retail Margin', price: formData.retailPrice }
                                    ].map(({ label, price }) => {
                                        const cost = parseFloat(formData.purchasePrice) || 0;
                                        const p = parseFloat(price) || 0;
                                        const margin = p - cost;
                                        const pct = cost > 0 ? ((margin / cost) * 100).toFixed(1) : null;
                                        return price ? (
                                            <div key={label} style={{ textAlign: 'center' }}>
                                                <div style={{ color: 'var(--text-tertiary)' }}>{label}</div>
                                                <div style={{ fontWeight: 600, color: margin >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                                    ₹{margin.toFixed(2)} {pct ? `(${pct}%)` : ''}
                                                </div>
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            <Plus size={16} />
                            {saveLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default NewProductForm;
