'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Briefcase, CheckCircle, TrendingUp, DollarSign, Activity, Loader2, Calendar, Store, Smartphone, Landmark } from 'lucide-react';
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

const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    try {
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    } catch {
        return dateStr;
    }
};

export default function DashboardLivePerformance() {
    const [technicians, setTechnicians] = useState([]);
    const [selectedTechId, setSelectedTechId] = useState('all'); // 'all' | 'store_pos' | tech.id
    const [loading, setLoading] = useState(true);

    // Date Filtering: 'today' | 'yesterday' | 'custom'
    const [datePreset, setDatePreset] = useState('today');
    const [customDate, setCustomDate] = useState(() => getISTDateString(new Date()));

    const todayStr = getISTDateString(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = getISTDateString(yesterdayDate);

    const activeDateStr = datePreset === 'today' 
        ? todayStr 
        : datePreset === 'yesterday' 
            ? yesterdayStr 
            : (customDate || todayStr);

    const [metrics, setMetrics] = useState({
        combined: { 
            revenue: 0, 
            fieldRevenue: 0, 
            storeRevenue: 0, 
            assigned: 0, 
            closed: 0, 
            onJob: 0, 
            visits: 0, 
            upi: 0, 
            cash: 0,
            storeBillsCount: 0 
        },
        storePOS: { 
            revenue: 0, 
            billsCount: 0, 
            itemsCount: 0, 
            upi: 0, 
            cash: 0, 
            avgBill: 0 
        },
        byTech: {}
    });

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch active technicians
            const { data: techs, error: techsErr } = await supabase
                .from('technicians')
                .select('id, name, is_fired')
                .eq('is_active', true)
                .order('name', { ascending: true });

            if (techsErr) throw techsErr;
            const activeTechs = (techs || []).filter(t => !t.is_fired);
            setTechnicians(activeTechs);

            const targetDateStr = activeDateStr;

            // Compute UTC ISO timestamps for the beginning and end of target date in IST
            const [y, m, d] = targetDateStr.split('-').map(Number);
            const startIST = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
            const startOfDateISO = new Date(startIST.getTime() - (5.5 * 3600000)).toISOString();
            const endIST = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
            const endOfDateISO = new Date(endIST.getTime() - (5.5 * 3600000)).toISOString();

            // Fetch jobs, sales invoices, and receipts concurrently
            const [jobsRes, invoicesRes, receiptsRes] = await Promise.all([
                supabase
                    .from('jobs')
                    .select('id, technician_id, status, arrived_at, completed_at, scheduled_date')
                    .or(`scheduled_date.eq.${targetDateStr},and(completed_at.gte.${startOfDateISO},completed_at.lte.${endOfDateISO}),and(arrived_at.gte.${startOfDateISO},arrived_at.lte.${endOfDateISO})`),
                supabase
                    .from('sales_invoices')
                    .select('id, invoice_number, total_amount, technician_id, technician_name, status, date, notes, account_name, items')
                    .eq('date', targetDateStr)
                    .neq('status', 'cancelled'),
                supabase
                    .from('receipt_vouchers')
                    .select('id, amount, payment_mode, account_name, reference_number, narration, job_id, created_by, date, status')
                    .eq('date', targetDateStr)
                    .neq('status', 'cancelled')
            ]);

            const jobs = jobsRes.data || [];
            const invoices = invoicesRes.data || [];
            const receipts = receiptsRes.data || [];

            // Initialize technician stats
            const byTech = {};
            activeTechs.forEach(t => {
                byTech[t.id] = {
                    name: t.name,
                    revenue: 0,
                    assigned: 0,
                    closed: 0,
                    onJob: 0,
                    visits: 0,
                    upi: 0,
                    cash: 0
                };
            });

            // 1. Populate Job metrics
            jobs.forEach(job => {
                const techId = job.technician_id;
                if (!byTech[techId]) return;

                // Jobs Assigned: scheduled for this date
                if (job.scheduled_date === targetDateStr) {
                    byTech[techId].assigned++;
                }

                // Visits: arrived on this date in IST
                if (job.arrived_at) {
                    const arrDate = getISTDateString(new Date(job.arrived_at));
                    if (arrDate === targetDateStr) {
                        byTech[techId].visits++;
                    }
                }

                // Closed: completed on this date in IST
                if (job.status === 'closed' && job.completed_at) {
                    const compDate = getISTDateString(new Date(job.completed_at));
                    if (compDate === targetDateStr) {
                        byTech[techId].closed++;
                    }
                }

                // Currently on Job
                if (targetDateStr === todayStr && job.arrived_at && !job.completed_at && job.status !== 'closed' && job.status !== 'cancelled') {
                    byTech[techId].onJob++;
                }
            });

            // 2. Separate Store POS Invoices vs Field Invoices
            const storePOS = {
                revenue: 0,
                billsCount: 0,
                itemsCount: 0,
                upi: 0,
                cash: 0,
                avgBill: 0,
                invoices: []
            };

            const posInvoiceNumbers = new Set();

            invoices.forEach(inv => {
                const isPOS = (inv.notes && inv.notes.toLowerCase().includes('pos')) || (!inv.technician_id && !inv.job_id);
                const amt = parseFloat(inv.total_amount || 0);

                if (isPOS) {
                    storePOS.revenue += amt;
                    storePOS.billsCount++;
                    posInvoiceNumbers.add(inv.invoice_number);
                    storePOS.invoices.push(inv);

                    if (Array.isArray(inv.items)) {
                        inv.items.forEach(it => {
                            storePOS.itemsCount += (Number(it.qty) || 1);
                        });
                    }
                } else {
                    const techId = inv.technician_id;
                    if (byTech[techId]) {
                        byTech[techId].revenue += amt;
                    }
                }
            });

            // 3. Process Receipts for UPI vs Cash split
            let fieldUPI = 0;
            let fieldCash = 0;
            let storeUPI = 0;
            let storeCash = 0;

            const jobTechMap = {};
            jobs.forEach(j => {
                if (j.id && j.technician_id) jobTechMap[j.id] = j.technician_id;
            });

            const invoiceTechMap = {};
            invoices.forEach(inv => {
                if (inv.invoice_number && inv.technician_id) invoiceTechMap[inv.invoice_number] = inv.technician_id;
            });

            receipts.forEach(r => {
                const amt = parseFloat(r.amount || 0);
                const mode = (r.payment_mode || '').toLowerCase();
                const accName = (r.account_name || '').toLowerCase();
                const narr = (r.narration || '').toLowerCase();

                const isCash = mode === 'cash' || accName.includes('cash') || narr.includes('(cash)');
                const isUPI = mode === 'upi' || mode.includes('gpay') || accName.includes('google pay') || accName.includes('gpay') || narr.includes('(upi)');

                const isStoreReceipt = (r.reference_number && posInvoiceNumbers.has(r.reference_number)) ||
                                       narr.includes('store pos') ||
                                       (accName.includes('google pay business clearing') && !r.job_id && !r.created_by);

                if (isStoreReceipt) {
                    if (isCash) storeCash += amt;
                    else if (isUPI) storeUPI += amt;
                } else {
                    if (isCash) fieldCash += amt;
                    else if (isUPI) fieldUPI += amt;

                    // Attribute to technician
                    let matchedTechId = null;
                    if (r.job_id && jobTechMap[r.job_id]) {
                        matchedTechId = jobTechMap[r.job_id];
                    } else if (r.reference_number && invoiceTechMap[r.reference_number]) {
                        matchedTechId = invoiceTechMap[r.reference_number];
                    } else if (r.created_by) {
                        const matchedTech = activeTechs.find(t => 
                            t.id === r.created_by || 
                            t.name.toLowerCase() === r.created_by.toLowerCase()
                        );
                        if (matchedTech) matchedTechId = matchedTech.id;
                    }

                    if (!matchedTechId && r.narration) {
                        const match = r.narration.match(/Collected by (.*?)(?:\(|$)/i);
                        if (match && match[1]) {
                            const collName = match[1].trim().toLowerCase();
                            const matchedTech = activeTechs.find(t => 
                                t.name.toLowerCase() === collName || 
                                collName.includes(t.name.toLowerCase())
                            );
                            if (matchedTech) matchedTechId = matchedTech.id;
                        }
                    }

                    if (matchedTechId && byTech[matchedTechId]) {
                        if (isCash) byTech[matchedTechId].cash += amt;
                        else if (isUPI) byTech[matchedTechId].upi += amt;
                    }
                }
            });

            // Defensive check for Store POS: if receipt amounts didn't match invoices, infer from invoice accounts
            if (storePOS.revenue > 0 && (storeUPI + storeCash) < storePOS.revenue) {
                let inferredUPI = 0;
                let inferredCash = 0;
                storePOS.invoices.forEach(inv => {
                    const acc = (inv.account_name || '').toLowerCase();
                    const amt = parseFloat(inv.total_amount || 0);
                    if (acc.includes('cash')) inferredCash += amt;
                    else inferredUPI += amt;
                });
                storeUPI = Math.max(storeUPI, inferredUPI);
                storeCash = Math.max(storeCash, inferredCash);
            }

            storePOS.upi = storeUPI;
            storePOS.cash = storeCash;
            storePOS.avgBill = storePOS.billsCount > 0 ? Math.round(storePOS.revenue / storePOS.billsCount) : 0;

            // Defensive check for Technicians: infer UPI/cash from invoice account if no receipts attributed
            activeTechs.forEach(t => {
                if (byTech[t.id].revenue > 0 && (byTech[t.id].upi + byTech[t.id].cash) === 0) {
                    let infUPI = 0;
                    let infCash = 0;
                    invoices.filter(inv => inv.technician_id === t.id).forEach(inv => {
                        const acc = (inv.account_name || '').toLowerCase();
                        const amt = parseFloat(inv.total_amount || 0);
                        if (acc.includes('cash')) infCash += amt;
                        else infUPI += amt;
                    });
                    if (infUPI + infCash > 0) {
                        byTech[t.id].upi = infUPI;
                        byTech[t.id].cash = infCash;
                    }
                }
            });

            // 4. Combined Metrics Calculation
            const fieldRevenue = Object.values(byTech).reduce((sum, t) => sum + t.revenue, 0);
            const totalCombinedRevenue = fieldRevenue + storePOS.revenue;
            const totalCombinedUPI = Math.max(fieldUPI + storeUPI, Object.values(byTech).reduce((sum, t) => sum + t.upi, 0) + storePOS.upi);
            const totalCombinedCash = Math.max(fieldCash + storeCash, Object.values(byTech).reduce((sum, t) => sum + t.cash, 0) + storePOS.cash);

            const combined = {
                revenue: totalCombinedRevenue,
                fieldRevenue,
                storeRevenue: storePOS.revenue,
                assigned: 0,
                closed: 0,
                onJob: 0,
                visits: 0,
                upi: totalCombinedUPI,
                cash: totalCombinedCash,
                storeBillsCount: storePOS.billsCount
            };

            Object.values(byTech).forEach(m => {
                combined.assigned += m.assigned;
                combined.closed += m.closed;
                combined.onJob += m.onJob;
                combined.visits += m.visits;
            });

            setMetrics({ combined, storePOS, byTech });
        } catch (e) {
            console.error('Error fetching dashboard performance metrics:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Auto-refresh every 60s if viewing today
        if (datePreset === 'today') {
            const interval = setInterval(fetchData, 60_000);
            return () => clearInterval(interval);
        }
    }, [activeDateStr]);

    // Handle Date Preset Switch
    const handlePresetChange = (preset) => {
        setDatePreset(preset);
        if (preset === 'today') {
            setCustomDate(todayStr);
        } else if (preset === 'yesterday') {
            setCustomDate(yesterdayStr);
        }
    };

    // Prepare active cards based on dropdown selection (8 cards across all states)
    let cardData = [];

    if (selectedTechId === 'store_pos') {
        const sp = metrics.storePOS;
        cardData = [
            {
                label: 'Total Revenue',
                value: `₹${(sp.revenue || 0).toLocaleString('en-IN')}`,
                icon: DollarSign,
                color: '#10b981'
            },
            {
                label: 'Field Revenue',
                value: '₹0',
                icon: Briefcase,
                color: '#0ea5e9'
            },
            {
                label: 'Store Revenue',
                value: `₹${(sp.revenue || 0).toLocaleString('en-IN')}`,
                icon: Store,
                color: '#f59e0b'
            },
            {
                label: 'UPI Revenue',
                value: `₹${(sp.upi || 0).toLocaleString('en-IN')}`,
                icon: Smartphone,
                color: '#6366f1'
            },
            {
                label: 'Cash Revenue',
                value: `₹${(sp.cash || 0).toLocaleString('en-IN')}`,
                icon: Landmark,
                color: '#14b8a6'
            },
            {
                label: 'Jobs Assigned',
                value: 0,
                icon: Calendar,
                color: '#3b82f6'
            },
            {
                label: 'Visits Done',
                value: 0,
                icon: TrendingUp,
                color: '#f97316'
            },
            {
                label: 'Jobs Closed',
                value: sp.billsCount || 0,
                icon: CheckCircle,
                color: '#8b5cf6',
                subText: sp.billsCount > 0 ? `${sp.billsCount} bills` : undefined
            }
        ];
    } else if (selectedTechId === 'all') {
        const comb = metrics.combined;
        cardData = [
            {
                label: 'Total Revenue',
                value: `₹${(comb.revenue || 0).toLocaleString('en-IN')}`,
                icon: DollarSign,
                color: '#10b981'
            },
            {
                label: 'Field Revenue',
                value: `₹${(comb.fieldRevenue || 0).toLocaleString('en-IN')}`,
                icon: Briefcase,
                color: '#0ea5e9'
            },
            {
                label: 'Store Revenue',
                value: `₹${(comb.storeRevenue || 0).toLocaleString('en-IN')}`,
                icon: Store,
                color: '#f59e0b'
            },
            {
                label: 'UPI Revenue',
                value: `₹${(comb.upi || 0).toLocaleString('en-IN')}`,
                icon: Smartphone,
                color: '#6366f1'
            },
            {
                label: 'Cash Revenue',
                value: `₹${(comb.cash || 0).toLocaleString('en-IN')}`,
                icon: Landmark,
                color: '#14b8a6'
            },
            {
                label: 'Jobs Assigned',
                value: comb.assigned || 0,
                icon: Calendar,
                color: '#3b82f6'
            },
            {
                label: 'Visits Done',
                value: comb.visits || 0,
                icon: TrendingUp,
                color: '#f97316'
            },
            {
                label: 'Jobs Closed',
                value: comb.closed || 0,
                icon: CheckCircle,
                color: '#8b5cf6',
                subText: comb.storeBillsCount > 0 ? `+${comb.storeBillsCount} bills` : undefined
            }
        ];
    } else {
        const tMetrics = metrics.byTech[selectedTechId] || { revenue: 0, assigned: 0, closed: 0, onJob: 0, visits: 0, upi: 0, cash: 0 };
        cardData = [
            {
                label: 'Total Revenue',
                value: `₹${(tMetrics.revenue || 0).toLocaleString('en-IN')}`,
                icon: DollarSign,
                color: '#10b981'
            },
            {
                label: 'Field Revenue',
                value: `₹${(tMetrics.revenue || 0).toLocaleString('en-IN')}`,
                icon: Briefcase,
                color: '#0ea5e9'
            },
            {
                label: 'Store Revenue',
                value: '₹0',
                icon: Store,
                color: '#f59e0b'
            },
            {
                label: 'UPI Revenue',
                value: `₹${(tMetrics.upi || 0).toLocaleString('en-IN')}`,
                icon: Smartphone,
                color: '#6366f1'
            },
            {
                label: 'Cash Revenue',
                value: `₹${(tMetrics.cash || 0).toLocaleString('en-IN')}`,
                icon: Landmark,
                color: '#14b8a6'
            },
            {
                label: 'Jobs Assigned',
                value: tMetrics.assigned || 0,
                icon: Calendar,
                color: '#3b82f6'
            },
            {
                label: 'Visits Done',
                value: tMetrics.visits || 0,
                icon: TrendingUp,
                color: '#f97316'
            },
            {
                label: 'Jobs Closed',
                value: tMetrics.closed || 0,
                icon: CheckCircle,
                color: '#8b5cf6'
            }
        ];
    }

    const titleText = datePreset === 'today' 
        ? "Today's Live Performance" 
        : datePreset === 'yesterday' 
            ? "Yesterday's Performance" 
            : `Performance for ${formatDisplayDate(activeDateStr)}`;

    return (
        <div style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        }}>
            {/* Header: Title & Controls */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                {/* Top Row: Title + Date Filter Buttons */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {datePreset === 'today' ? '⚡' : '📅'} {titleText}
                        </span>
                        {datePreset === 'today' && (
                            <span style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                backgroundColor: '#10b981',
                                boxShadow: '0 0 6px #10b981',
                                display: 'inline-block'
                            }} title="Live auto-refresh active" />
                        )}
                    </div>

                    {/* Date Toggle Pills */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: 'var(--bg-secondary)',
                        padding: '2px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-primary)',
                        gap: '2px'
                    }}>
                        <button
                            type="button"
                            onClick={() => handlePresetChange('today')}
                            style={{
                                padding: '4px 9px',
                                fontSize: '11px',
                                fontWeight: datePreset === 'today' ? 700 : 500,
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: datePreset === 'today' ? 'var(--color-primary, #6366f1)' : 'transparent',
                                color: datePreset === 'today' ? '#ffffff' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            Today
                        </button>

                        <button
                            type="button"
                            onClick={() => handlePresetChange('yesterday')}
                            style={{
                                padding: '4px 9px',
                                fontSize: '11px',
                                fontWeight: datePreset === 'yesterday' ? 700 : 500,
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: datePreset === 'yesterday' ? 'var(--color-primary, #6366f1)' : 'transparent',
                                color: datePreset === 'yesterday' ? '#ffffff' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            Yesterday
                        </button>

                        <button
                            type="button"
                            onClick={() => handlePresetChange('custom')}
                            style={{
                                padding: '4px 9px',
                                fontSize: '11px',
                                fontWeight: datePreset === 'custom' ? 700 : 500,
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: datePreset === 'custom' ? 'var(--color-primary, #6366f1)' : 'transparent',
                                color: datePreset === 'custom' ? '#ffffff' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            Custom
                        </button>
                    </div>
                </div>

                {/* Sub Row: Custom Date Input (if active) + Dropdown Selector + Action Buttons */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: '1 1 200px' }}>
                        {datePreset === 'custom' && (
                            <input
                                type="date"
                                value={customDate}
                                onChange={(e) => setCustomDate(e.target.value)}
                                style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-primary)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            />
                        )}

                        {/* Dropdown with Combined, Store POS, and Technicians */}
                        <select
                            value={selectedTechId}
                            onChange={(e) => setSelectedTechId(e.target.value)}
                            style={{
                                padding: '5px 8px',
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                cursor: 'pointer',
                                minWidth: '160px',
                                maxWidth: '100%',
                                flex: '1 1 auto'
                            }}
                        >
                            <option value="all">⚡ All (Combined: Field + Store)</option>
                            <option value="store_pos">🏪 Store POS Sales</option>
                            <optgroup label="Field Technicians">
                                {technicians.map(t => (
                                    <option key={t.id} value={t.id}>🔧 {t.name}</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>

                    {/* Action buttons: Field Detail & Store Detail */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <button
                            type="button"
                            onClick={() => {
                                if (typeof window.openPerformanceTracking === 'function') {
                                    window.openPerformanceTracking('job_details');
                                }
                            }}
                            style={{
                                padding: '5px 9px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--color-primary)';
                                e.currentTarget.style.color = 'var(--color-primary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--border-primary)';
                                e.currentTarget.style.color = 'var(--text-primary)';
                            }}
                        >
                            Field Detail ›
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                if (typeof window.openStorePOSReport === 'function') {
                                    window.openStorePOSReport();
                                }
                            }}
                            style={{
                                padding: '5px 9px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                                color: '#f59e0b',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#f59e0b';
                                e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--border-primary)';
                                e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.08)';
                            }}
                        >
                            Store Detail ›
                        </button>
                    </div>
                </div>
            </div>

            {/* Metrics Cards Grid */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '90px', color: 'var(--text-secondary)' }}>
                    <Loader2 className="spin" size={18} style={{ marginRight: '8px' }} />
                    <span style={{ fontSize: '12px' }}>Gathering performance metrics...</span>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '8px'
                }}>
                    {cardData.map((card, idx) => {
                        const Icon = card.icon;

                        return (
                            <div key={idx} style={{
                                padding: '8px 10px',
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '4px',
                                minHeight: '56px',
                                position: 'relative'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                                    <span style={{
                                        fontSize: '9.5px',
                                        color: 'var(--text-secondary)',
                                        textTransform: 'uppercase',
                                        fontWeight: 600,
                                        letterSpacing: '0.3px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {card.label}
                                    </span>
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '5px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: `${card.color}18`,
                                        color: card.color,
                                        flexShrink: 0
                                    }}>
                                        <Icon size={12} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2px' }}>
                                    <div style={{
                                        fontSize: '16px',
                                        fontWeight: 800,
                                        color: 'var(--text-primary)',
                                        letterSpacing: '-0.02em',
                                        lineHeight: 1.15
                                    }}>
                                        {card.value}
                                    </div>

                                    {card.subText && (
                                        <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                                            {card.subText}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
