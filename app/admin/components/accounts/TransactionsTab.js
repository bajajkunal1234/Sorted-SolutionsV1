'use client'

import { useState, useEffect } from 'react';
import { Receipt, Edit2, Undo2, Filter, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import SalesInvoiceForm from './SalesInvoiceForm';
import PurchaseInvoiceForm from './PurchaseInvoiceForm';
import ReceiptVoucherForm from './ReceiptVoucherForm';
import PaymentVoucherForm from './PaymentVoucherForm';
import QuotationForm from './QuotationForm';

function TransactionsTab({ accountId, accountName }) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [filterType, setFilterType] = useState('all');
    const [showNonFinancial, setShowNonFinancial] = useState(true);
    const [activeForm, setActiveForm] = useState(null);
    const [editingTransaction, setEditingTransaction] = useState(null);

    useEffect(() => {
        if (accountId) {
            fetchTransactions();
        }
    }, [accountId]);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const { supabase } = await import('@/lib/supabase');
            if (!supabase) return;

            let allTransactions = [];

            // 1. Fetch Financial Transactions from Journal Entry Lines
            const { data: journalLines, error: jeError } = await supabase
                .from('journal_entry_lines')
                .select(`
                    id, debit, credit,
                    journal_entries!inner(id, entry_number, date, reference_type, reference_id, notes)
                `)
                .eq('account_id', accountId);

            if (!jeError && journalLines) {
                const financialTxns = journalLines.map(line => ({
                    id: line.id,
                    originalId: line.journal_entries.reference_id,
                    date: line.journal_entries.date,
                    type: line.journal_entries.reference_type === 'sales_invoice' ? 'sales_invoice' 
                          : line.journal_entries.reference_type === 'purchase_invoice' ? 'purchase_invoice'
                          : line.journal_entries.reference_type,
                    reference: line.journal_entries.entry_number || '-',
                    description: line.journal_entries.notes || '-',
                    debit: Number(line.debit) || 0,
                    credit: Number(line.credit) || 0,
                    balance: 0,
                    status: 'finalized',
                    canEdit: !!line.journal_entries.reference_id, // can only edit if it came from a source doc
                    isNonFinancial: false,
                    rawData: null // Will be fetched lazily on Edit
                }));
                allTransactions = [...allTransactions, ...financialTxns];
            }

            // 2. Fetch Non-Financial Quotations
            const { data: quotes, error: qError } = await supabase
                .from('quotations')
                .select('*')
                .eq('account_id', accountId);
                
            if (!qError && quotes) {
                const quoteTxns = quotes.map(item => ({
                    id: item.id,
                    originalId: item.id,
                    date: item.date,
                    type: 'quotation',
                    reference: item.quote_number || item.reference || '-',
                    description: item.notes || item.reference || '-',
                    debit: 0,
                    credit: 0,
                    balance: 0,
                    status: item.status || 'finalized',
                    canEdit: true,
                    isNonFinancial: true,
                    rawData: item
                }));
                allTransactions = [...allTransactions, ...quoteTxns];
            }

            // Sort ascending for running balance computation
            allTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

            // Compute running balance (credit = +, debit = -)
            let runningBalance = 0;
            allTransactions.forEach(txn => {
                runningBalance += (txn.credit || 0) - (txn.debit || 0);
                txn.balance = runningBalance;
            });

            // Reverse to show newest first in UI
            allTransactions.reverse();

            setTransactions(allTransactions);

        } catch (err) {
            console.error('Error fetching transactions:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

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

    const handleEdit = async (transaction) => {
        if (transaction.type === 'quotation' && transaction.rawData) {
            setEditingTransaction(transaction.rawData);
            setActiveForm(transaction.type);
            return;
        }

        if (!transaction.originalId) {
            alert('This transaction was created manually and cannot be edited via forms yet.');
            return;
        }

        // Lazy fetch the original transaction to edit it
        try {
            const { supabase } = await import('@/lib/supabase');
            const tableMap = {
                'sales_invoice': 'sales_invoices',
                'purchase_invoice': 'purchase_invoices',
                'receipt': 'receipt_vouchers',
                'payment': 'payment_vouchers'
            };
            const tableName = tableMap[transaction.type];
            if (!tableName) return;

            const { data, error } = await supabase.from(tableName).select('*').eq('id', transaction.originalId).single();
            if (error) throw error;
            if (data) {
                setEditingTransaction(data);
                setActiveForm(transaction.type);
            }
        } catch (e) {
            console.error('Error fetching source data for edit', e);
            alert('Failed to load transaction data.');
        }
    };

    const handleUndo = (transaction) => {
        alert('Undo functionality not yet implemented for live database.');
    };

    const totalDebits = filteredTransactions.reduce((acc, t) => acc + (t.debit || 0), 0);
    const totalCredits = filteredTransactions.reduce((acc, t) => acc + (t.credit || 0), 0);
    const netBalance = totalCredits - totalDebits;

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
                        <option value="quotation">Quotation</option>
                    </select>

                    <button
                        onClick={fetchTransactions}
                        className="btn-icon"
                        title="Refresh"
                        style={{ backgroundColor: 'var(--bg-elevated)' }}
                    >
                        <Filter size={16} />
                    </button>
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
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Net Balance (Display Period)</div>
                    <div style={{
                        fontSize: 'var(--font-size-2xl)',
                        fontWeight: 700,
                        color: netBalance >= 0 ? '#10b981' : '#ef4444'
                    }}>
                        ₹{Math.abs(netBalance).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                        {netBalance >= 0 ? 'Credit (Receivable/Income)' : 'Debit (Payable/Expense)'}
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
            <div style={{ overflowX: 'auto', minHeight: '200px' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-xl)' }}>
                        <Loader2 className="animate-spin" size={24} />
                    </div>
                ) : (
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
                                    key={txn.id + index}
                                    style={{
                                        borderBottom: '1px solid var(--border-primary)',
                                        backgroundColor: txn.isNonFinancial ? 'rgba(236, 72, 153, 0.05)' : 'transparent'
                                    }}
                                >
                                    <td style={{ padding: 'var(--spacing-sm)' }}>
                                        {new Date(txn.date).toLocaleDateString('en-GB')}
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
                                    <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: (txn.balance || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                                        {txn.balance != null ? `₹${Math.abs(txn.balance).toLocaleString()}${txn.balance >= 0 ? ' Cr' : ' Dr'}` : '—'}
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
                )}
            </div>

            {!loading && filteredTransactions.length === 0 && (
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
                        fetchTransactions(); // Refresh after edit
                    }}
                    existingInvoice={editingTransaction}
                    onSave={() => {
                        setActiveForm(null);
                        setEditingTransaction(null);
                        fetchTransactions();
                    }}
                />
            )}

            {activeForm === 'purchase_invoice' && editingTransaction && (
                <PurchaseInvoiceForm
                    onClose={() => {
                        setActiveForm(null);
                        setEditingTransaction(null);
                        fetchTransactions();
                    }}
                    existingInvoice={editingTransaction}
                    onSave={() => {
                        setActiveForm(null);
                        setEditingTransaction(null);
                        fetchTransactions();
                    }}
                />
            )}

            {activeForm === 'receipt' && editingTransaction && (
                <ReceiptVoucherForm
                    onClose={() => {
                        setActiveForm(null);
                        setEditingTransaction(null);
                        fetchTransactions();
                    }}
                    existingReceipt={editingTransaction}
                    onSave={() => {
                        setActiveForm(null);
                        setEditingTransaction(null);
                        fetchTransactions();
                    }}
                />
            )}

            {activeForm === 'payment' && editingTransaction && (
                <PaymentVoucherForm
                    onClose={() => {
                        setActiveForm(null);
                        setEditingTransaction(null);
                        fetchTransactions();
                    }}
                    existingPayment={editingTransaction}
                    onSave={() => {
                        setActiveForm(null);
                        setEditingTransaction(null);
                        fetchTransactions();
                    }}
                />
            )}

            {activeForm === 'quotation' && editingTransaction && (
                <QuotationForm
                    onClose={() => {
                        setActiveForm(null);
                        setEditingTransaction(null);
                        fetchTransactions();
                    }}
                    existingQuotation={editingTransaction}
                    onSave={() => {
                        setActiveForm(null);
                        setEditingTransaction(null);
                        fetchTransactions();
                    }}
                />
            )}
        </div>
    );
}

export default TransactionsTab;
