'use client'

import { useState } from 'react';
import { TrendingUp, ShoppingCart, FileText, Calculator, BarChart3, PieChart, Download, Calendar, Filter } from 'lucide-react';
import { salesInvoices, purchaseInvoices, balanceSheetData, profitLossData, monthlySalesTrends } from '@/lib/data/reportsData';

function FinancialReports() {
    const [activeReport, setActiveReport] = useState('sales');
    const [dateRange, setDateRange] = useState({
        from: '2026-01-01',
        to: '2026-01-31'
    });

    const reports = [
        { id: 'sales', name: 'Sales Report', icon: TrendingUp, color: '#10b981' },
        { id: 'purchase', name: 'Purchase Report', icon: ShoppingCart, color: '#3b82f6' },
        { id: 'gstr1', name: 'GSTR-1', icon: FileText, color: '#8b5cf6' },
        { id: 'gstr3b', name: 'GSTR-3B', icon: Calculator, color: '#f59e0b' },
        { id: 'balancesheet', name: 'Balance Sheet', icon: BarChart3, color: '#06b6d4' },
        { id: 'profitloss', name: 'Profit & Loss', icon: PieChart, color: '#ec4899' }
    ];

    // Filter invoices by date range
    const filterByDateRange = (invoices) => {
        return invoices.filter(inv => {
            const invDate = new Date(inv.date);
            const from = new Date(dateRange.from);
            const to = new Date(dateRange.to);
            return invDate >= from && invDate <= to;
        });
    };

    const filteredSales = filterByDateRange(salesInvoices);
    const filteredPurchases = filterByDateRange(purchaseInvoices);

    // Calculate totals
    const salesTotal = filteredSales.reduce((sum, inv) => sum + inv.total, 0);
    const salesSubtotal = filteredSales.reduce((sum, inv) => sum + inv.subtotal, 0);
    const salesGST = salesTotal - salesSubtotal;

    const purchaseTotal = filteredPurchases.reduce((sum, inv) => sum + inv.total, 0);
    const purchaseSubtotal = filteredPurchases.reduce((sum, inv) => sum + inv.subtotal, 0);
    const purchaseGST = purchaseTotal - purchaseSubtotal;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)'
            }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, marginBottom: '4px' }}>
                    Financial Reports
                </h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                    Comprehensive financial analysis and GST reports
                </p>
            </div>

            {/* Report Navigation */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                gap: 'var(--spacing-xs)',
                overflowX: 'auto'
            }}>
                {reports.map(report => (
                    <button
                        key={report.id}
                        onClick={() => setActiveReport(report.id)}
                        style={{
                            padding: '8px 16px',
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 500,
                            backgroundColor: activeReport === report.id ? report.color : 'var(--bg-elevated)',
                            color: activeReport === report.id ? '#ffffff' : 'var(--text-primary)',
                            border: `1px solid ${activeReport === report.id ? report.color : 'var(--border-primary)'}`,
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all var(--transition-fast)',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <report.icon size={16} />
                        {report.name}
                    </button>
                ))}
            </div>

            {/* Date Range Filter */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                gap: 'var(--spacing-md)',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <Calendar size={16} color="var(--text-secondary)" />
                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>Period:</span>
                </div>
                <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                    className="form-input"
                    style={{ fontSize: 'var(--font-size-sm)', padding: '6px 10px' }}
                />
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>to</span>
                <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                    className="form-input"
                    style={{ fontSize: 'var(--font-size-sm)', padding: '6px 10px' }}
                />
                <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)', marginLeft: 'auto' }}
                >
                    <Download size={14} />
                    Export PDF
                </button>
            </div>

            {/* Report Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)' }}>
                {/* Sales Report */}
                {activeReport === 'sales' && (
                    <div>
                        {/* Summary Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                            <div style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: 'var(--radius-lg)'
                            }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Total Sales</div>
                                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#10b981' }}>
                                    ₹{salesTotal.toLocaleString()}
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    {filteredSales.length} invoices
                                </div>
                            </div>
                            <div style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: 'var(--radius-lg)'
                            }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Taxable Amount</div>
                                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#3b82f6' }}>
                                    ₹{salesSubtotal.toLocaleString()}
                                </div>
                            </div>
                            <div style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                borderRadius: 'var(--radius-lg)'
                            }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Total GST</div>
                                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#8b5cf6' }}>
                                    ₹{salesGST.toLocaleString()}
                                </div>
                            </div>
                            <div style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: 'var(--radius-lg)'
                            }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Pending</div>
                                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#f59e0b' }}>
                                    ₹{filteredSales.filter(inv => inv.paymentStatus !== 'paid').reduce((sum, inv) => sum + inv.total, 0).toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {/* Sales Table */}
                        <div style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            overflow: 'hidden'
                        }}>
                            <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)' }}>
                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                    Sales Invoices
                                </h4>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Invoice #</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Date</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Customer</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Type</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>Subtotal</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>GST</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>Total</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSales.map(invoice => (
                                            <tr key={invoice.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                <td style={{ padding: 'var(--spacing-sm)', fontFamily: 'monospace' }}>{invoice.id}</td>
                                                <td style={{ padding: 'var(--spacing-sm)' }}>
                                                    {new Date(invoice.date).toLocaleDateString('en-IN')}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)' }}>{invoice.customerName}</td>
                                                <td style={{ padding: 'var(--spacing-sm)' }}>
                                                    <span style={{
                                                        padding: '2px 8px',
                                                        backgroundColor: invoice.invoiceType === 'B2B' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                        color: invoice.invoiceType === 'B2B' ? '#3b82f6' : '#10b981',
                                                        borderRadius: 'var(--radius-sm)',
                                                        fontSize: 'var(--font-size-xs)',
                                                        fontWeight: 600
                                                    }}>
                                                        {invoice.invoiceType}
                                                    </span>
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>
                                                    ₹{invoice.subtotal.toLocaleString()}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>
                                                    ₹{(invoice.cgst + invoice.sgst + invoice.igst).toLocaleString()}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 700 }}>
                                                    ₹{invoice.total.toLocaleString()}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '2px 8px',
                                                        backgroundColor: invoice.paymentStatus === 'paid' ? 'rgba(16, 185, 129, 0.1)' :
                                                            invoice.paymentStatus === 'pending' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                        color: invoice.paymentStatus === 'paid' ? '#10b981' :
                                                            invoice.paymentStatus === 'pending' ? '#f59e0b' : '#ef4444',
                                                        borderRadius: 'var(--radius-sm)',
                                                        fontSize: 'var(--font-size-xs)',
                                                        fontWeight: 600,
                                                        textTransform: 'capitalize'
                                                    }}>
                                                        {invoice.paymentStatus}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Purchase Report - Similar structure */}
                {activeReport === 'purchase' && (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                            <div style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: 'var(--radius-lg)'
                            }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Total Purchases</div>
                                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#3b82f6' }}>
                                    ₹{purchaseTotal.toLocaleString()}
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    {filteredPurchases.length} invoices
                                </div>
                            </div>
                            <div style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: 'var(--radius-lg)'
                            }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Input Tax Credit</div>
                                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#10b981' }}>
                                    ₹{purchaseGST.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            overflow: 'hidden'
                        }}>
                            <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)' }}>
                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                    Purchase Invoices
                                </h4>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Invoice #</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Date</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Vendor</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>Subtotal</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>ITC</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>Total</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPurchases.map(invoice => (
                                            <tr key={invoice.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                <td style={{ padding: 'var(--spacing-sm)', fontFamily: 'monospace' }}>{invoice.id}</td>
                                                <td style={{ padding: 'var(--spacing-sm)' }}>
                                                    {new Date(invoice.date).toLocaleDateString('en-IN')}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)' }}>{invoice.vendorName}</td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>
                                                    ₹{invoice.subtotal.toLocaleString()}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>
                                                    ₹{(invoice.cgst + invoice.sgst + invoice.igst).toLocaleString()}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 700 }}>
                                                    ₹{invoice.total.toLocaleString()}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '2px 8px',
                                                        backgroundColor: invoice.paymentStatus === 'paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                        color: invoice.paymentStatus === 'paid' ? '#10b981' : '#f59e0b',
                                                        borderRadius: 'var(--radius-sm)',
                                                        fontSize: 'var(--font-size-xs)',
                                                        fontWeight: 600,
                                                        textTransform: 'capitalize'
                                                    }}>
                                                        {invoice.paymentStatus}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* GSTR-1 Report */}
                {activeReport === 'gstr1' && (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                            <div style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                borderRadius: 'var(--radius-lg)'
                            }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>B2B Invoices</div>
                                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#8b5cf6' }}>
                                    {filteredSales.filter(inv => inv.invoiceType === 'B2B').length}
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    ₹{filteredSales.filter(inv => inv.invoiceType === 'B2B').reduce((sum, inv) => sum + inv.total, 0).toLocaleString()}
                                </div>
                            </div>
                            <div style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: 'var(--radius-lg)'
                            }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>B2C Invoices</div>
                                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#10b981' }}>
                                    {filteredSales.filter(inv => inv.invoiceType === 'B2C').length}
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    ₹{filteredSales.filter(inv => inv.invoiceType === 'B2C').reduce((sum, inv) => sum + inv.total, 0).toLocaleString()}
                                </div>
                            </div>
                            <div style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: 'var(--radius-lg)'
                            }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Tax Liability</div>
                                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#f59e0b' }}>
                                    ₹{salesGST.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {/* HSN Summary */}
                        <div style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            overflow: 'hidden',
                            marginBottom: 'var(--spacing-lg)'
                        }}>
                            <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)' }}>
                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                    HSN-wise Summary of Outward Supplies
                                </h4>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>HSN Code</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Description</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>UQC</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>Total Qty</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>Taxable Value</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Tax Rate</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>Tax Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                            <td style={{ padding: 'var(--spacing-sm)', fontFamily: 'monospace' }}>998599</td>
                                            <td style={{ padding: 'var(--spacing-sm)' }}>AC Repair & Services</td>
                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>NOS</td>
                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>11</td>
                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>₹24,100</td>
                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>18%</td>
                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>₹4,338</td>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                            <td style={{ padding: 'var(--spacing-sm)', fontFamily: 'monospace' }}>382440</td>
                                            <td style={{ padding: 'var(--spacing-sm)' }}>Refrigerant Gas</td>
                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>NOS</td>
                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>1</td>
                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>₹2,500</td>
                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>18%</td>
                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>₹450</td>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                            <td style={{ padding: 'var(--spacing-sm)', fontFamily: 'monospace' }}>853222</td>
                                            <td style={{ padding: 'var(--spacing-sm)' }}>AC Capacitors</td>
                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>NOS</td>
                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>2</td>
                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>₹300</td>
                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>18%</td>
                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>₹54</td>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                            <td style={{ padding: 'var(--spacing-sm)', fontFamily: 'monospace' }}>740400</td>
                                            <td style={{ padding: 'var(--spacing-sm)' }}>Copper Piping</td>
                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>MTR</td>
                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>15</td>
                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>₹3,000</td>
                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>18%</td>
                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>₹540</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* GSTR-3B Report */}
                {activeReport === 'gstr3b' && (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                            <div style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: 'var(--radius-lg)'
                            }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Outward Supplies</div>
                                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#f59e0b' }}>
                                    ₹{salesSubtotal.toLocaleString()}
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    Taxable value
                                </div>
                            </div>
                            <div style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: 'var(--radius-lg)'
                            }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>ITC Available</div>
                                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#10b981' }}>
                                    ₹{purchaseGST.toLocaleString()}
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    Input tax credit
                                </div>
                            </div>
                            <div style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: 'var(--radius-lg)'
                            }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Net Tax Payable</div>
                                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#ef4444' }}>
                                    ₹{(salesGST - purchaseGST).toLocaleString()}
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    To be paid
                                </div>
                            </div>
                        </div>

                        {/* GSTR-3B Tables */}
                        <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
                            {/* Table 3.1 - Outward Supplies */}
                            <div style={{
                                backgroundColor: 'var(--bg-elevated)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-lg)',
                                overflow: 'hidden'
                            }}>
                                <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                        3.1 - Tax on Outward and Reverse Charge Inward Supplies
                                    </h4>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Nature of Supplies</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>Taxable Value</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>CGST</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>SGST</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>IGST</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>Cess</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                <td style={{ padding: 'var(--spacing-sm)' }}>Outward taxable supplies (other than zero rated, nil rated and exempted)</td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>₹{salesSubtotal.toLocaleString()}</td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>
                                                    ₹{filteredSales.reduce((sum, inv) => sum + inv.cgst, 0).toLocaleString()}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>
                                                    ₹{filteredSales.reduce((sum, inv) => sum + inv.sgst, 0).toLocaleString()}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>
                                                    ₹{filteredSales.reduce((sum, inv) => sum + inv.igst, 0).toLocaleString()}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>₹0</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Table 4 - ITC */}
                            <div style={{
                                backgroundColor: 'var(--bg-elevated)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-lg)',
                                overflow: 'hidden'
                            }}>
                                <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                        4 - Eligible ITC
                                    </h4>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Details</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>CGST</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>SGST</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>IGST</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>Cess</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                <td style={{ padding: 'var(--spacing-sm)' }}>Inputs</td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                                                    ₹{filteredPurchases.reduce((sum, inv) => sum + inv.cgst, 0).toLocaleString()}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                                                    ₹{filteredPurchases.reduce((sum, inv) => sum + inv.sgst, 0).toLocaleString()}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                                                    ₹{filteredPurchases.reduce((sum, inv) => sum + inv.igst, 0).toLocaleString()}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>₹0</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Balance Sheet */}
                {activeReport === 'balancesheet' && (
                    <div>
                        <div style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)' }}>
                            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: '4px' }}>Balance Sheet</div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                As on {new Date(balanceSheetData.asOnDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                            {/* Assets */}
                            <div style={{
                                backgroundColor: 'var(--bg-elevated)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-lg)',
                                overflow: 'hidden'
                            }}>
                                <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)', backgroundColor: 'rgba(6, 182, 212, 0.1)' }}>
                                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0, color: '#06b6d4' }}>
                                        ASSETS
                                    </h4>
                                </div>
                                <div style={{ padding: 'var(--spacing-md)' }}>
                                    {/* Current Assets */}
                                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>
                                            Current Assets
                                        </div>
                                        <div style={{ paddingLeft: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                <span>Cash & Bank</span>
                                                <span style={{ fontWeight: 600 }}>₹{balanceSheetData.assets.currentAssets.cashAndBank.toLocaleString()}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                <span>Accounts Receivable</span>
                                                <span style={{ fontWeight: 600 }}>₹{balanceSheetData.assets.currentAssets.accountsReceivable.toLocaleString()}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                <span>Inventory</span>
                                                <span style={{ fontWeight: 600 }}>₹{balanceSheetData.assets.currentAssets.inventory.toLocaleString()}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                <span>Prepaid Expenses</span>
                                                <span style={{ fontWeight: 600 }}>₹{balanceSheetData.assets.currentAssets.prepaidExpenses.toLocaleString()}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border-primary)', marginTop: '4px', fontWeight: 700 }}>
                                                <span>Total Current Assets</span>
                                                <span>₹{Object.values(balanceSheetData.assets.currentAssets).reduce((a, b) => a + b, 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fixed Assets */}
                                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>
                                            Fixed Assets
                                        </div>
                                        <div style={{ paddingLeft: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                <span>Equipment</span>
                                                <span style={{ fontWeight: 600 }}>₹{balanceSheetData.assets.fixedAssets.equipment.toLocaleString()}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                <span>Vehicles</span>
                                                <span style={{ fontWeight: 600 }}>₹{balanceSheetData.assets.fixedAssets.vehicles.toLocaleString()}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#ef4444' }}>
                                                <span>Less: Depreciation</span>
                                                <span style={{ fontWeight: 600 }}>₹{balanceSheetData.assets.fixedAssets.lessDepreciation.toLocaleString()}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border-primary)', marginTop: '4px', fontWeight: 700 }}>
                                                <span>Total Fixed Assets</span>
                                                <span>₹{Object.values(balanceSheetData.assets.fixedAssets).reduce((a, b) => a + b, 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Total Assets */}
                                    <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'rgba(6, 182, 212, 0.1)', borderRadius: 'var(--radius-md)', marginTop: 'var(--spacing-md)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-lg)', fontWeight: 700, color: '#06b6d4' }}>
                                            <span>TOTAL ASSETS</span>
                                            <span>₹{(Object.values(balanceSheetData.assets.currentAssets).reduce((a, b) => a + b, 0) + Object.values(balanceSheetData.assets.fixedAssets).reduce((a, b) => a + b, 0)).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Liabilities & Equity */}
                            <div style={{
                                backgroundColor: 'var(--bg-elevated)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-lg)',
                                overflow: 'hidden'
                            }}>
                                <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)', backgroundColor: 'rgba(236, 72, 153, 0.1)' }}>
                                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0, color: '#ec4899' }}>
                                        LIABILITIES & EQUITY
                                    </h4>
                                </div>
                                <div style={{ padding: 'var(--spacing-md)' }}>
                                    {/* Current Liabilities */}
                                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>
                                            Current Liabilities
                                        </div>
                                        <div style={{ paddingLeft: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                <span>Accounts Payable</span>
                                                <span style={{ fontWeight: 600 }}>₹{balanceSheetData.liabilities.currentLiabilities.accountsPayable.toLocaleString()}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                <span>Short-term Loans</span>
                                                <span style={{ fontWeight: 600 }}>₹{balanceSheetData.liabilities.currentLiabilities.shortTermLoans.toLocaleString()}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                <span>Outstanding Expenses</span>
                                                <span style={{ fontWeight: 600 }}>₹{balanceSheetData.liabilities.currentLiabilities.outstandingExpenses.toLocaleString()}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border-primary)', marginTop: '4px', fontWeight: 700 }}>
                                                <span>Total Current Liabilities</span>
                                                <span>₹{Object.values(balanceSheetData.liabilities.currentLiabilities).reduce((a, b) => a + b, 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Long-term Liabilities */}
                                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>
                                            Long-term Liabilities
                                        </div>
                                        <div style={{ paddingLeft: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                <span>Term Loan</span>
                                                <span style={{ fontWeight: 600 }}>₹{balanceSheetData.liabilities.longTermLiabilities.termLoan.toLocaleString()}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border-primary)', marginTop: '4px', fontWeight: 700 }}>
                                                <span>Total Long-term Liabilities</span>
                                                <span>₹{Object.values(balanceSheetData.liabilities.longTermLiabilities).reduce((a, b) => a + b, 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Equity */}
                                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>
                                            Equity
                                        </div>
                                        <div style={{ paddingLeft: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                <span>Capital</span>
                                                <span style={{ fontWeight: 600 }}>₹{balanceSheetData.equity.capital.toLocaleString()}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                <span>Retained Earnings</span>
                                                <span style={{ fontWeight: 600 }}>₹{balanceSheetData.equity.retainedEarnings.toLocaleString()}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border-primary)', marginTop: '4px', fontWeight: 700 }}>
                                                <span>Total Equity</span>
                                                <span>₹{Object.values(balanceSheetData.equity).reduce((a, b) => a + b, 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Total Liabilities & Equity */}
                                    <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'rgba(236, 72, 153, 0.1)', borderRadius: 'var(--radius-md)', marginTop: 'var(--spacing-md)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-lg)', fontWeight: 700, color: '#ec4899' }}>
                                            <span>TOTAL LIABILITIES & EQUITY</span>
                                            <span>₹{(Object.values(balanceSheetData.liabilities.currentLiabilities).reduce((a, b) => a + b, 0) + Object.values(balanceSheetData.liabilities.longTermLiabilities).reduce((a, b) => a + b, 0) + Object.values(balanceSheetData.equity).reduce((a, b) => a + b, 0)).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Profit & Loss */}
                {activeReport === 'profitloss' && (
                    <div>
                        <div style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)' }}>
                            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: '4px' }}>Profit & Loss Statement</div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                For the period: {profitLossData.period}
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            overflow: 'hidden'
                        }}>
                            <div style={{ padding: 'var(--spacing-lg)' }}>
                                {/* Revenue */}
                                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                    <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: '#10b981' }}>
                                        REVENUE
                                    </div>
                                    <div style={{ paddingLeft: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                            <span>Service Revenue</span>
                                            <span style={{ fontWeight: 600 }}>₹{profitLossData.revenue.serviceRevenue.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                            <span>Product Sales</span>
                                            <span style={{ fontWeight: 600 }}>₹{profitLossData.revenue.productSales.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid var(--border-primary)', marginTop: '4px', fontWeight: 700, fontSize: 'var(--font-size-base)', color: '#10b981' }}>
                                            <span>Total Revenue</span>
                                            <span>₹{Object.values(profitLossData.revenue).reduce((a, b) => a + b, 0).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* COGS */}
                                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                    <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: '#ef4444' }}>
                                        COST OF GOODS SOLD
                                    </div>
                                    <div style={{ paddingLeft: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                            <span>Spare Parts Cost</span>
                                            <span style={{ fontWeight: 600 }}>₹{profitLossData.costOfGoodsSold.sparePartsCost.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                            <span>Direct Labor</span>
                                            <span style={{ fontWeight: 600 }}>₹{profitLossData.costOfGoodsSold.directLabor.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid var(--border-primary)', marginTop: '4px', fontWeight: 700, fontSize: 'var(--font-size-base)', color: '#ef4444' }}>
                                            <span>Total COGS</span>
                                            <span>₹{Object.values(profitLossData.costOfGoodsSold).reduce((a, b) => a + b, 0).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Gross Profit */}
                                <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-lg)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-lg)', fontWeight: 700, color: '#10b981' }}>
                                        <span>GROSS PROFIT</span>
                                        <span>₹{(Object.values(profitLossData.revenue).reduce((a, b) => a + b, 0) - Object.values(profitLossData.costOfGoodsSold).reduce((a, b) => a + b, 0)).toLocaleString()}</span>
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                        Margin: {((Object.values(profitLossData.revenue).reduce((a, b) => a + b, 0) - Object.values(profitLossData.costOfGoodsSold).reduce((a, b) => a + b, 0)) / Object.values(profitLossData.revenue).reduce((a, b) => a + b, 0) * 100).toFixed(1)}%
                                    </div>
                                </div>

                                {/* Operating Expenses */}
                                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                    <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: '#f59e0b' }}>
                                        OPERATING EXPENSES
                                    </div>
                                    <div style={{ paddingLeft: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                            <span>Technician Salaries</span>
                                            <span style={{ fontWeight: 600 }}>₹{profitLossData.operatingExpenses.technicianSalaries.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                            <span>Fuel & Transportation</span>
                                            <span style={{ fontWeight: 600 }}>₹{profitLossData.operatingExpenses.fuelTransportation.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                            <span>Rent</span>
                                            <span style={{ fontWeight: 600 }}>₹{profitLossData.operatingExpenses.rent.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                            <span>Utilities</span>
                                            <span style={{ fontWeight: 600 }}>₹{profitLossData.operatingExpenses.utilities.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                            <span>Marketing</span>
                                            <span style={{ fontWeight: 600 }}>₹{profitLossData.operatingExpenses.marketing.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                            <span>Administrative</span>
                                            <span style={{ fontWeight: 600 }}>₹{profitLossData.operatingExpenses.administrative.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid var(--border-primary)', marginTop: '4px', fontWeight: 700, fontSize: 'var(--font-size-base)', color: '#f59e0b' }}>
                                            <span>Total Operating Expenses</span>
                                            <span>₹{Object.values(profitLossData.operatingExpenses).reduce((a, b) => a + b, 0).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Operating Profit */}
                                <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-lg)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-lg)', fontWeight: 700, color: '#3b82f6' }}>
                                        <span>OPERATING PROFIT</span>
                                        <span>₹{(Object.values(profitLossData.revenue).reduce((a, b) => a + b, 0) - Object.values(profitLossData.costOfGoodsSold).reduce((a, b) => a + b, 0) - Object.values(profitLossData.operatingExpenses).reduce((a, b) => a + b, 0)).toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Other Income/Expenses */}
                                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>
                                        OTHER INCOME/EXPENSES
                                    </div>
                                    <div style={{ paddingLeft: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#10b981' }}>
                                            <span>Interest Income</span>
                                            <span style={{ fontWeight: 600 }}>₹{profitLossData.otherIncome.interestIncome.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#ef4444' }}>
                                            <span>Interest Expense</span>
                                            <span style={{ fontWeight: 600 }}>-₹{profitLossData.otherExpenses.interestExpense.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Net Profit */}
                                <div style={{ padding: 'var(--spacing-lg)', backgroundColor: 'rgba(16, 185, 129, 0.15)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                                        <span>Net Profit Before Tax</span>
                                        <span>₹{(Object.values(profitLossData.revenue).reduce((a, b) => a + b, 0) - Object.values(profitLossData.costOfGoodsSold).reduce((a, b) => a + b, 0) - Object.values(profitLossData.operatingExpenses).reduce((a, b) => a + b, 0) + Object.values(profitLossData.otherIncome).reduce((a, b) => a + b, 0) - Object.values(profitLossData.otherExpenses).reduce((a, b) => a + b, 0)).toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-sm)', color: '#ef4444' }}>
                                        <span>Tax Expense</span>
                                        <span style={{ fontWeight: 600 }}>-₹{profitLossData.taxExpense.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xl)', fontWeight: 700, paddingTop: 'var(--spacing-sm)', borderTop: '2px solid #10b981', color: '#10b981' }}>
                                        <span>NET PROFIT AFTER TAX</span>
                                        <span>₹{(Object.values(profitLossData.revenue).reduce((a, b) => a + b, 0) - Object.values(profitLossData.costOfGoodsSold).reduce((a, b) => a + b, 0) - Object.values(profitLossData.operatingExpenses).reduce((a, b) => a + b, 0) + Object.values(profitLossData.otherIncome).reduce((a, b) => a + b, 0) - Object.values(profitLossData.otherExpenses).reduce((a, b) => a + b, 0) - profitLossData.taxExpense).toLocaleString()}</span>
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                        Net Margin: {((Object.values(profitLossData.revenue).reduce((a, b) => a + b, 0) - Object.values(profitLossData.costOfGoodsSold).reduce((a, b) => a + b, 0) - Object.values(profitLossData.operatingExpenses).reduce((a, b) => a + b, 0) + Object.values(profitLossData.otherIncome).reduce((a, b) => a + b, 0) - Object.values(profitLossData.otherExpenses).reduce((a, b) => a + b, 0) - profitLossData.taxExpense) / Object.values(profitLossData.revenue).reduce((a, b) => a + b, 0) * 100).toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default FinancialReports;

