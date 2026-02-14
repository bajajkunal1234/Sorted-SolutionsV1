'use client'

import { useState, useMemo } from 'react';
import { Calendar, Download, Printer, Filter, TrendingUp, TrendingDown } from 'lucide-react';
import { sampleTransactions } from '../../data/reportsData';
import { formatCurrency } from '../../utils/accountingHelpers';

function DaybookView() {
    const [transactions, setTransactions] = useState(sampleTransactions);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterType, setFilterType] = useState('all');
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [editMode, setEditMode] = useState(false);

    // Filter and calculate running balance
    const processedTransactions = useMemo(() => {
        let filtered = transactions.filter(txn => {
            const txnDate = new Date(txn.date).toISOString().split('T')[0];
            const matchesDate = txnDate >= startDate && txnDate <= endDate;
            const matchesType = filterType === 'all' || txn.type === filterType;
            return matchesDate && matchesType;
        });

        // Sort by date
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate running balance
        let balance = 0;
        return filtered.map(txn => {
            balance += (txn.debit - txn.credit);
            return { ...txn, balance };
        });
    }, [transactions, startDate, endDate, filterType]);

    const totals = useMemo(() => {
        return processedTransactions.reduce((acc, txn) => ({
            debit: acc.debit + txn.debit,
            credit: acc.credit + txn.credit
        }), { debit: 0, credit: 0 });
    }, [processedTransactions]);

    const getTypeColor = (type) => {
        const colors = {
            sales: '#10b981',
            purchase: '#ef4444',
            receipt: '#3b82f6',
            payment: '#f59e0b'
        };
        return colors[type] || '#6b7280';
    };

    const getTypeLabel = (type) => {
        const labels = {
            sales: 'Sales',
            purchase: 'Purchase',
            receipt: 'Receipt',
            payment: 'Payment'
        };
        return labels[type] || type;
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Filters Row */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                gap: 'var(--spacing-md)',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                {/* Date Range */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <Calendar size={16} style={{ color: 'var(--text-tertiary)' }} />
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="form-input"
                        style={{ fontSize: 'var(--font-size-sm)', padding: '6px 10px' }}
                    />
                    <span style={{ color: 'var(--text-tertiary)' }}>to</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="form-input"
                        style={{ fontSize: 'var(--font-size-sm)', padding: '6px 10px' }}
                    />
                </div>

                {/* Type Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <Filter size={16} style={{ color: 'var(--text-tertiary)' }} />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="form-input"
                        style={{ fontSize: 'var(--font-size-sm)', padding: '6px 10px' }}
                    >
                        <option value="all">All Types</option>
                        <option value="sales">Sales</option>
                        <option value="purchase">Purchase</option>
                        <option value="receipt">Receipt</option>
                        <option value="payment">Payment</option>
                    </select>
                </div>

                <div style={{ flex: 1 }} />

                {/* Action Buttons */}
                <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                    onClick={() => console.log('Export')}
                >
                    <Download size={16} />
                    Export
                </button>
                <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                    onClick={() => window.print()}
                >
                    <Printer size={16} />
                    Print
                </button>
            </div>

            {/* Summary Cards */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--spacing-md)'
            }}>
                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                        Total Debit
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                        <TrendingUp size={20} style={{ color: 'var(--color-danger)' }} />
                        <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-danger)' }}>
                            {formatCurrency(totals.debit)}
                        </span>
                    </div>
                </div>

                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                        Total Credit
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                        <TrendingDown size={20} style={{ color: 'var(--color-success)' }} />
                        <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-success)' }}>
                            {formatCurrency(totals.credit)}
                        </span>
                    </div>
                </div>

                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                        Net Balance
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                        <span style={{
                            fontSize: 'var(--font-size-xl)',
                            fontWeight: 700,
                            color: (totals.credit - totals.debit) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                        }}>
                            {formatCurrency(totals.credit - totals.debit)}
                        </span>
                    </div>
                </div>

                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                        Transactions
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
                        {processedTransactions.length}
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)' }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 'var(--font-size-sm)'
                }}>
                    <thead>
                        <tr style={{
                            backgroundColor: 'var(--bg-secondary)',
                            borderBottom: '2px solid var(--border-primary)',
                            position: 'sticky',
                            top: 0
                        }}>
                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Date</th>
                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Type</th>
                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Voucher No</th>
                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Account</th>
                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Narration</th>
                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>Debit</th>
                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>Credit</th>
                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedTransactions.map(txn => (
                            <tr
                                key={txn.id}
                                onClick={() => setSelectedTransaction(txn)}
                                style={{
                                    borderBottom: '1px solid var(--border-primary)',
                                    transition: 'background-color var(--transition-fast)',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <td style={{ padding: 'var(--spacing-sm)' }}>
                                    {new Date(txn.date).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)' }}>
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: 'var(--font-size-xs)',
                                        fontWeight: 600,
                                        backgroundColor: `${getTypeColor(txn.type)}20`,
                                        color: getTypeColor(txn.type),
                                        textTransform: 'capitalize'
                                    }}>
                                        {getTypeLabel(txn.type)}
                                    </span>
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)', fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>
                                    {txn.voucherNo}
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)', fontWeight: 500 }}>
                                    {txn.account}
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>
                                    {txn.narration}
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600, color: 'var(--color-danger)' }}>
                                    {txn.debit > 0 ? formatCurrency(txn.debit) : '-'}
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>
                                    {txn.credit > 0 ? formatCurrency(txn.credit) : '-'}
                                </td>
                                <td style={{
                                    padding: 'var(--spacing-sm)',
                                    textAlign: 'right',
                                    fontWeight: 700,
                                    color: txn.balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                                }}>
                                    {formatCurrency(Math.abs(txn.balance))}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{
                            backgroundColor: 'var(--bg-secondary)',
                            borderTop: '2px solid var(--border-primary)',
                            fontWeight: 700
                        }}>
                            <td colSpan="5" style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>
                                TOTAL:
                            </td>
                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', color: 'var(--color-danger)' }}>
                                {formatCurrency(totals.debit)}
                            </td>
                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', color: 'var(--color-success)' }}>
                                {formatCurrency(totals.credit)}
                            </td>
                            <td style={{
                                padding: 'var(--spacing-sm)',
                                textAlign: 'right',
                                color: (totals.credit - totals.debit) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                            }}>
                                {formatCurrency(Math.abs(totals.credit - totals.debit))}
                            </td>
                        </tr>
                    </tfoot>
                </table>

                {processedTransactions.length === 0 && (
                    <div style={{
                        padding: 'var(--spacing-2xl)',
                        textAlign: 'center',
                        color: 'var(--text-tertiary)'
                    }}>
                        No transactions found for the selected date range and filters.
                    </div>
                )}
            </div>

            {/* Transaction Edit Modal */}
            {selectedTransaction && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: 'var(--spacing-md)'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: 'var(--radius-lg)',
                        maxWidth: '600px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <div style={{
                            padding: 'var(--spacing-lg)',
                            borderBottom: '1px solid var(--border-primary)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0 }}>
                                Transaction Details
                            </h3>
                            <span style={{
                                padding: '4px 10px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: 600,
                                backgroundColor: `${getTypeColor(selectedTransaction.type)}20`,
                                color: getTypeColor(selectedTransaction.type),
                                textTransform: 'capitalize'
                            }}>
                                {getTypeLabel(selectedTransaction.type)}
                            </span>
                        </div>

                        <div style={{ padding: 'var(--spacing-lg)' }}>
                            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                        Voucher No
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedTransaction.voucherNo}
                                        readOnly={!editMode}
                                        className="form-input"
                                        style={{ width: '100%', fontFamily: 'monospace' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        value={new Date(selectedTransaction.date).toISOString().split('T')[0]}
                                        readOnly={!editMode}
                                        className="form-input"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                        Account
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedTransaction.account}
                                        readOnly={!editMode}
                                        className="form-input"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                        Narration
                                    </label>
                                    <textarea
                                        value={selectedTransaction.narration}
                                        readOnly={!editMode}
                                        className="form-input"
                                        style={{ width: '100%', minHeight: '60px', resize: 'vertical' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                            Debit
                                        </label>
                                        <input
                                            type="number"
                                            value={selectedTransaction.debit}
                                            readOnly={!editMode}
                                            className="form-input"
                                            style={{ width: '100%', color: 'var(--color-danger)', fontWeight: 600 }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                            Credit
                                        </label>
                                        <input
                                            type="number"
                                            value={selectedTransaction.credit}
                                            readOnly={!editMode}
                                            className="form-input"
                                            style={{ width: '100%', color: 'var(--color-success)', fontWeight: 600 }}
                                        />
                                    </div>
                                </div>

                                {selectedTransaction.reference && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                            Reference
                                        </label>
                                        <input
                                            type="text"
                                            value={selectedTransaction.reference}
                                            readOnly
                                            className="form-input"
                                            style={{ width: '100%', fontFamily: 'monospace', backgroundColor: 'var(--bg-secondary)' }}
                                        />
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-lg)' }}>
                                {!editMode ? (
                                    <>
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => setEditMode(true)}
                                            style={{ flex: 1, padding: 'var(--spacing-sm)' }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => {
                                                setSelectedTransaction(null);
                                                setEditMode(false);
                                            }}
                                            style={{ padding: 'var(--spacing-sm)' }}
                                        >
                                            Close
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => {
                                                // Save logic here
                                                setEditMode(false);
                                                setSelectedTransaction(null);
                                            }}
                                            style={{ flex: 1, padding: 'var(--spacing-sm)' }}
                                        >
                                            Save Changes
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => {
                                                setEditMode(false);
                                                setSelectedTransaction(null);
                                            }}
                                            style={{ padding: 'var(--spacing-sm)' }}
                                        >
                                            Cancel
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DaybookView;





