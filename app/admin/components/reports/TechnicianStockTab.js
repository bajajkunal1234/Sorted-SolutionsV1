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
    const [expandedItems, setExpandedItems] = useState({}); // item.id -> boolean

    // Ledger Columns and Settings State
    const [ledgerColumns, setLedgerColumns] = useState([
        { id: 'date', label: 'Date & Time', width: 160, visible: true },
        { id: 'part_name', label: 'Part Name', width: 200, visible: true },
        { id: 'type', label: 'Type', width: 90, visible: true },
        { id: 'qty', label: 'Qty', width: 70, visible: true },
        { id: 'invoice_number', label: 'Invoice No', width: 140, visible: true },
        { id: 'job', label: 'Job', width: 160, visible: true },
        { id: 'to', label: 'To', width: 150, visible: true },
        { id: 'by', label: 'By', width: 120, visible: true },
        { id: 'notes', label: 'Notes / Reference', width: 220, visible: true }
    ]);
    const [ledgerSort, setLedgerSort] = useState({ column: 'date', direction: 'desc' });
    const [showColSettings, setShowColSettings] = useState(false);

    // Ledger Filters State
    const [filterType, setFilterType] = useState('all'); // 'all', 'sale', 'handover', 'return'
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Load ledger columns configuration from localStorage after mount
    useEffect(() => {
        const saved = localStorage.getItem('ledger_columns_config');
        if (saved) {
            try {
                setLedgerColumns(JSON.parse(saved));
            } catch (e) {}
        }
    }, []);

    // Save ledger columns configuration when changed
    useEffect(() => {
        if (ledgerColumns && ledgerColumns.length > 0) {
            localStorage.setItem('ledger_columns_config', JSON.stringify(ledgerColumns));
        }
    }, [ledgerColumns]);

    const handleColumnResizeMouseDown = (colId, e) => {
        e.preventDefault();
        const startX = e.clientX;
        const currentCol = ledgerColumns.find(c => c.id === colId);
        if (!currentCol) return;
        const startWidth = currentCol.width || 120;

        const handleMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            setLedgerColumns(prev => prev.map(c => 
                c.id === colId ? { ...c, width: Math.max(60, startWidth + deltaX) } : c
            ));
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleSortLedger = (colId) => {
        setLedgerSort(prev => {
            if (prev.column === colId) {
                return { column: colId, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { column: colId, direction: 'asc' };
        });
    };

    const moveLedgerColumn = (index, direction) => {
        const newCols = [...ledgerColumns];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= newCols.length) return;
        const temp = newCols[index];
        newCols[index] = newCols[targetIndex];
        newCols[targetIndex] = temp;
        setLedgerColumns(newCols);
    };

    const toggleLedgerColumnVisibility = (colId) => {
        setLedgerColumns(prev => prev.map(c => 
            c.id === colId ? { ...c, visible: !c.visible } : c
        ));
    };

    // Filter active (non-fired, active status) technicians
    const activeTechs = technicians.filter(t => t.is_active !== false && !t.is_fired);

    // Initial default technician selection
    useEffect(() => {
        if (activeTechs.length > 0) {
            const isCurrentlyActiveSelected = selectedTech && activeTechs.some(t => String(t.id) === String(selectedTech.id));
            if (!isCurrentlyActiveSelected) {
                setSelectedTech(activeTechs[0]);
            }
        } else {
            setSelectedTech(null);
        }
    }, [activeTechs, selectedTech]);

    // Fetch stock and transactions when technician changes
    useEffect(() => {
        if (selectedTech) {
            fetchStockData(selectedTech.id);
        } else {
            setStock([]);
            setTransactions([]);
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

    // Filter transactions on client side for responsive instant results
    const filteredTxList = (transactions || []).filter(tx => {
        if (filterType !== 'all' && tx.transaction_type?.toLowerCase() !== filterType.toLowerCase()) {
            return false;
        }
        if (searchTerm && !tx.product_name?.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }
        if (startDate && new Date(tx.created_at) < new Date(startDate)) {
            return false;
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (new Date(tx.created_at) > end) {
                return false;
            }
        }
        return true;
    });

    // Sort transactions
    const sortedTxList = [...filteredTxList].sort((a, b) => {
        const col = ledgerSort.column;
        const dir = ledgerSort.direction === 'asc' ? 1 : -1;
        
        let valA, valB;
        if (col === 'date') {
            valA = new Date(a.created_at).getTime();
            valB = new Date(b.created_at).getTime();
        } else if (col === 'part_name') {
            valA = a.product_name || '';
            valB = b.product_name || '';
        } else if (col === 'type') {
            valA = a.transaction_type || '';
            valB = b.transaction_type || '';
        } else if (col === 'qty') {
            valA = a.quantity || 0;
            valB = b.quantity || 0;
        } else if (col === 'invoice_number') {
            valA = a.invoice_number || '';
            valB = b.invoice_number || '';
        } else if (col === 'job') {
            valA = a.job_number || '';
            valB = b.job_number || '';
        } else if (col === 'to') {
            valA = a.to_party || '';
            valB = b.to_party || '';
        } else if (col === 'by') {
            valA = a.created_by || '';
            valB = b.created_by || '';
        } else if (col === 'notes') {
            valA = a.notes || '';
            valB = b.notes || '';
        } else {
            return 0;
        }

        if (typeof valA === 'string') {
            return valA.localeCompare(valB) * dir;
        }
        return (valA < valB ? -1 : valA > valB ? 1 : 0) * dir;
    });

    const totalTableWidth = ledgerColumns.filter(c => c.visible).reduce((sum, c) => sum + (c.width || 120), 0);

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
                            const tech = activeTechs.find(t => String(t.id) === String(e.target.value));
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
                        {activeTechs.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
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
                                                    <tr 
                                                        onClick={() => {
                                                            setExpandedItems(prev => ({
                                                                ...prev,
                                                                [item.id]: !prev[item.id]
                                                            }));
                                                        }}
                                                        style={{ 
                                                            borderBottom: '1px solid var(--border-primary)', 
                                                            cursor: 'pointer',
                                                            backgroundColor: expandedItems[item.id] ? 'rgba(99, 102, 241, 0.04)' : 'transparent',
                                                            transition: 'background-color 0.15s'
                                                        }}
                                                    >
                                                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span style={{ 
                                                                    fontSize: '10px', 
                                                                    color: 'var(--text-secondary)', 
                                                                    display: 'inline-block',
                                                                    transition: 'transform 0.2s', 
                                                                    transform: expandedItems[item.id] ? 'rotate(90deg)' : 'none' 
                                                                }}>
                                                                    ▶
                                                                </span>
                                                                <span>{item.name}</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{item.sku || 'N/A'}</td>
                                                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{item.category}</td>
                                                        <td style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right', color: item.quantity <= 0 ? '#ef4444' : 'var(--text-primary)' }}>
                                                            {item.quantity} Units
                                                        </td>
                                                    </tr>
                                                    {/* Show detail rows if any and expanded */}
                                                    {expandedItems[item.id] && ((item.quantity < 0 && item.negative_details && item.negative_details.length > 0) || 
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
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', fontWeight: 600, fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <span>Transaction Audit Ledger</span>
                            </div>

                            {/* Toolbar: Search, Filters & Manage Columns */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', position: 'relative' }}>
                                <input 
                                    type="text" 
                                    placeholder="🔍 Search Part Name..." 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)} 
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-primary)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13px',
                                        outline: 'none',
                                        width: '200px'
                                    }}
                                />

                                <select
                                    value={filterType}
                                    onChange={e => setFilterType(e.target.value)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-primary)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="all">All Types</option>
                                    <option value="sale">Sale</option>
                                    <option value="handover">Handover</option>
                                    <option value="return">Return</option>
                                </select>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>From:</span>
                                    <input 
                                        type="date" 
                                        value={startDate} 
                                        onChange={e => setStartDate(e.target.value)} 
                                        style={{
                                            padding: '5px 8px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-primary)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            fontSize: '12px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>To:</span>
                                    <input 
                                        type="date" 
                                        value={endDate} 
                                        onChange={e => setEndDate(e.target.value)} 
                                        style={{
                                            padding: '5px 8px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-primary)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            fontSize: '12px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setFilterType('all');
                                        setStartDate('');
                                        setEndDate('');
                                    }}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        backgroundColor: 'rgba(239, 68, 68, 0.05)',
                                        color: '#ef4444',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        fontWeight: 600
                                    }}
                                >
                                    Clear Filters
                                </button>

                                {/* Manage Columns Popover Toggle */}
                                <div style={{ position: 'relative', marginLeft: 'auto' }}>
                                    <button 
                                        onClick={() => setShowColSettings(!showColSettings)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-primary)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        ⚙️ columns
                                    </button>
                                    {showColSettings && (
                                        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 6, width: 260, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 10, padding: 12, zIndex: 999, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}>
                                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span>Manage Columns</span>
                                                <button onClick={() => setLedgerColumns([
                                                    { id: 'date', label: 'Date & Time', width: 160, visible: true },
                                                    { id: 'part_name', label: 'Part Name', width: 200, visible: true },
                                                    { id: 'type', label: 'Type', width: 90, visible: true },
                                                    { id: 'qty', label: 'Qty', width: 70, visible: true },
                                                    { id: 'invoice_number', label: 'Invoice No', width: 140, visible: true },
                                                    { id: 'job', label: 'Job', width: 160, visible: true },
                                                    { id: 'to', label: 'To', width: 150, visible: true },
                                                    { id: 'by', label: 'By', width: 120, visible: true },
                                                    { id: 'notes', label: 'Notes / Reference', width: 220, visible: true }
                                                ])} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 11, cursor: 'pointer', padding: 0 }}>Reset</button>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                                                {ledgerColumns.map((col, idx) => (
                                                    <div key={col.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, padding: '4px 0' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', flex: 1 }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={col.visible} 
                                                                onChange={() => toggleLedgerColumnVisibility(col.id)} 
                                                                style={{ cursor: 'pointer' }}
                                                            />
                                                            <span style={{ opacity: col.visible ? 1 : 0.5 }}>{col.label}</span>
                                                        </label>
                                                        <div style={{ display: 'flex', gap: 2 }}>
                                                            <button onClick={() => moveLedgerColumn(idx, -1)} disabled={idx === 0} style={{ padding: '2px 4px', fontSize: 10, cursor: idx === 0 ? 'not-allowed' : 'pointer', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 4, opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                                                            <button onClick={() => moveLedgerColumn(idx, 1)} disabled={idx === ledgerColumns.length - 1} style={{ padding: '2px 4px', fontSize: 10, cursor: idx === ledgerColumns.length - 1 ? 'not-allowed' : 'pointer', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 4, opacity: idx === ledgerColumns.length - 1 ? 0.3 : 1 }}>▼</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ marginTop: 8, padding: '4px 0', borderTop: '1px solid var(--border-primary)', textAlign: 'center' }}>
                                                <button onClick={() => setShowColSettings(false)} className="btn btn-secondary" style={{ width: '100%', padding: '4px 8px', fontSize: 11 }}>Done</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {loading ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading ledger...</div>
                            ) : sortedTxList.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                    No stock transaction ledger available matching your criteria.
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto', width: '100%' }}>
                                    <table className="admin-table" style={{ tableLayout: 'fixed', width: `${totalTableWidth}px`, borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
                                                {ledgerColumns.filter(c => c.visible).map((col) => {
                                                    return (
                                                        <th 
                                                            key={col.id} 
                                                            style={{ 
                                                                width: `${col.width}px`, 
                                                                minWidth: `${col.width}px`, 
                                                                position: 'relative',
                                                                cursor: 'pointer',
                                                                userSelect: 'none',
                                                                textAlign: col.id === 'qty' ? 'right' : 'left',
                                                                padding: '10px 16px'
                                                            }}
                                                            onClick={() => handleSortLedger(col.id)}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: col.id === 'qty' ? 'flex-end' : 'flex-start', gap: 4 }}>
                                                                <span>{col.label}</span>
                                                                {ledgerSort.column === col.id && (
                                                                    <span style={{ fontSize: 10, color: 'var(--color-primary)' }}>{ledgerSort.direction === 'asc' ? '▲' : '▼'}</span>
                                                                )}
                                                            </div>
                                                            <span 
                                                                style={{
                                                                    position: 'absolute',
                                                                    right: 0,
                                                                    top: 0,
                                                                    bottom: 0,
                                                                    width: '5px',
                                                                    cursor: 'col-resize',
                                                                    zIndex: 10
                                                                }}
                                                                onMouseDown={(e) => handleColumnResizeMouseDown(col.id, e)}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedTxList.map(tx => (
                                                <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-primary)', transition: 'background-color 0.15s' }}>
                                                    {ledgerColumns.filter(c => c.visible).map((col) => {
                                                        switch (col.id) {
                                                            case 'date':
                                                                return (
                                                                    <td key={col.id} style={{ width: `${col.width}px`, minWidth: `${col.width}px`, padding: '10px 16px', color: 'var(--text-secondary)' }}>
                                                                        {new Date(tx.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                                                                    </td>
                                                                );
                                                            case 'part_name':
                                                                return (
                                                                    <td key={col.id} style={{ width: `${col.width}px`, minWidth: `${col.width}px`, padding: '10px 16px', fontWeight: 500 }}>
                                                                        {tx.product_name}
                                                                    </td>
                                                                );
                                                            case 'type':
                                                                return (
                                                                    <td key={col.id} style={{ width: `${col.width}px`, minWidth: `${col.width}px`, padding: '10px 16px' }}>
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
                                                                );
                                                            case 'qty':
                                                                return (
                                                                    <td key={col.id} style={{
                                                                        width: `${col.width}px`,
                                                                        minWidth: `${col.width}px`,
                                                                        padding: '10px 16px',
                                                                        fontWeight: 700,
                                                                        textAlign: 'right',
                                                                        color: tx.quantity > 0 ? '#10b981' : '#ef4444'
                                                                    }}>
                                                                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                                                                    </td>
                                                                );
                                                            case 'invoice_number':
                                                                return (
                                                                    <td key={col.id} style={{ width: `${col.width}px`, minWidth: `${col.width}px`, padding: '10px 16px' }}>
                                                                        {tx.invoice_number ? (
                                                                            <button 
                                                                                onClick={() => window.open(`/print?type=sales&id=${tx.invoice_id}`, '_blank')}
                                                                                style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 600, cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: '12px' }}
                                                                            >
                                                                                {tx.invoice_number}
                                                                            </button>
                                                                        ) : '—'}
                                                                    </td>
                                                                );
                                                            case 'job':
                                                                return (
                                                                    <td key={col.id} style={{ width: `${col.width}px`, minWidth: `${col.width}px`, padding: '10px 16px' }}>
                                                                        {tx.job_id ? (
                                                                            <button 
                                                                                onClick={() => window.openJobInJobsTab && window.openJobInJobsTab({ id: tx.job_id })}
                                                                                style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 600, cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: '12px', textAlign: 'left' }}
                                                                            >
                                                                                Job {tx.job_number}
                                                                            </button>
                                                                        ) : '—'}
                                                                    </td>
                                                                );
                                                            case 'to':
                                                                return (
                                                                    <td key={col.id} style={{ width: `${col.width}px`, minWidth: `${col.width}px`, padding: '10px 16px', color: 'var(--text-secondary)' }}>
                                                                        {tx.to_party}
                                                                    </td>
                                                                );
                                                            case 'by':
                                                                return (
                                                                    <td key={col.id} style={{ width: `${col.width}px`, minWidth: `${col.width}px`, padding: '10px 16px', color: 'var(--text-secondary)' }}>
                                                                        {tx.created_by}
                                                                    </td>
                                                                );
                                                            case 'notes':
                                                                return (
                                                                    <td key={col.id} style={{ width: `${col.width}px`, minWidth: `${col.width}px`, padding: '10px 16px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.notes}>
                                                                        {tx.notes || '—'}
                                                                    </td>
                                                                );
                                                            default:
                                                                return null;
                                                        }
                                                    })}
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
