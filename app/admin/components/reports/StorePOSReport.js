'use client'

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    Store, 
    Calendar, 
    Search, 
    TrendingUp, 
    DollarSign, 
    ShoppingBag, 
    Layers, 
    Download, 
    RefreshCcw, 
    ExternalLink, 
    Printer, 
    ArrowUpDown, 
    FileText, 
    Smartphone, 
    Plus,
    Loader2
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/accountingHelpers';

const getISTDateString = (dateObj = new Date()) => {
    try {
        const utcTime = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
        const offsetDate = new Date(utcTime + (5.5 * 60 * 60 * 1000));
        const year = offsetDate.getFullYear();
        const month = String(offsetDate.getMonth() + 1).padStart(2, '0');
        const day = String(offsetDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return null;
    }
};

export default function StorePOSReport() {
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState([]);
    const [receipts, setReceipts] = useState([]);

    // Date Presets: 'today' | 'yesterday' | '7days' | 'this_month' | 'last_month' | 'all' | 'custom'
    const [dateRangePreset, setDateRangePreset] = useState('this_month');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    // Search & Sort filters
    const [itemSearch, setItemSearch] = useState('');
    const [sortBy, setSortBy] = useState('qty_desc'); // 'qty_desc' | 'revenue_desc' | 'freq_desc' | 'name_asc'
    const [activeSubTab, setActiveSubTab] = useState('items'); // 'items' | 'invoices'

    // Compute active date boundaries
    const dateBoundaries = useMemo(() => {
        const today = new Date();
        const todayStr = getISTDateString(today);

        if (dateRangePreset === 'today') {
            return { from: todayStr, to: todayStr, label: 'Today' };
        }
        if (dateRangePreset === 'yesterday') {
            const yDate = new Date(today);
            yDate.setDate(yDate.getDate() - 1);
            const yStr = getISTDateString(yDate);
            return { from: yStr, to: yStr, label: 'Yesterday' };
        }
        if (dateRangePreset === '7days') {
            const l7Date = new Date(today);
            l7Date.setDate(l7Date.getDate() - 6);
            return { from: getISTDateString(l7Date), to: todayStr, label: 'Last 7 Days' };
        }
        if (dateRangePreset === 'this_month') {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            return { from: getISTDateString(firstDay), to: todayStr, label: 'This Month' };
        }
        if (dateRangePreset === 'last_month') {
            const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            return { 
                from: getISTDateString(firstDayLastMonth), 
                to: getISTDateString(lastDayLastMonth), 
                label: 'Last Month' 
            };
        }
        if (dateRangePreset === 'custom') {
            return { from: customFrom, to: customTo, label: 'Custom Range' };
        }
        return { from: null, to: null, label: 'All Time' };
    }, [dateRangePreset, customFrom, customTo]);

    const fetchPOSData = async () => {
        try {
            setLoading(true);

            let invQuery = supabase
                .from('sales_invoices')
                .select('*')
                .ilike('notes', '%pos%')
                .neq('status', 'cancelled')
                .order('date', { ascending: false });

            if (dateBoundaries.from) invQuery = invQuery.gte('date', dateBoundaries.from);
            if (dateBoundaries.to) invQuery = invQuery.lte('date', dateBoundaries.to);

            let recQuery = supabase
                .from('receipt_vouchers')
                .select('*')
                .ilike('narration', '%pos%')
                .neq('status', 'cancelled')
                .order('date', { ascending: false });

            if (dateBoundaries.from) recQuery = recQuery.gte('date', dateBoundaries.from);
            if (dateBoundaries.to) recQuery = recQuery.lte('date', dateBoundaries.to);

            const [invRes, recRes] = await Promise.all([invQuery, recQuery]);

            if (invRes.error) throw invRes.error;

            setInvoices(invRes.data || []);
            setReceipts(recRes.data || []);
        } catch (err) {
            console.error('Error fetching Store POS Report data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPOSData();
    }, [dateBoundaries]);

    // Aggregate Frequently Sold Items & Payment Mode Totals
    const { rankedItems, summaryStats, top5Items } = useMemo(() => {
        let totalRevenue = 0;
        let totalUnitsSold = 0;
        let upiRevenue = 0;
        let cashRevenue = 0;
        let otherRevenue = 0;

        const itemsMap = {};

        invoices.forEach(inv => {
            const invoiceAmt = parseFloat(inv.total_amount || 0);
            totalRevenue += invoiceAmt;

            // Determine payment mode from invoice account or linked receipts
            const accName = (inv.account_name || '').toLowerCase();
            const matchingReceipt = receipts.find(r => r.reference_number === inv.invoice_number);
            const receiptMode = (matchingReceipt?.payment_mode || '').toLowerCase();

            if (receiptMode === 'cash' || accName.includes('cash')) {
                cashRevenue += invoiceAmt;
            } else if (receiptMode === 'upi' || accName.includes('google pay') || accName.includes('gpay')) {
                upiRevenue += invoiceAmt;
            } else {
                otherRevenue += invoiceAmt;
            }

            const invItems = Array.isArray(inv.items) ? inv.items : [];
            const seenInInvoice = new Set();

            invItems.forEach(item => {
                const desc = (item.description || item.name || '').trim();
                if (!desc) return;

                const normKey = desc.toLowerCase();
                const qty = Number(item.qty) || 1;
                const rate = Number(item.rate) || 0;
                const lineTotal = Number(item.total) || (qty * rate);

                totalUnitsSold += qty;

                if (!itemsMap[normKey]) {
                    itemsMap[normKey] = {
                        key: normKey,
                        description: desc,
                        unit: item.unit || 'Nos',
                        totalQty: 0,
                        totalRevenue: 0,
                        rates: [],
                        timesBilled: 0,
                        lastSoldDate: inv.date
                    };
                }

                itemsMap[normKey].totalQty += qty;
                itemsMap[normKey].totalRevenue += lineTotal;
                if (rate > 0) itemsMap[normKey].rates.push(rate);

                if (!seenInInvoice.has(normKey)) {
                    itemsMap[normKey].timesBilled += 1;
                    seenInInvoice.add(normKey);
                }

                if (inv.date && (!itemsMap[normKey].lastSoldDate || inv.date > itemsMap[normKey].lastSoldDate)) {
                    itemsMap[normKey].lastSoldDate = inv.date;
                }
            });
        });

        // Compute item analytics
        let allItems = Object.values(itemsMap).map(item => {
            const rates = item.rates;
            const minRate = rates.length ? Math.min(...rates) : 0;
            const maxRate = rates.length ? Math.max(...rates) : 0;
            const avgRate = item.totalQty > 0 ? (item.totalRevenue / item.totalQty) : 0;
            return {
                ...item,
                minRate,
                maxRate,
                avgRate
            };
        });

        // Filter by itemSearch
        if (itemSearch.trim()) {
            const q = itemSearch.toLowerCase().trim();
            allItems = allItems.filter(it => it.description.toLowerCase().includes(q));
        }

        // Sort items
        allItems.sort((a, b) => {
            if (sortBy === 'qty_desc') return b.totalQty - a.totalQty;
            if (sortBy === 'revenue_desc') return b.totalRevenue - a.totalRevenue;
            if (sortBy === 'freq_desc') return b.timesBilled - a.timesBilled;
            if (sortBy === 'name_asc') return a.description.localeCompare(b.description);
            return b.totalQty - a.totalQty;
        });

        const top5 = [...allItems].sort((a, b) => b.totalQty - a.totalQty).slice(0, 5);

        const stats = {
            totalRevenue,
            totalBills: invoices.length,
            totalUnitsSold,
            uniqueProductsCount: Object.keys(itemsMap).length,
            avgBillValue: invoices.length > 0 ? Math.round(totalRevenue / invoices.length) : 0,
            upiRevenue,
            cashRevenue,
            otherRevenue
        };

        return { rankedItems: allItems, summaryStats: stats, top5Items: top5 };
    }, [invoices, receipts, itemSearch, sortBy]);

    // CSV Exporter for Frequently Sold Items
    const handleExportCSV = () => {
        if (rankedItems.length === 0) {
            alert('No items to export.');
            return;
        }

        const headers = [
            'Rank',
            'Item Description',
            'Total Quantity Sold',
            'Unit',
            'Times Billed',
            'Total Revenue (INR)',
            'Average Rate (INR)',
            'Min Rate (INR)',
            'Max Rate (INR)',
            'Last Sold Date'
        ];

        const rows = rankedItems.map((it, idx) => [
            idx + 1,
            `"${it.description.replace(/"/g, '""')}"`,
            it.totalQty,
            it.unit,
            it.timesBilled,
            it.totalRevenue.toFixed(2),
            it.avgRate.toFixed(2),
            it.minRate.toFixed(2),
            it.maxRate.toFixed(2),
            it.lastSoldDate || ''
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `store_pos_frequently_sold_items_${dateBoundaries.from || 'all'}_to_${dateBoundaries.to || 'all'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', backgroundColor: 'var(--bg-primary)' }}>
            
            {/* Top Header Card */}
            <div style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-primary)',
                borderRadius: '14px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        color: '#f59e0b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Store size={22} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Store POS Sales Summary
                        </h3>
                        <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Over-the-counter billings, payment splits, and frequently sold products
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        onClick={handleExportCSV}
                        className="btn btn-secondary"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '7px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '8px'
                        }}
                        title="Download Frequently Sold Items as CSV"
                    >
                        <Download size={14} />
                        <span>Export Items CSV</span>
                    </button>

                    <button
                        onClick={() => window.openPOSModal && window.openPOSModal()}
                        className="btn btn-primary"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '7px 14px',
                            fontSize: '12px',
                            fontWeight: 700,
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            color: '#0f172a',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <Plus size={14} />
                        <span>Open POS Terminal</span>
                    </button>

                    <button
                        onClick={fetchPOSData}
                        className="btn btn-secondary"
                        style={{
                            padding: '8px',
                            borderRadius: '8px'
                        }}
                        title="Refresh Data"
                    >
                        <RefreshCcw size={15} />
                    </button>
                </div>
            </div>

            {/* Date Filters Bar */}
            <div style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-primary)',
                borderRadius: '12px',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <Calendar size={15} color="var(--text-secondary)" style={{ marginRight: '4px' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Period:</span>

                    {[
                        { id: 'today', label: 'Today' },
                        { id: 'yesterday', label: 'Yesterday' },
                        { id: '7days', label: 'Last 7 Days' },
                        { id: 'this_month', label: 'This Month' },
                        { id: 'last_month', label: 'Last Month' },
                        { id: 'all', label: 'All Time' },
                        { id: 'custom', label: 'Custom' },
                    ].map(preset => (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => setDateRangePreset(preset.id)}
                            style={{
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: dateRangePreset === preset.id ? 700 : 500,
                                borderRadius: '6px',
                                border: '1px solid',
                                borderColor: dateRangePreset === preset.id ? 'var(--color-primary, #6366f1)' : 'var(--border-primary)',
                                backgroundColor: dateRangePreset === preset.id ? 'var(--color-primary, #6366f1)' : 'var(--bg-secondary)',
                                color: dateRangePreset === preset.id ? '#ffffff' : 'var(--text-primary)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                {dateRangePreset === 'custom' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="date"
                            value={customFrom}
                            onChange={e => setCustomFrom(e.target.value)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)'
                            }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>to</span>
                        <input
                            type="date"
                            value={customTo}
                            onChange={e => setCustomTo(e.target.value)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>
                )}
            </div>

            {/* KPI Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px'
            }}>
                {/* 1. Total POS Revenue */}
                <div style={{
                    padding: '14px 16px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                            Total POS Revenue
                        </span>
                        <div style={{ padding: '6px', borderRadius: '7px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                            <DollarSign size={16} />
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', letterSpacing: '-0.02em' }}>
                            ₹{summaryStats.totalRevenue.toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                            Avg ₹{summaryStats.avgBillValue.toLocaleString('en-IN')} / bill
                        </div>
                    </div>
                </div>

                {/* 2. Total Bills Generated */}
                <div style={{
                    padding: '14px 16px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                            Bills Generated
                        </span>
                        <div style={{ padding: '6px', borderRadius: '7px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                            <FileText size={16} />
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                            {summaryStats.totalBills}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                            Walk-in invoices
                        </div>
                    </div>
                </div>

                {/* 3. Items Sold */}
                <div style={{
                    padding: '14px 16px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                            Product Units Sold
                        </span>
                        <div style={{ padding: '6px', borderRadius: '7px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                            <ShoppingBag size={16} />
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                            {summaryStats.totalUnitsSold} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>units</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                            Across {summaryStats.uniqueProductsCount} unique items
                        </div>
                    </div>
                </div>

                {/* 4. Payment Modes Breakdown */}
                <div style={{
                    padding: '14px 16px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '6px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                            Payment Collections
                        </span>
                        <div style={{ padding: '6px', borderRadius: '7px', backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                            <Smartphone size={16} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                            <span style={{ color: '#60a5fa', fontWeight: 600 }}>📱 UPI (GPay):</span>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{summaryStats.upiRevenue.toLocaleString('en-IN')}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                            <span style={{ color: '#34d399', fontWeight: 600 }}>💵 Cash:</span>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{summaryStats.cashRevenue.toLocaleString('en-IN')}</span>
                        </div>
                        {summaryStats.otherRevenue > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                                <span style={{ color: '#f59e0b', fontWeight: 600 }}>🏦 Bank / Card:</span>
                                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{summaryStats.otherRevenue.toLocaleString('en-IN')}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top 5 Moving Items Quick Visual Podium */}
            {top5Items.length > 0 && (
                <div style={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            🔥 Top 5 Fastest-Moving Store Products
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Ranked by quantity sold
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                        {top5Items.map((item, idx) => (
                            <div key={item.key} style={{
                                padding: '8px 12px',
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                    <span style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        backgroundColor: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : 'rgba(255,255,255,0.1)',
                                        color: idx < 3 ? '#0f172a' : '#fff',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        {idx + 1}
                                    </span>
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.description}>
                                            {item.description}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                            ₹{item.totalRevenue.toLocaleString('en-IN')} total
                                        </div>
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: '#f59e0b',
                                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    flexShrink: 0
                                }}>
                                    {item.totalQty} {item.unit}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Tabs Header: Frequently Sold Items vs All Invoices */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                borderBottom: '1px solid var(--border-primary)',
                paddingBottom: '8px'
            }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                        onClick={() => setActiveSubTab('items')}
                        style={{
                            padding: '6px 14px',
                            fontSize: '13px',
                            fontWeight: activeSubTab === 'items' ? 700 : 500,
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: activeSubTab === 'items' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                            color: activeSubTab === 'items' ? '#f59e0b' : 'var(--text-secondary)',
                            cursor: 'pointer'
                        }}
                    >
                        📦 Frequently Sold Items ({rankedItems.length})
                    </button>

                    <button
                        onClick={() => setActiveSubTab('invoices')}
                        style={{
                            padding: '6px 14px',
                            fontSize: '13px',
                            fontWeight: activeSubTab === 'invoices' ? 700 : 500,
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: activeSubTab === 'invoices' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                            color: activeSubTab === 'invoices' ? '#3b82f6' : 'var(--text-secondary)',
                            cursor: 'pointer'
                        }}
                    >
                        🧾 POS Invoices Log ({invoices.length})
                    </button>
                </div>

                {activeSubTab === 'items' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Search Bar */}
                        <div style={{ position: 'relative', minWidth: '180px' }}>
                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                            <input
                                type="text"
                                placeholder="Search sold items..."
                                value={itemSearch}
                                onChange={e => setItemSearch(e.target.value)}
                                style={{
                                    padding: '5px 10px 5px 30px',
                                    fontSize: '11px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-primary)',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text-primary)',
                                    width: '100%'
                                }}
                            />
                        </div>

                        {/* Sort Selector */}
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                            style={{
                                padding: '5px 8px',
                                fontSize: '11px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-elevated)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="qty_desc">Sort: Highest Quantity</option>
                            <option value="revenue_desc">Sort: Highest Revenue</option>
                            <option value="freq_desc">Sort: Times Billed</option>
                            <option value="name_asc">Sort: Name (A-Z)</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Content Area */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '10px' }}>
                    <Loader2 className="spin" size={26} color="#f59e0b" />
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Analyzing store sales & products...</span>
                </div>
            ) : activeSubTab === 'items' ? (
                /* ── Table: Frequently Sold Items ────────────────────────────────── */
                <div style={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
                                    <th style={{ padding: '10px 12px', width: '50px' }}># Rank</th>
                                    <th style={{ padding: '10px 12px' }}>Item Description</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Total Qty Sold</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Times Billed</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Revenue</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Avg Rate</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Price Range</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Last Sold</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rankedItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                            No POS sales items found for the selected period.
                                        </td>
                                    </tr>
                                ) : (
                                    rankedItems.map((item, idx) => (
                                        <tr key={item.key} style={{
                                            borderBottom: '1px solid var(--border-primary)',
                                            transition: 'background-color 0.15s'
                                        }} className="interactive-table-row">
                                            <td style={{ padding: '10px 12px', fontWeight: 700, color: idx < 3 ? '#f59e0b' : 'var(--text-tertiary)' }}>
                                                {idx + 1}
                                            </td>
                                            <td style={{ padding: '10px 12px' }}>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {item.description}
                                                </div>
                                            </td>
                                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                                    color: '#f59e0b',
                                                    fontWeight: 700,
                                                    fontSize: '11px'
                                                }}>
                                                    {item.totalQty} {item.unit}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                {item.timesBilled} {item.timesBilled === 1 ? 'bill' : 'bills'}
                                            </td>
                                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                                                ₹{item.totalRevenue.toLocaleString('en-IN')}
                                            </td>
                                            <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600 }}>
                                                ₹{Math.round(item.avgRate).toLocaleString('en-IN')}
                                            </td>
                                            <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '11px' }}>
                                                {item.minRate === item.maxRate 
                                                    ? `₹${item.minRate}` 
                                                    : `₹${item.minRate} – ₹${item.maxRate}`}
                                            </td>
                                            <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '11px' }}>
                                                {item.lastSoldDate ? new Date(item.lastSoldDate).toLocaleDateString('en-GB') : '—'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* ── Table: POS Invoices Log ─────────────────────────────────────── */
                <div style={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
                                    <th style={{ padding: '10px 12px' }}>Invoice #</th>
                                    <th style={{ padding: '10px 12px' }}>Date</th>
                                    <th style={{ padding: '10px 12px' }}>Customer / Account</th>
                                    <th style={{ padding: '10px 12px' }}>Items Summary</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Amount</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Payment</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                            No POS invoices recorded for the selected period.
                                        </td>
                                    </tr>
                                ) : (
                                    invoices.map(inv => {
                                        const matchingReceipt = receipts.find(r => r.reference_number === inv.invoice_number);
                                        const mode = matchingReceipt?.payment_mode || (inv.account_name?.toLowerCase().includes('cash') ? 'Cash' : 'UPI');

                                        const itemsSummary = (Array.isArray(inv.items) ? inv.items : []).map(it => 
                                            `${it.description || 'Item'} × ${it.qty || 1}`
                                        ).join(', ');

                                        return (
                                            <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
                                                    {inv.invoice_number}
                                                </td>
                                                <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                                                    {inv.date ? new Date(inv.date).toLocaleDateString('en-GB') : '—'}
                                                </td>
                                                <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {inv.account_name || 'Walk-in Customer'}
                                                </td>
                                                <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={itemsSummary}>
                                                    {itemsSummary || '1 item'}
                                                </td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                                                    ₹{Number(inv.total_amount || 0).toLocaleString('en-IN')}
                                                </td>
                                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        backgroundColor: mode.toLowerCase() === 'cash' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(96, 165, 250, 0.15)',
                                                        color: mode.toLowerCase() === 'cash' ? '#34d399' : '#60a5fa'
                                                    }}>
                                                        {mode}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => {
                                                            const baseUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '';
                                                            window.open(`${baseUrl}/print?type=sales&id=${inv.id}`, '_blank');
                                                        }}
                                                        style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--border-primary)',
                                                            backgroundColor: 'var(--bg-secondary)',
                                                            color: 'var(--text-primary)',
                                                            fontSize: '11px',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                        title="Print Invoice / Thermal Receipt"
                                                    >
                                                        <Printer size={12} />
                                                        <span>Print</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
