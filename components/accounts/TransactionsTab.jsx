'use client'

import { useState } from 'react';
import { Receipt, Edit2, Undo2, Filter, TrendingUp, TrendingDown } from 'lucide-react';
import SalesInvoiceForm from './SalesInvoiceForm';
import PurchaseInvoiceForm from './PurchaseInvoiceForm';
import ReceiptVoucherForm from './ReceiptVoucherForm';
import PaymentVoucherForm from './PaymentVoucherForm';
import QuotationForm from './QuotationForm';

function TransactionsTab({ accountId, accountName }) {
    const [transactions, setTransactions] = useState([
        {
            id: 'TXN-001',
            date: '2026-01-18',
            type: 'sales_invoice',
            reference: 'INV-2026-001',
            description: 'AC Repair Service',
            debit: 0,
            credit: 5000,
            balance: 5000,
            status: 'finalized',
            canEdit: true
        },
        {
            id: 'TXN-002',
            date: '2026-01-18',
            type: 'receipt',
            reference: 'REC-2026-001',
            description: 'Payment received via UPI',
            debit: 5000,
            credit: 0,
            balance: 0,
            status: 'finalized',
            canEdit: true
        },
        {
            id: 'TXN-003',
            date: '2026-01-15',
            type: 'rental',
            reference: 'RENTAL-001',
            description: 'Washing Machine Rental - Deposit',
            debit: 0,
            credit: 4000,
            balance: 4000,
            status: 'active',
            canEdit: false
        },
        {
            id: 'TXN-004',
            date: '2026-01-15',
            type: 'rental',
            reference: 'RENTAL-001',
            description: 'Washing Machine Rental - First Month',
            debit: 0,
            credit: 1600,
            balance: 5600,
            status: 'active',
            canEdit: false
        },
        {
            id: 'TXN-005',
            date: '2026-01-10',
            type: 'job',
            reference: 'JOB-2026-001',
            description: 'AC Installation Job',
            debit: 0,
            credit: 0,
            balance: 0,
            status: 'completed',
            canEdit: false,
            isNonFinancial: true
        },
        {
            id: 'TXN-006',
            date: '2026-01-05',
            type: 'quotation',
            reference: 'QUO-2026-001',
            description: 'RO Service Quotation',
            debit: 0,
            credit: 0,
            balance: 0,
            status: 'pending',
            canEdit: true,
            isNonFinancial: true
        }
    ]);

    const [filterType, setFilterType] = useState('all');
    const [showNonFinancial, setShowNonFinancial] = useState(true);
    const [activeForm, setActiveForm] = useState(null); // 'sales_invoice', 'purchase_invoice', 'receipt', 'payment', 'quotation'
    const [editingTransaction, setEditingTransaction] = useState(null);

    const filteredTransactions = transactions.filter(t => {
        const matchesType = filterType === 'all' || t.type === filterType;
        const matchesFinancial = showNonFinancial || !t.isNonFinancial;
        return matchesType && matchesFinancial;
    });

    const getTypeColor = (type) => {
        switch (type) {
            case 'sales_invoice': return '#10b981';
            case 'purchase_invoice': return '#ef4444';
            case 'receipt': return '#3b82f6';
            case 'payment': return '#f59e0b';
            case 'rental': return '#8b5cf6';
            case 'amc': return '#06b6d4';
            case 'job': return '#6366f1';
            case 'quotation': return '#ec4899';
            default: return 'var(--text-secondary)';
        }
    };

    const getTypeLabel = (type) => {
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const handleEdit = (transaction) => {
        setEditingTransaction(transaction);
        setActiveForm(transaction.type);
    };

    const handleUndo = (transaction) => {
        if (window.confirm(`Are you sure you want to undo ${transaction.reference}? This will create a reversal entry.`)) {
            alert('Reversal entry created');
        }
    };

    const runningBalance = filteredTransactions.reduce((acc, t) => {
        if (!t.isNonFinancial) {
            return acc + (t.credit - t.debit);
        }
        return acc;
    }, 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {/* Header with Filters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, margin: 0 }}>
                    Transaction Ledger
                </h3>

                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
                        <input
                            type="checkbox"
                            checked={showNonFinancial}
                            onChange={(e) => setShowNonFinancial(e.target.checked)}
                        />
                        Show Non-Financial
                    </label>

                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        style={{
                            padding: '6px 8px',
                            fontSize: 'var(--font-size-xs)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <option value="all">All Types</option>
                        <option value="sales_invoice">Sales Invoice</option>
                        <option value="purchase_invoice">Purchase Invoice</option>
                        <option value="receipt">Receipt</option>
                        <option value="payment">Payment</option>
                        <option value="rental">Rental</option>
                        <option value="amc">AMC</option>
                        <option value="job">Job</option>
                        <option value="quotation">Quotation</option>
                    </select>
                </div>
            </div>

            {/* Balance Summary */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Current Balance</div>
                    <div style={{
                        fontSize: 'var(--font-size-2xl)',
                        fontWeight: 700,
                        color: runningBalance >= 0 ? '#10b981' : '#ef4444'
                    }}>
                        ₹{Math.abs(runningBalance).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                        {runningBalance >= 0 ? 'To Receive' : 'To Pay'}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Total Transactions</div>
                    <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600 }}>
                        {filteredTransactions.length}
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Date</th>
                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Type</th>
                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Reference</th>
                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Description</th>
                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>Debit</th>
                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>Credit</th>
                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>Balance</th>
                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontWeight: 600 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.map((txn, index) => (
                            <tr
                                key={txn.id}
                                style={{
                                    borderBottom: '1px solid var(--border-primary)',
                                    backgroundColor: txn.isNonFinancial ? 'rgba(236, 72, 153, 0.05)' : 'transparent'
                                }}
                            >
                                <td style={{ padding: 'var(--spacing-sm)' }}>
                                    {new Date(txn.date).toLocaleDateString()}
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)' }}>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: 'var(--font-size-xs)',
                                        fontWeight: 600,
                                        backgroundColor: `${getTypeColor(txn.type)}20`,
                                        color: getTypeColor(txn.type)
                                    }}>
                                        {getTypeLabel(txn.type)}
                                    </span>
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)', fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>
                                    {txn.reference}
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>
                                    {txn.description}
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>
                                    {txn.debit > 0 ? (
                                        <span style={{ color: '#ef4444', fontWeight: 500 }}>
                                            <TrendingDown size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                            ₹{txn.debit.toLocaleString()}
                                        </span>
                                    ) : (
                                        <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                                    )}
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>
                                    {txn.credit > 0 ? (
                                        <span style={{ color: '#10b981', fontWeight: 500 }}>
                                            <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                            ₹{txn.credit.toLocaleString()}
                                        </span>
                                    ) : (
                                        <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                                    )}
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>
                                    {txn.isNonFinancial ? (
                                        <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}>N/A</span>
                                    ) : (
                                        <span style={{ color: txn.balance >= 0 ? '#10b981' : '#ef4444' }}>
                                            ₹{Math.abs(txn.balance).toLocaleString()}
                                        </span>
                                    )}
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', justifyContent: 'center' }}>
                                        {txn.canEdit && (
                                            <button
                                                onClick={() => handleEdit(txn)}
                                                className="btn-icon"
                                                style={{ padding: '4px' }}
                                                title="Edit transaction"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredTransactions.length === 0 && (
                <div style={{
                    padding: 'var(--spacing-xl)',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)',
                    border: '2px dashed var(--border-primary)'
                }}>
                    <Receipt size={48} style={{ margin: '0 auto var(--spacing-md)', opacity: 0.5 }} />
                    <p style={{ fontSize: 'var(--font-size-md)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                        No Transactions Found
                    </p>
                    <p style={{ fontSize: 'var(--font-size-sm)' }}>
                        {filterType !== 'all' ? 'Try adjusting your filters' : 'All transactions will appear here'}
                    </p>
                </div>
            )}

            {/* Transaction Forms */}
            {activeForm === 'sales_invoice' && editingTransaction && (
                <SalesInvoiceForm
                    onClose={() => {
                        setActiveForm(null);
                        setEditingTransaction(null);
                    }}
                    existingInvoice={editingTransaction}
                />
            )}

            {activeForm === 'purchase_invoice' && editingTransaction && (
                <PurchaseInvoiceForm
                    onClose={() => {
                        setActiveForm(null);
                        setEditingTransaction(null);
                    }}
                    existingInvoice={editingTransaction}
                />
            )}

            {activeForm === 'receipt' && editingTransaction && (
                <ReceiptVoucherForm
                    onClose={() => {
                        setActiveForm(null);
                        setEditingTransaction(null);
                    }}
                    existingReceipt={editingTransaction}
                />
            )}

            {activeForm === 'payment' && editingTransaction && (
                <PaymentVoucherForm
                    onClose={() => {
                        setActiveForm(null);
                        setEditingTransaction(null);
                    }}
                    existingPayment={editingTransaction}
                />
            )}

            {activeForm === 'quotation' && editingTransaction && (
                <QuotationForm
                    onClose={() => {
                        setActiveForm(null);
                        setEditingTransaction(null);
                    }}
                    existingQuotation={editingTransaction}
                />
            )}
        </div>
    );
}

export default TransactionsTab;




