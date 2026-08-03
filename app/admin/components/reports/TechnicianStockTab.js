import React, { useState, useEffect } from 'react';
import RepairCalculator from '@/components/common/RepairCalculator';

export default function TechnicianStockTab({ technicians = [] }) {
    const [selectedTech, setSelectedTech] = useState(null);
    const [stock, setStock] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Handover Modal State
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeSubTab, setActiveSubTab] = useState('inventory'); // 'inventory' or 'ledger'

    // Initial default technician selection
    useEffect(() => {
        if (technicians.length > 0 && !selectedTech) {
            setSelectedTech(technicians[0]);
        }
    }, [technicians]);

    // Fetch stock and transactions when technician changes
    useEffect(() => {
        if (selectedTech) {
            fetchStockData(selectedTech.id);
        }
    }, [selectedTech]);

    const fetchStockData = async (techId) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/technician-stock?technicianId=${techId}`);
            const json = await res.json();
            if (json.success) {
                setStock(json.stock || []);
                setTransactions(json.transactions || []);
            }
        } catch (err) {
            console.error('Failed to fetch stock:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCalculatorHandover = async (basketItems) => {
        if (!basketItems || basketItems.length === 0) {
            alert('Please select at least one spare part for handover.');
            return;
        }

        setSaving(true);
        try {
            const handoverItems = basketItems.map(b => ({
                product_id: b.productId,
                quantity: Number(b.qty),
                notes: 'Service Center Handover'
            }));

            const response = await fetch('/api/admin/technician-stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    technician_id: selectedTech.id,
                    items: handoverItems,
                    created_by: 'Admin'
                })
            });
            const json = await response.json();
            if (json.success) {
                setShowModal(false);
                fetchStockData(selectedTech.id);
            } else {
                alert('Error saving handover: ' + json.error);
            }
        } catch (err) {
            console.error('Handover save failed:', err);
            alert('Failed to save handover.');
        } finally {
            setSaving(false);
        }
    };

    const getBadgeStyle = (type) => {
        switch (type) {
            case 'handover':
                return { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' };
            case 'sale':
                return { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' };
            case 'return':
                return { backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' };
            default:
                return { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
            {/* Control Row */}
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                backgroundColor: 'var(--bg-elevated)', 
                border: '1px solid var(--border-primary)', 
                borderRadius: 'var(--radius-lg)', 
                padding: '12px 16px',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Technician:</span>
                    <select
                        value={selectedTech?.id || ''}
                        onChange={(e) => {
                            const tech = technicians.find(t => String(t.id) === String(e.target.value));
                            if (tech) setSelectedTech(tech);
                        }}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-primary)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    >
                        {technicians.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.phone})</option>
                        ))}
                    </select>
                </div>

                <button
                    className="btn btn-primary"
                    onClick={() => setShowModal(true)}
                    disabled={!selectedTech}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '13px',
                        backgroundColor: 'var(--color-primary)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        marginLeft: 'auto'
                    }}
                >
                    📦 Handover Spare Parts
                </button>
            </div>

            {/* Subtabs Bar */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-primary)', paddingBottom: 0, marginBottom: '10px' }}>
                <button
                    onClick={() => setActiveSubTab('inventory')}
                    style={{
                        padding: '8px 16px',
                        border: 'none',
                        cursor: 'pointer',
                        borderBottom: activeSubTab === 'inventory' ? '2px solid var(--color-primary)' : '2px solid transparent',
                        backgroundColor: 'transparent',
                        color: activeSubTab === 'inventory' ? 'var(--color-primary)' : 'var(--text-secondary)',
                        fontWeight: activeSubTab === 'inventory' ? 600 : 400,
                        fontSize: '13px',
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap'
                    }}
                >
                    Currently Held Spare Parts
                </button>
                <button
                    onClick={() => setActiveSubTab('ledger')}
                    style={{
                        padding: '8px 16px',
                        border: 'none',
                        cursor: 'pointer',
                        borderBottom: activeSubTab === 'ledger' ? '2px solid var(--color-primary)' : '2px solid transparent',
                        backgroundColor: 'transparent',
                        color: activeSubTab === 'ledger' ? 'var(--color-primary)' : 'var(--text-secondary)',
                        fontWeight: activeSubTab === 'ledger' ? 600 : 400,
                        fontSize: '13px',
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap'
                    }}
                >
                    Transaction Audit Ledger
                </button>
            </div>

            {/* Selected Technician details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                {selectedTech ? (
                    <>
                        {/* Stock Inventory Section */}
                        {activeSubTab === 'inventory' && (
                        <div style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', fontWeight: 600, fontSize: '13px' }}>
                                Currently Held Spare Parts
                            </div>
                            {loading ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading stock levels...</div>
                            ) : stock.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                    No physical stock listed. Click "Handover Spare Parts" to allocate inventory.
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
                                                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Part Name</th>
                                                <th style={{ padding: '12px 16px', fontWeight: 600 }}>SKU</th>
                                                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Category</th>
                                                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Stock Level</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stock.map(item => (
                                                <React.Fragment key={item.id}>
                                                    <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>{item.name}</td>
                                                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{item.sku || 'N/A'}</td>
                                                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{item.category}</td>
                                                        <td style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right', color: item.quantity <= 0 ? '#ef4444' : 'var(--text-primary)' }}>
                                                            {item.quantity} Units
                                                        </td>
                                                    </tr>
                                                    {/* Show detail rows if any */}
                                                    {((item.quantity < 0 && item.negative_details && item.negative_details.length > 0) || 
                                                      (item.quantity > 0 && item.positive_details && item.positive_details.length > 0)) && (
                                                        <tr>
                                                            <td colSpan="4" style={{ padding: '4px 16px 12px 16px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
                                                                {item.quantity < 0 ? (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', borderLeft: '3px solid #ef4444', backgroundColor: 'rgba(239, 68, 68, 0.03)', borderRadius: '4px', textAlign: 'left' }}>
                                                                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Billed On Jobs (Negative Stock Trace):</div>
                                                                        {item.negative_details.map((neg, idx) => (
                                                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
                                                                                <span style={{ color: 'var(--text-secondary)' }}>
                                                                                    📍 {neg.location}
                                                                                </span>
                                                                                <span>
                                                                                    {neg.job_id ? (
                                                                                        <button 
                                                                                            onClick={() => window.openJobInJobsTab && window.openJobInJobsTab({ id: neg.job_id })}
                                                                                            style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 600, cursor: 'pointer', padding: '0 4px', textDecoration: 'underline' }}
                                                                                        >
                                                                                            Job {neg.job_number}
                                                                                        </button>
                                                                                    ) : `Job ${neg.job_number}`}
                                                                                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: '10px' }}>({new Date(neg.date).toLocaleDateString('en-GB')})</span>
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', borderLeft: '3px solid #10b981', backgroundColor: 'rgba(16, 185, 129, 0.03)', borderRadius: '4px', textAlign: 'left' }}>
                                                                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Service Center Handover Log:</div>
                                                                        {item.positive_details.map((pos, idx) => (
                                                                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                                                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                                    <span style={{ color: 'var(--text-secondary)' }}>
                                                                                        Handover Batch: <span style={{ fontFamily: 'monospace' }}>{pos.handover_id.slice(0, 8)}...</span>
                                                                                    </span>
                                                                                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                                                                        Qty: {pos.quantity}
                                                                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: '10px' }}>({new Date(pos.date).toLocaleString('en-GB')})</span>
                                                                                    </span>
                                                                                </div>
                                                                                {pos.other_items && pos.other_items.length > 0 && (
                                                                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic', marginTop: '2px' }}>
                                                                                        📦 Other items in batch: {pos.other_items.join(', ')}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        )}

                        {/* Audit Log / History Section */}
                        {activeSubTab === 'ledger' && (
                        <div style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', fontWeight: 600, fontSize: '13px' }}>
                                Transaction Audit Ledger
                            </div>
                            {loading ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading ledger...</div>
                            ) : transactions.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                    No stock transaction ledger available.
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
                                                <th style={{ padding: '10px 16px', fontWeight: 600 }}>Date & Time</th>
                                                <th style={{ padding: '10px 16px', fontWeight: 600 }}>Part Name</th>
                                                <th style={{ padding: '10px 16px', fontWeight: 600 }}>Type</th>
                                                <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>Qty</th>
                                                <th style={{ padding: '10px 16px', fontWeight: 600 }}>Notes / Reference</th>
                                                <th style={{ padding: '10px 16px', fontWeight: 600 }}>By</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map(tx => (
                                                <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>
                                                        {new Date(tx.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                                                    </td>
                                                    <td style={{ padding: '10px 16px', fontWeight: 500 }}>{tx.product_name}</td>
                                                    <td style={{ padding: '10px 16px' }}>
                                                        <span style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '10px',
                                                            fontWeight: 600,
                                                            textTransform: 'uppercase',
                                                            ...getBadgeStyle(tx.transaction_type)
                                                        }}>
                                                            {tx.transaction_type}
                                                        </span>
                                                    </td>
                                                    <td style={{
                                                        padding: '10px 16px',
                                                        fontWeight: 700,
                                                        textAlign: 'right',
                                                        color: tx.quantity > 0 ? '#10b981' : '#ef4444'
                                                    }}>
                                                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                                                    </td>
                                                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', maxWidth: '250px' }}>
                                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {tx.notes || '-'}
                                                        </div>
                                                        {tx.job_id && (
                                                            <button 
                                                                onClick={() => window.openJobInJobsTab && window.openJobInJobsTab({ id: tx.job_id })}
                                                                style={{ display: 'block', background: 'none', border: 'none', color: '#3b82f6', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0, textDecoration: 'underline', marginTop: '4px', textAlign: 'left' }}
                                                            >
                                                                View Job {tx.job_number} ({tx.job_location})
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{tx.created_by}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        )}
                    </>
                ) : (
                    <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '300px', border: '1px dashed var(--border-primary)', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        Select a technician to manage physical stock levels.
                    </div>
                )}
            </div>

            {/* Handover Dialog Overlay */}
            {showModal && (
                <RepairCalculator
                    job={{ name: selectedTech.name }}
                    onClose={() => setShowModal(false)}
                    onlyParts={true}
                    onHandover={handleCalculatorHandover}
                    loading={saving}
                />
            )}
        </div>
    );
}
