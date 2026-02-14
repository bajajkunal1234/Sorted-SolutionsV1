'use client'

import { useState } from 'react';
import { Calendar, Plus, Trash2, Edit2, Save, X, Upload } from 'lucide-react';

function QuickBookingFormSettings() {
    const [products, setProducts] = useState([
        'Air Conditioner (AC)',
        'Washing Machine',
        'Refrigerator / Fridge',
        'Microwave Oven',
        'RO Water Purifier',
        'Gas Stove / Hob',
        'Dishwasher',
        'Geyser / Water Heater'
    ]);

    const [issues, setIssues] = useState([
        'Not Working / Dead',
        'Not Cooling',
        'Not Heating',
        'Making Loud Noise',
        'Leaking Water',
        'Not Spinning',
        'Bad Smell / Odor',
        'Not Starting',
        'Other Issue'
    ]);

    const [pincodes, setPincodes] = useState('400001, 400002, 400003, 400004, 400005, 400008, 400012, 400014, 400050, 400051, 400052, 400053, 400063, 400070, 400077');

    const [newProduct, setNewProduct] = useState('');
    const [newIssue, setNewIssue] = useState('');
    const [editingProduct, setEditingProduct] = useState(null);
    const [editingIssue, setEditingIssue] = useState(null);

    const handleAddProduct = () => {
        if (newProduct.trim()) {
            setProducts([...products, newProduct.trim()]);
            setNewProduct('');
        }
    };

    const handleAddIssue = () => {
        if (newIssue.trim()) {
            setIssues([...issues, newIssue.trim()]);
            setNewIssue('');
        }
    };

    const handleRemoveProduct = (index) => {
        setProducts(products.filter((_, i) => i !== index));
    };

    const handleRemoveIssue = (index) => {
        setIssues(issues.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        // TODO: Save to backend
        const pincodeArray = pincodes.split(',').map(p => p.trim()).filter(p => p);
        alert(`Settings saved!\nProducts: ${products.length}\nIssues: ${issues.length}\nPincodes: ${pincodeArray.length}`);
    };

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                    Quick Booking Form Settings
                </h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                    Configure products, issues, and serviceable pincodes for the homepage booking form
                </p>
            </div>

            {/* Products Section */}
            <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                    Product Dropdown Options ({products.length})
                </h4>

                {/* Add New Product */}
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                    <input
                        type="text"
                        placeholder="Add new product (e.g., Chimney)"
                        value={newProduct}
                        onChange={(e) => setNewProduct(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddProduct()}
                        style={{
                            flex: 1,
                            padding: 'var(--spacing-sm)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--font-size-sm)'
                        }}
                    />
                    <button
                        onClick={handleAddProduct}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px' }}
                    >
                        <Plus size={16} />
                        Add
                    </button>
                </div>

                {/* Products List */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--spacing-sm)' }}>
                    {products.map((product, index) => (
                        <div
                            key={index}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: 'var(--spacing-sm)',
                                backgroundColor: 'var(--bg-primary)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)'
                            }}
                        >
                            <span>{product}</span>
                            <button
                                onClick={() => handleRemoveProduct(index)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-danger)',
                                    cursor: 'pointer',
                                    padding: '4px'
                                }}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Issues Section */}
            <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                    Issue Dropdown Options ({issues.length})
                </h4>

                {/* Add New Issue */}
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                    <input
                        type="text"
                        placeholder="Add new issue (e.g., Display Not Working)"
                        value={newIssue}
                        onChange={(e) => setNewIssue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddIssue()}
                        style={{
                            flex: 1,
                            padding: 'var(--spacing-sm)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--font-size-sm)'
                        }}
                    />
                    <button
                        onClick={handleAddIssue}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px' }}
                    >
                        <Plus size={16} />
                        Add
                    </button>
                </div>

                {/* Issues List */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--spacing-sm)' }}>
                    {issues.map((issue, index) => (
                        <div
                            key={index}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: 'var(--spacing-sm)',
                                backgroundColor: 'var(--bg-primary)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)'
                            }}
                        >
                            <span>{issue}</span>
                            <button
                                onClick={() => handleRemoveIssue(index)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-danger)',
                                    cursor: 'pointer',
                                    padding: '4px'
                                }}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pincodes Section */}
            <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                    Serviceable Pincodes
                </h4>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                    Enter comma-separated pincodes (e.g., 400001, 400002, 400003)
                </p>

                <textarea
                    value={pincodes}
                    onChange={(e) => setPincodes(e.target.value)}
                    placeholder="400001, 400002, 400003..."
                    rows={4}
                    style={{
                        width: '100%',
                        padding: 'var(--spacing-sm)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--font-size-sm)',
                        fontFamily: 'monospace',
                        resize: 'vertical'
                    }}
                />

                <div style={{ marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                    Total pincodes: {pincodes.split(',').map(p => p.trim()).filter(p => p).length}
                </div>
            </div>

            {/* Validation Messages */}
            <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                    Validation Messages
                </h4>

                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Valid Pincode Message
                        </label>
                        <input
                            type="text"
                            defaultValue="✓ We serve here!"
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-sm)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Invalid Pincode Message
                        </label>
                        <input
                            type="text"
                            defaultValue="✗ Not serviceable"
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-sm)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Help Text (for invalid pincodes)
                        </label>
                        <input
                            type="text"
                            defaultValue="We currently serve Mumbai areas. Call us for other locations."
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-sm)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={handleSave}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', padding: '10px 24px' }}
                >
                    <Save size={18} />
                    Save All Changes
                </button>
            </div>
        </div>
    );
}

export default QuickBookingFormSettings;





