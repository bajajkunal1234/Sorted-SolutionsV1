'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, ArrowRight, Search, Filter, Trash2, X, Plus, AlertCircle } from 'lucide-react';
import { parseBankCSV, parseBankExcel } from '@/utils/bankParser';
import PaymentVoucherForm from '../accounts/PaymentVoucherForm';
import ReceiptVoucherForm from '../accounts/ReceiptVoucherForm';
import { transactionsAPI } from '@/lib/adminAPI';

function BankStatementReconciler() {
    const [transactions, setTransactions] = useState([]);
    const [existingTransactions, setExistingTransactions] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [fileStats, setFileStats] = useState(null);
    const [showVoucherForm, setShowVoucherForm] = useState(null); // { type: 'payment'|'receipt', data: {} }
    const [reconciledIds, setReconciledIds] = useState(new Set());
    const [narrationWidth, setNarrationWidth] = useState(400); // Default width in px

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [accRes, transRes] = await Promise.all([
                fetch('/api/admin/accounts'),
                fetch('/api/admin/transactions?type=all')
            ]);
            const accData = await accRes.json();
            const transData = await transRes.json();

            if (accData.success) setAccounts(accData.data || []);
            if (transData.success) setExistingTransactions(transData.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsLoading(true);
        const fileName = file.name.toLowerCase();
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                let parsed;
                if (fileName.endsWith('.csv')) {
                    const text = event.target.result;
                    parsed = parseBankCSV(text);
                } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
                    const buffer = event.target.result;
                    parsed = parseBankExcel(buffer);
                } else {
                    throw new Error('Unsupported file format. Please upload CSV or Excel.');
                }

                // Add duplicate detection info
                const enriched = parsed.map(t => ({
                    ...t,
                    id: Math.random().toString(36).substr(2, 9),
                    potentialDuplicate: findPotentialDuplicate(t)
                }));

                setTransactions(enriched);
                setFileStats({
                    name: file.name,
                    count: enriched.length,
                    totalValue: enriched.reduce((sum, t) => sum + t.amount, 0)
                });
            } catch (error) {
                console.error('Parsing error:', error);
                alert(error.message || 'Error parsing file. Please check the format.');
            } finally {
                setIsLoading(false);
            }
        };

        if (fileName.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    };

    const findPotentialDuplicate = (t) => {
        // Match by amount and date (within 3 days)
        return existingTransactions.find(et => {
            const amountMatches = Math.abs(parseFloat(et.amount) - t.amount) < 0.01;
            const tDate = new Date(t.date);
            const etDate = new Date(et.date);
            const diffDays = Math.abs(tDate - etDate) / (1000 * 60 * 60 * 24);
            return amountMatches && diffDays <= 3;
        });
    };

    const handleReconcile = (t) => {
        setShowVoucherForm({
            type: t.type,
            data: {
                date: t.date,
                amount: t.amount,
                narration: t.particulars,
                reference_number: t.refNo,
                payment_mode: 'bank_transfer',
                account_id: accounts.find(a => a.name === t.suggestedAccount)?.id || ''
            },
            bankTransactionId: t.id
        });
    };

    const handleVoucherSave = async (data, type) => {
        try {
            await transactionsAPI.create(data, type);
            if (showVoucherForm?.bankTransactionId) {
                setReconciledIds(prev => new Set([...prev, showVoucherForm.bankTransactionId]));
            }
            setShowVoucherForm(null);
            fetchData(); // Refresh list to catch new duplicates
            alert('Voucher reconciled successfully!');
        } catch (error) {
            console.error('Error saving voucher:', error);
            alert('Error saving voucher: ' + error.message);
        }
    };

    return (
        <div style={{ padding: 'var(--spacing-lg)', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, margin: 0 }}>
                        Bank Statement Reconciler
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>
                        Upload HDFC/ICICI CSV statements to bifurcate and reconcile transactions.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                    <label className="btn btn-primary" style={{ cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Upload size={18} />
                        Upload Excel/CSV Statement
                        <input type="file" accept=".csv,.xls,.xlsx" onChange={handleFileUpload} style={{ display: 'none' }} />
                    </label>
                    {transactions.length > 0 && (
                        <button className="btn btn-secondary" onClick={() => { setTransactions([]); setFileStats(null); }}>
                            <Trash2 size={18} />
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {fileStats && (
                <div style={{
                    display: 'flex',
                    gap: 'var(--spacing-xl)',
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--spacing-lg)',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>File Name</span>
                        <div style={{ fontWeight: 600 }}>{fileStats.name}</div>
                    </div>
                    <div>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Transactions</span>
                        <div style={{ fontWeight: 600 }}>{fileStats.count}</div>
                    </div>
                    <div>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Total Value</span>
                        <div style={{ fontWeight: 600 }}>₹{fileStats.totalValue.toLocaleString()}</div>
                    </div>
                </div>
            )}

            <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)' }}>
                {isLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                        <div className="spinner" style={{ marginBottom: '16px' }}></div>
                        <p>Processing statement...</p>
                    </div>
                ) : transactions.length === 0 ? (
                    <div style={{ padding: '80px 40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <h3 style={{ margin: '0 0 8px', color: 'var(--text-secondary)' }}>No transactions to display</h3>
                        <p style={{ maxWidth: '400px', margin: '0 auto' }}>Upload a bank statement CSV file to begin the reconciliation process.</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)', tableLayout: 'fixed', minWidth: `${550 + narrationWidth}px` }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', textAlign: 'left', position: 'sticky', top: 0, zIndex: 10 }}>
                                <th style={{ padding: 'var(--spacing-md)', width: '100px' }}>Date</th>
                                <th style={{ padding: 'var(--spacing-md)', width: `${narrationWidth}px` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>Particulars / Narration</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                                            <input
                                                type="range"
                                                min="200"
                                                max="800"
                                                value={narrationWidth}
                                                onChange={(e) => setNarrationWidth(parseInt(e.target.value))}
                                                style={{ width: '60px', cursor: 'pointer', accentColor: 'var(--primary-color)' }}
                                            />
                                        </div>
                                    </div>
                                </th>
                                <th style={{ padding: 'var(--spacing-md)', width: '140px' }}>Ref No.</th>
                                <th style={{ padding: 'var(--spacing-md)', width: '110px', textAlign: 'right' }}>Amount</th>
                                <th style={{ padding: 'var(--spacing-md)', width: '160px' }}>Suggestion</th>
                                <th style={{ padding: 'var(--spacing-md)', width: '140px', textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(t => {
                                const isReconciled = reconciledIds.has(t.id);
                                return (
                                    <tr
                                        key={t.id}
                                        style={{
                                            borderBottom: '1px solid var(--border-primary)',
                                            backgroundColor: isReconciled ? 'rgba(16, 185, 129, 0.05)' : t.potentialDuplicate ? 'rgba(245, 158, 11, 0.05)' : 'transparent',
                                            opacity: isReconciled ? 0.6 : 1
                                        }}
                                    >
                                        <td style={{ padding: 'var(--spacing-md)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>{t.date}</td>
                                        <td style={{ padding: 'var(--spacing-md)', verticalAlign: 'top', width: `${narrationWidth}px` }}>
                                            <div style={{
                                                fontWeight: 500,
                                                wordBreak: 'break-word',
                                                lineHeight: '1.4',
                                                maxHeight: '4.2em', // 3 lines
                                                overflow: 'auto'
                                            }} title={t.particulars}>
                                                {t.particulars}
                                            </div>
                                            {t.potentialDuplicate && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#d97706', fontSize: '11px', marginTop: '4px' }}>
                                                    <AlertTriangle size={12} />
                                                    Potential duplicate: {t.potentialDuplicate.type} #{t.potentialDuplicate.payment_number || t.potentialDuplicate.receipt_number}
                                                    (₹{parseFloat(t.potentialDuplicate.amount).toLocaleString()})
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-md)', fontFamily: 'monospace', verticalAlign: 'top' }}>{t.refNo || '-'}</td>
                                        <td style={{
                                            padding: 'var(--spacing-md)',
                                            textAlign: 'right',
                                            fontWeight: 700,
                                            color: t.type === 'payment' ? '#ef4444' : '#10b981',
                                            verticalAlign: 'top'
                                        }}>
                                            {t.type === 'payment' ? '-' : '+'}₹{t.amount.toLocaleString()}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-md)', verticalAlign: 'top' }}>
                                            {isReconciled ? (
                                                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <CheckCircle size={14} /> Reconciled
                                                </span>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        padding: '2px 6px',
                                                        backgroundColor: t.type === 'payment' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                        color: t.type === 'payment' ? '#ef4444' : '#10b981',
                                                        borderRadius: '10px',
                                                        width: 'fit-content',
                                                        fontWeight: 600,
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {t.type}
                                                    </span>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                                                        {t.suggestedAccount || 'No suggestion'}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-md)', textAlign: 'center', verticalAlign: 'top' }}>
                                            {!isReconciled && (
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '4px 8px', fontSize: '12px' }}
                                                    onClick={() => handleReconcile(t)}
                                                >
                                                    {t.potentialDuplicate ? 'Review & Link' : 'Confirm & Create'}
                                                    <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {showVoucherForm && (
                showVoucherForm.type === 'payment' ? (
                    <PaymentVoucherForm
                        onClose={() => setShowVoucherForm(null)}
                        existingPayment={showVoucherForm.data}
                        onSave={(data) => handleVoucherSave(data, 'payment')}
                    />
                ) : (
                    <ReceiptVoucherForm
                        onClose={() => setShowVoucherForm(null)}
                        existingReceipt={showVoucherForm.data}
                        onSave={(data) => handleVoucherSave(data, 'receipt')}
                    />
                )
            )}
        </div>
    );
}

export default BankStatementReconciler;
