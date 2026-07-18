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
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', width: '100%' }}>
            {/* Left Column: Technicians list */}
            <div style={{ flex: '0 0 280px', minWidth: '280px', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', fontWeight: 600, fontSize: '13px' }}>
                    Technicians List
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '600px', overflowY: 'auto' }}>
                    {technicians.map(t => (
                        <div
                            key={t.id}
                            onClick={() => setSelectedTech(t)}
                            style={{
                                padding: '12px 16px',
                                cursor: 'pointer',
                                borderBottom: '1px solid var(--border-primary)',
                                backgroundColor: selectedTech?.id === t.id ? 'var(--bg-secondary)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                transition: 'all 0.15s'
                            }}
                        >
                            <img
                                src={t.photo_url || '/placeholder.jpg'}
                                alt=""
                                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-primary)' }}
                                onError={(e) => { e.target.src = 'https://via.placeholder.com/150' }}
                            />
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t.phone}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Column: Selected Technician details */}
            <div style={{ flex: 1, minWidth: '350px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {selectedTech ? (
                    <>
                        {/* Header Details Card */}
                        <div style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                            <div>
                                <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {selectedTech.name}'s Physical Inventory
                                </h3>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    Manage physical stocks and perform part allocations from the Service Center.
                                </p>
                            </div>
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowModal(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '10px 16px',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    backgroundColor: 'var(--color-primary)',
                                    color: '#fff',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                📦 Handover Spare Parts
                            </button>
                        </div>

                        {/* Stock Inventory Section */}
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
                                                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{item.name}</td>
                                                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{item.sku || 'N/A'}</td>
                                                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{item.category}</td>
                                                    <td style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right', color: item.quantity <= 1 ? '#ef4444' : 'var(--text-primary)' }}>
                                                        {item.quantity} Units
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Audit Log / History Section */}
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
                                                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {tx.notes || '-'}
                                                    </td>
                                                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{tx.created_by}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '300px', border: '1px dashed var(--border-primary)', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        Select a technician from the list to manage physical stock levels.
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
