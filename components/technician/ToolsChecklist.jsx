'use client'

import { useState } from 'react';
import { Wrench, CheckSquare, Square, Plus } from 'lucide-react';

// Pre-defined checklists based on product type
const productChecklists = {
    'AC': [
        { id: 1, item: 'Multimeter', checked: false },
        { id: 2, item: 'Screwdriver set', checked: false },
        { id: 3, item: 'Gas leak detector', checked: false },
        { id: 4, item: 'Refrigerant gas (R32/R410A)', checked: false },
        { id: 5, item: 'Pressure gauge', checked: false },
        { id: 6, item: 'Vacuum pump', checked: false },
        { id: 7, item: 'Capacitor tester', checked: false }
    ],
    'Washing Machine': [
        { id: 1, item: 'Multimeter', checked: false },
        { id: 2, item: 'Screwdriver set', checked: false },
        { id: 3, item: 'Spanner set', checked: false },
        { id: 4, item: 'Belt replacement', checked: false },
        { id: 5, item: 'Door seal', checked: false },
        { id: 6, item: 'Drain pump', checked: false }
    ],
    'Refrigerator': [
        { id: 1, item: 'Multimeter', checked: false },
        { id: 2, item: 'Screwdriver set', checked: false },
        { id: 3, item: 'Gas leak detector', checked: false },
        { id: 4, item: 'Refrigerant gas', checked: false },
        { id: 5, item: 'Thermostat', checked: false },
        { id: 6, item: 'Compressor relay', checked: false }
    ],
    'default': [
        { id: 1, item: 'Multimeter', checked: false },
        { id: 2, item: 'Screwdriver set', checked: false },
        { id: 3, item: 'Pliers', checked: false },
        { id: 4, item: 'Wire stripper', checked: false }
    ]
};

function ToolsChecklist({ job, onComplete, onCancel }) {
    const productType = job.product.type;
    const initialChecklist = productChecklists[productType] || productChecklists['default'];

    const [checklist, setChecklist] = useState(initialChecklist);
    const [customItem, setCustomItem] = useState('');

    const toggleItem = (id) => {
        setChecklist(checklist.map(item =>
            item.id === id ? { ...item, checked: !item.checked } : item
        ));
    };

    const addCustomItem = () => {
        if (customItem.trim()) {
            const newItem = {
                id: Date.now(),
                item: customItem,
                checked: false
            };
            setChecklist([...checklist, newItem]);
            setCustomItem('');
        }
    };

    const markAllReady = () => {
        setChecklist(checklist.map(item => ({ ...item, checked: true })));
    };

    const checkedCount = checklist.filter(item => item.checked).length;
    const totalCount = checklist.length;
    const allChecked = checkedCount === totalCount;

    return (
        <div style={{
            padding: 'var(--spacing-lg)',
            backgroundColor: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-primary)'
        }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <Wrench size={20} color="#3b82f6" />
                Tools & Equipment Checklist
            </h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                For {job.product.brand} {job.product.model}
            </p>

            {/* Progress */}
            <div style={{
                padding: 'var(--spacing-sm)',
                backgroundColor: allChecked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 'var(--spacing-md)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                    {allChecked ? '✓ All items ready!' : `${checkedCount} of ${totalCount} items ready`}
                </span>
                <button
                    onClick={markAllReady}
                    className="btn btn-secondary"
                    style={{ padding: '4px 12px', fontSize: 'var(--font-size-xs)' }}
                    disabled={allChecked}
                >
                    Mark All Ready
                </button>
            </div>

            {/* Checklist */}
            <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                marginBottom: 'var(--spacing-md)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-sm)'
            }}>
                {checklist.map(item => (
                    <div
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        style={{
                            padding: 'var(--spacing-sm)',
                            marginBottom: 'var(--spacing-xs)',
                            backgroundColor: item.checked ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-sm)',
                            transition: 'all var(--transition-fast)',
                            border: item.checked ? '1px solid #10b981' : '1px solid transparent'
                        }}
                    >
                        {item.checked ? (
                            <CheckSquare size={18} color="#10b981" />
                        ) : (
                            <Square size={18} color="var(--text-secondary)" />
                        )}
                        <span style={{
                            fontSize: 'var(--font-size-sm)',
                            color: item.checked ? '#10b981' : 'var(--text-primary)',
                            textDecoration: item.checked ? 'line-through' : 'none',
                            fontWeight: item.checked ? 600 : 400
                        }}>
                            {item.item}
                        </span>
                    </div>
                ))}
            </div>

            {/* Add Custom Item */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                    Add Custom Tool/Part
                </label>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <input
                        type="text"
                        value={customItem}
                        onChange={(e) => setCustomItem(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCustomItem()}
                        placeholder="Enter tool or part name..."
                        className="form-input"
                        style={{ flex: 1 }}
                    />
                    <button
                        onClick={addCustomItem}
                        className="btn btn-secondary"
                        style={{ padding: '8px 12px' }}
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <button
                    onClick={onCancel}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '10px' }}
                >
                    Cancel
                </button>
                <button
                    onClick={() => onComplete(checklist)}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '10px', backgroundColor: allChecked ? '#10b981' : '#3b82f6' }}
                >
                    {allChecked ? '✓ All Ready - Continue' : 'Continue Anyway'}
                </button>
            </div>
        </div>
    );
}

export default ToolsChecklist;

