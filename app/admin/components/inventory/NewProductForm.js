'use client'

import { useState } from 'react';
import { X, Upload, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { generateProductSKU } from '@/lib/utils/inventoryHelpers';


function NewProductForm({ onClose, onSave, categories = [], termsTemplates = [], existingProducts = [] }) {
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

        // Service fields
        serviceTermsTemplate: '',

        // GST fields
        gstApplicable: false,
        gstRate: '',
        hsnCode: '',
        sacCode: '',

        // Pricing (4 prices)
        purchasePrice: '',  // Purchase Rate / Cost
        salePrice: '',      // Sale Price (standard)
        dealerPrice: '',    // Dealer Price
        retailPrice: ''     // Retail Price / MRP
    });

    const [imagePreview, setImagePreview] = useState([]);
    const [saving, setSaving] = useState(false);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        const newProduct = {
            name: formData.name,
            sku: autoSKU,
            type: formData.type,
            category: formData.category,
            brand: formData.brand || null,
            description: formData.description || null,
            unit_of_measure: formData.type === 'service' ? null : formData.unitOfMeasure,
            opening_balance_qty: formData.type === 'service' ? null : (parseFloat(formData.openingBalance.quantity) || 0),
            opening_balance_date: formData.type === 'service' ? null : formData.openingBalance.date,
            current_stock: formData.type === 'service' ? null : (parseFloat(formData.openingBalance.quantity) || 0),
            purchase_price: parseFloat(formData.purchasePrice) || 0,
            sale_price: parseFloat(formData.salePrice) || 0,
            dealer_price: parseFloat(formData.dealerPrice) || 0,
            retail_price: parseFloat(formData.retailPrice) || 0,
            gst_applicable: formData.gstApplicable,
            gst_rate: parseFloat(formData.gstRate) || 0,
            hsn_code: formData.hsnCode || null,
            sac_code: formData.sacCode || null,
            service_terms_template: formData.serviceTermsTemplate || null,
            status: 'active'
        };

        try {
            if (onSave) {
                await onSave(newProduct);
            }
            onClose();
        } catch (err) {
            console.error('Create product error:', err);
            alert('Failed to create: ' + (err.message || 'Unknown error'));
        } finally {
            setSaving(false);
        }
    };

    const showStockFields = formData.type === 'product';
    const showServiceFields = formData.type === 'service';

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

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                <div className="form-group">
                                    <label className="form-label">Category *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        placeholder="Type to search or enter new"
                                        list="category-suggestions"
                                        required
                                    />
                                    <datalist id="category-suggestions">
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.name} />
                                        ))}
                                    </datalist>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Brand *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.brand}
                                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                        placeholder="e.g., Samsung, LG, Voltas"
                                        list="brand-suggestions"
                                        required
                                    />
                                    <datalist id="brand-suggestions">
                                        <option value="Samsung" />
                                        <option value="LG" />
                                        <option value="Voltas" />
                                        <option value="Daikin" />
                                        <option value="Hitachi" />
                                        <option value="Blue Star" />
                                        <option value="Carrier" />
                                        <option value="Godrej" />
                                        <option value="Whirlpool" />
                                        <option value="Panasonic" />
                                    </datalist>
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

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
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

                        {/* ── 5. GST Information ───────────────────────────── */}
                        <div className="card mb-md">
                            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>GST Information</h3>

                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.gstApplicable}
                                        onChange={(e) => setFormData({ ...formData, gstApplicable: e.target.checked })}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <span className="form-label" style={{ margin: 0 }}>GST Applicable</span>
                                </label>
                            </div>

                            {formData.gstApplicable && (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-md)' }}>
                                        <div className="form-group">
                                            <label className="form-label">GST Rate (%) *</label>
                                            <select
                                                className="form-select"
                                                value={formData.gstRate}
                                                onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                                                required={formData.gstApplicable}
                                            >
                                                <option value="">Select Rate</option>
                                                <option value="0">0%</option>
                                                <option value="5">5%</option>
                                                <option value="12">12%</option>
                                                <option value="18">18%</option>
                                                <option value="28">28%</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">
                                                HSN Code {formData.type === 'product' && '*'}
                                            </label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formData.hsnCode}
                                                onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                                                placeholder="e.g., 8415"
                                                required={formData.gstApplicable && formData.type === 'product'}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">
                                                SAC Code {formData.type === 'service' && '*'}
                                            </label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formData.sacCode}
                                                onChange={(e) => setFormData({ ...formData, sacCode: e.target.value })}
                                                placeholder="e.g., 998519"
                                                required={formData.gstApplicable && formData.type === 'service'}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* ── 6. Pricing ───────────────────────────────────── */}
                        <div className="card mb-md">
                            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Pricing</h3>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>

                                <div className="form-group">
                                    <label className="form-label">Purchase Rate (₹) *</label>
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
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            <Plus size={16} />
                            {saving ? 'Saving...' : `Create ${formData.type === 'product' ? 'Product' : 'Service'}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default NewProductForm;
