'use client'

import { useState } from 'react';
import { X, Upload, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { productCategories } from '@/lib/data/inventoryData';

function NewProductForm({ onClose, onSave }) {
    // Auto-generate SKU
    const generateSKU = () => {
        const timestamp = Date.now().toString().slice(-6);
        return `SKU-${timestamp}`;
    };

    const [formData, setFormData] = useState({
        name: '',
        sku: generateSKU(), // Auto-generated
        type: 'product',
        category: '',
        brand: '',
        description: '',
        images: [],
        visibleOnWebsite: true,

        // Product fields
        unitOfMeasure: 'pcs',
        openingBalance: {
            quantity: 0,
            date: new Date().toISOString().split('T')[0]
        },
        minStockLevel: 10,

        // Service fields
        serviceTermsTemplate: '',

        // GST fields
        gstApplicable: false,
        gstRate: '',
        hsnCode: '',
        sacCode: '',

        // Pricing
        salePrice: '',
        purchasePrice: ''
    });

    const [imagePreview, setImagePreview] = useState([]);

    // Sample Terms & Conditions Templates (these would come from Print Setup in Reports tab)
    const termsTemplates = [
        { id: 'invoice-std', name: 'Standard Invoice Terms', type: 'invoice' },
        { id: 'invoice-warranty', name: 'Invoice with Warranty Terms', type: 'invoice' },
        { id: 'quotation-std', name: 'Standard Quotation Terms', type: 'quotation' },
        { id: 'quotation-validity', name: 'Quotation with Validity Terms', type: 'quotation' },
        { id: 'service-general', name: 'General Service Terms', type: 'service' },
        { id: 'service-amc', name: 'AMC Service Terms', type: 'service' }
    ];

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

    const handleSubmit = (e) => {
        e.preventDefault();

        const newProduct = {
            name: formData.name,
            sku: formData.sku,
            type: formData.type,
            category: formData.category,
            brand: formData.brand,
            description: formData.description,
            unit_of_measure: formData.unitOfMeasure,
            min_stock_level: parseInt(formData.minStockLevel) || 0,
            opening_balance_qty: parseFloat(formData.openingBalance.quantity) || 0,
            opening_balance_date: formData.openingBalance.date,
            current_stock: formData.type === 'service' ? null : (parseFloat(formData.openingBalance.quantity) || 0),
            sale_price: parseFloat(formData.salePrice) || 0,
            purchase_price: parseFloat(formData.purchasePrice) || 0,
            gst_applicable: formData.gstApplicable,
            gst_rate: parseFloat(formData.gstRate) || 0,
            hsn_code: formData.hsnCode,
            sac_code: formData.sacCode,
            visible_on_website: formData.visibleOnWebsite,
            service_terms_template: formData.serviceTermsTemplate,
            status: 'active',
            created_at: new Date().toISOString()
        };

        console.log('Processed Product for Supabase:', newProduct);

        if (onSave) {
            onSave(newProduct);
        }
        onClose();
    };

    const showStockFields = formData.type === 'product' || formData.type === 'combo';
    const showServiceFields = formData.type === 'service' || formData.type === 'combo';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
                <form onSubmit={handleSubmit}>
                    <div className="modal-header">
                        <h2 className="modal-title">Create New {formData.type === 'product' ? 'Product' : formData.type === 'service' ? 'Service' : 'Combo'}</h2>
                        <button type="button" className="btn-icon" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="modal-body">
                        {/* Basic Information */}
                        <div className="card mb-md">
                            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Basic Information</h3>

                            {/* Type Selection - FIRST */}
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
                                    <option value="combo">Combo (Product + Service)</option>
                                </select>
                                <div style={{
                                    marginTop: 'var(--spacing-xs)',
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--text-tertiary)'
                                }}>
                                    Select type first - form fields will adapt accordingly
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

                            <div className="form-group">
                                <label className="form-label">SKU (Auto-generated) *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    required
                                    placeholder="e.g., SKU-123456"
                                />
                                <div style={{
                                    marginTop: 'var(--spacing-xs)',
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--text-tertiary)'
                                }}>
                                    Auto-generated, but you can edit if needed
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        placeholder="Type to search or enter new"
                                        list="category-suggestions"
                                    />
                                    <datalist id="category-suggestions">
                                        {productCategories.map(cat => (
                                            <option key={cat.id} value={cat.name} />
                                        ))}
                                    </datalist>
                                    <div style={{
                                        marginTop: 'var(--spacing-xs)',
                                        fontSize: 'var(--font-size-xs)',
                                        color: 'var(--text-tertiary)'
                                    }}>
                                        Type to search or enter new category
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Brand</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.brand}
                                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                        placeholder="e.g., Samsung, LG, Voltas"
                                        list="brand-suggestions"
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
                                    <div style={{
                                        marginTop: 'var(--spacing-xs)',
                                        fontSize: 'var(--font-size-xs)',
                                        color: 'var(--text-tertiary)'
                                    }}>
                                        Type to search or enter new brand
                                    </div>
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

                            {/* Website Visibility Toggle */}
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.visibleOnWebsite}
                                        onChange={(e) => setFormData({ ...formData, visibleOnWebsite: e.target.checked })}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <span className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                        {formData.visibleOnWebsite ? <Eye size={16} /> : <EyeOff size={16} />}
                                        Visible on Website
                                    </span>
                                </label>
                                <div style={{
                                    marginTop: 'var(--spacing-xs)',
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--text-tertiary)',
                                    marginLeft: '26px'
                                }}>
                                    {formData.visibleOnWebsite
                                        ? 'This item will be displayed on your website'
                                        : 'This item will be hidden from your website'}
                                </div>
                            </div>
                        </div>

                        {/* Images */}
                        <div className="card mb-md">
                            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>{formData.type === 'service' ? 'Service' : 'Product'} Images</h3>

                            <div className="form-group">
                                <label className="form-label">Upload Images</label>
                                <input
                                    type="file"
                                    className="form-input"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageUpload}
                                />
                            </div>

                            {imagePreview.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 'var(--spacing-sm)' }}>
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

                        {/* Unit & Stock - Only for Products and Combos */}
                        {showStockFields && (
                            <div className="card mb-md">
                                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Unit & Stock Information</h3>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Unit of Measure *</label>
                                        <select
                                            className="form-select"
                                            value={formData.unitOfMeasure}
                                            onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                                            required={showStockFields}
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

                                    <div className="form-group">
                                        <label className="form-label">Minimum Stock Level</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.minStockLevel}
                                            onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 0 })}
                                            min="0"
                                        />
                                    </div>
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

                        {/* Service Terms & Conditions - Only for Services and Combos */}
                        {showServiceFields && (
                            <div className="card mb-md">
                                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Service Terms & Conditions</h3>

                                <div className="form-group">
                                    <label className="form-label">Terms & Conditions Template</label>
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
                                        <optgroup label="Quotation Templates">
                                            {termsTemplates.filter(t => t.type === 'quotation').map(template => (
                                                <option key={template.id} value={template.id}>{template.name}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Service Templates">
                                            {termsTemplates.filter(t => t.type === 'service').map(template => (
                                                <option key={template.id} value={template.id}>{template.name}</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                    <div style={{
                                        marginTop: 'var(--spacing-xs)',
                                        fontSize: 'var(--font-size-xs)',
                                        color: 'var(--text-tertiary)'
                                    }}>
                                        Manage templates in Reports → Print Setup
                                    </div>
                                </div>

                                {formData.serviceTermsTemplate && (
                                    <div style={{
                                        marginTop: 'var(--spacing-sm)',
                                        padding: 'var(--spacing-sm)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: 'var(--font-size-xs)',
                                        color: 'var(--text-secondary)'
                                    }}>
                                        ✓ Template assigned: <strong>{termsTemplates.find(t => t.id === formData.serviceTermsTemplate)?.name}</strong>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* GST Information */}
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
                                                HSN Code {(formData.type === 'product' || formData.type === 'combo') && '*'}
                                            </label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formData.hsnCode}
                                                onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                                                placeholder="e.g., 8415"
                                                required={formData.gstApplicable && (formData.type === 'product' || formData.type === 'combo')}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">
                                                SAC Code {(formData.type === 'service' || formData.type === 'combo') && '*'}
                                            </label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formData.sacCode}
                                                onChange={(e) => setFormData({ ...formData, sacCode: e.target.value })}
                                                placeholder="e.g., 998519"
                                                required={formData.gstApplicable && (formData.type === 'service' || formData.type === 'combo')}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Pricing */}
                        <div className="card mb-md">
                            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Pricing</h3>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
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
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        {formData.type === 'service' ? 'Cost Price (₹)' : 'Purchase Price (₹)'}
                                    </label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.purchasePrice}
                                        onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            {formData.salePrice && formData.purchasePrice && (
                                <div style={{
                                    padding: 'var(--spacing-sm)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: 'var(--font-size-sm)'
                                }}>
                                    <strong>Profit Margin:</strong> ₹{(parseFloat(formData.salePrice) - parseFloat(formData.purchasePrice)).toFixed(2)}
                                    ({((parseFloat(formData.salePrice) - parseFloat(formData.purchasePrice)) / parseFloat(formData.purchasePrice) * 100).toFixed(2)}%)
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            <Plus size={16} />
                            Create {formData.type === 'product' ? 'Product' : formData.type === 'service' ? 'Service' : 'Combo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default NewProductForm;
