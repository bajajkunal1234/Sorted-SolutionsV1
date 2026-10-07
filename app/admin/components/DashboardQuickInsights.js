'use client'

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    TrendingUp, 
    TrendingDown, 
    Users, 
    Calendar, 
    Package, 
    DollarSign, 
    FileText, 
    ArrowUpRight, 
    Map, 
    Plus, 
    AlertCircle, 
    Loader2,
    Store,
    CalendarCheck,
    CalendarClock,
    Building2,
    Phone,
    CheckSquare,
    MapPin
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/accountingHelpers';

export default function DashboardQuickInsights() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState({
        leads: { 
            total: 0, 
            monthName: 'Oct',
            paidMonth: 0,
            googleMonth: 0,
            justdialMonth: 0,
            organicMonth: 0,
            paidToday: 0, 
            googleToday: 0, 
            justdialToday: 0, 
            organicToday: 0, 
            organic7Days: 0, 
            manual: 0, 
            last7Days: [] 
        },
        daybook: { moneyIn: 0, moneyOut: 0 },
        cashReceipts: { count: 0, total: 0, byTech: {} },
        rentals: { active: 0, rentDue: 0 },
        jobs: { scheduled: 0, techOpenCounts: [] },
        kunalActiveTags: [],
        planner: { todayActivities: [] }
    });

    const getISTTodayDateStrings = () => {
        const localDate = new Date();
        const utcTime = localDate.getTime() + (localDate.getTimezoneOffset() * 60000);
        const nowIST = new Date(utcTime + (3600000 * 5.5));
        const year = nowIST.getFullYear();
        const month = String(nowIST.getMonth() + 1).padStart(2, '0');
        const day = String(nowIST.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        const startOfTodayIST = new Date(nowIST);
        startOfTodayIST.setHours(0, 0, 0, 0);
        const startOfTodayUTC = new Date(startOfTodayIST.getTime() - (3600000 * 5.5));
        const startOfTodayISO = startOfTodayUTC.toISOString();

        // 7 days ago in IST
        const startOfLast7DaysIST = new Date(nowIST);
        startOfLast7DaysIST.setDate(startOfLast7DaysIST.getDate() - 6);
        startOfLast7DaysIST.setHours(0, 0, 0, 0);
        const startOfLast7DaysUTC = new Date(startOfLast7DaysIST.getTime() - (3600000 * 5.5));
        const startOfLast7DaysISO = startOfLast7DaysUTC.toISOString();

        const l7Year = startOfLast7DaysIST.getFullYear();
        const l7Month = String(startOfLast7DaysIST.getMonth() + 1).padStart(2, '0');
        const l7Day = String(startOfLast7DaysIST.getDate()).padStart(2, '0');
        const startOfLast7DaysYMD = `${l7Year}-${l7Month}-${l7Day}`;

        return { todayStr, startOfTodayISO, startOfLast7DaysISO, startOfLast7DaysYMD, nowIST };
    };

    const fetchInsights = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            setError(null);
            
            const { todayStr } = getISTTodayDateStrings();

            // Run API fetch for leads and marketing spends securely from the backend to bypass client-side RLS block
            const leadsMetricsPromise = fetch('/api/admin/dashboard/leads-metrics')
                .then(r => r.json())
                .catch(err => {
                    console.error('[DashboardQuickInsights] Failed to fetch leads metrics:', err);
                    return { total: 0, monthName: 'Oct', paidMonth: 0, googleMonth: 0, justdialMonth: 0, organicMonth: 0, paidToday: 0, googleToday: 0, justdialToday: 0, organicToday: 0, organic7Days: 0, manual: 0, last7Days: [] };
                });

            // Fetch Day Planner activities for today
            const plannerPromise = fetch(`/api/admin/planner?date=${todayStr}`)
                .then(r => r.json())
                .catch(err => {
                    console.error('[DashboardQuickInsights] Failed to fetch planner activities:', err);
                    return { success: false, data: [] };
                });

            // Run database queries concurrently
            const [
                leadsMetrics,
                plannerRes,
                receiptsRes,
                paymentsRes,
                cashReceiptsRes,
                rentalsRes,
                jobsRes,
                techsRes,
                viewsRes
            ] = await Promise.all([
                leadsMetricsPromise,
                plannerPromise,

                // 2. Today's Daybook In (Receipts)
                supabase
                    .from('receipt_vouchers')
                    .select('amount')
                    .eq('date', todayStr),
                
                // 3. Today's Daybook Out (Payments)
                supabase
                    .from('payment_vouchers')
                    .select('amount')
                    .eq('date', todayStr),
 
                // 4. Cash collections pending verification
                supabase
                    .from('receipt_vouchers')
                    .select('amount, created_by')
                    .in('status', ['pending_verification', 'draft'])
                    .ilike('payment_mode', 'cash'),
 
                // 5. Active Rentals
                supabase
                    .from('active_rentals')
                    .select('next_rent_due_date, status')
                    .neq('status', 'archived'),
 
                // 6. Open & Scheduled Jobs
                supabase
                    .from('jobs')
                    .select('id, scheduled_date, technician_id, status')
                    .neq('status', 'closed')
                    .neq('status', 'cancelled'),
 
                // 7. Active Technicians
                supabase
                    .from('technicians')
                    .select('id, name')
                    .eq('is_active', true)
                    .eq('is_fired', false),
 
                // 8. Saved Job Views
                supabase
                    .from('website_settings')
                    .select('value')
                    .eq('key', 'admin_jobs_views')
                    .maybeSingle()
            ]);

            const receiptsSum = (receiptsRes.data || []).reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
            const paymentsSum = (paymentsRes.data || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

            const pendingCash = cashReceiptsRes.data || [];
            const pendingCashCount = pendingCash.length;
            const pendingCashSum = pendingCash.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
            
            const cashByTech = {};
            pendingCash.forEach(r => {
                const name = r.created_by || 'Unknown';
                cashByTech[name] = (cashByTech[name] || 0) + (parseFloat(r.amount) || 0);
            });

            const activeRentalsCount = (rentalsRes.data || []).length;
            const overdueRentalsCount = (rentalsRes.data || []).filter(r => r.next_rent_due_date && new Date(r.next_rent_due_date) < new Date()).length;

            const jobs = jobsRes.data || [];
            const scheduledTodayCount = jobs.filter(j => j.scheduled_date === todayStr).length;

            // Technician open counts mapping
            const techs = techsRes.data || [];
            const techMap = {};
            techs.forEach(t => { techMap[t.id] = t.name; });

            const jobCountsByTech = {};
            jobs.forEach(job => {
                if (job.technician_id && techMap[job.technician_id]) {
                    jobCountsByTech[job.technician_id] = (jobCountsByTech[job.technician_id] || 0) + 1;
                }
            });

            const techOpenCounts = techs.map(t => ({
                id: t.id,
                name: t.name,
                count: jobCountsByTech[t.id] || 0
            })).filter(tc => tc.count > 0).sort((a, b) => b.count - a.count);

            // Lookup Kunal's open calls saved view filter tags
            let kunalTags = [];
            const savedViews = viewsRes.data?.value || [];
            const kunalView = savedViews.find(v => v.name === 'Kunal’s open calls' || v.name === 'Kunal View');
            if (kunalView && kunalView.config?.activeTags) {
                kunalTags = kunalView.config.activeTags;
            } else {
                // Fallback to active assignee Kunal filter tag config
                kunalTags = [
                    {
                        id: "custom_fallback_kunal",
                        type: "custom",
                        label: 'Assignee contains "Kunal"',
                        conditions: [
                            {
                                id: 999999,
                                field: "assignee",
                                value: "Kunal",
                                operator: "contains"
                            }
                        ]
                    }
                ];
            }

            const todayActivities = (plannerRes && plannerRes.success && Array.isArray(plannerRes.data))
                ? plannerRes.data
                : [];

            setData({
                leads: { 
                    total: leadsMetrics.total || 0,
                    monthName: leadsMetrics.monthName || 'Oct',
                    paidMonth: leadsMetrics.paidMonth || 0,
                    googleMonth: leadsMetrics.googleMonth || 0,
                    justdialMonth: leadsMetrics.justdialMonth || 0,
                    organicMonth: leadsMetrics.organicMonth || 0,
                    paidToday: leadsMetrics.paidToday || 0,
                    googleToday: leadsMetrics.googleToday || 0,
                    justdialToday: leadsMetrics.justdialToday || 0,
                    organicToday: leadsMetrics.organicToday || 0,
                    organic7Days: leadsMetrics.organic7Days || 0,
                    manual: leadsMetrics.manual || 0,
                    last7Days: leadsMetrics.last7Days || []
                },
                daybook: { moneyIn: receiptsSum, moneyOut: paymentsSum },
                cashReceipts: { count: pendingCashCount, total: pendingCashSum, byTech: cashByTech },
                rentals: { active: activeRentalsCount, rentDue: overdueRentalsCount },
                jobs: { scheduled: scheduledTodayCount, techOpenCounts },
                kunalActiveTags: kunalTags,
                planner: { todayActivities }
            });

        } catch (err) {
            console.error('Failed to load Quick Insights:', err);
            setError('Failed to load quick insights data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleRefresh = () => {
            console.log('[DashboardQuickInsights] Resume/focus detected, background refreshing dashboard...');
            fetchInsights(true); // silent refresh
        };
        window.addEventListener('refresh-active-tab', handleRefresh);
        return () => window.removeEventListener('refresh-active-tab', handleRefresh);
    }, []);

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const parts = timeStr.split(':');
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1] || '0', 10);
        if (isNaN(h)) return timeStr;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour = h % 12 || 12;
        return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
    };

    const formatActivityAmount = (amount) => {
        if (!amount) return '₹0';
        const num = Math.round(parseFloat(amount));
        return `₹${num.toLocaleString('en-IN')}`;
    };

    const todayActivities = data.planner?.todayActivities || [];
    const pendingActivitiesCount = todayActivities.filter(a => a.status !== 'completed').length;
    const completedActivitiesCount = todayActivities.length - pendingActivitiesCount;

    const sortedActivities = useMemo(() => {
        const list = [...todayActivities];
        return list.sort((a, b) => {
            if (a.status === 'completed' && b.status !== 'completed') return 1;
            if (a.status !== 'completed' && b.status === 'completed') return -1;
            return 0;
        });
    }, [todayActivities]);

    if (loading) {
        return (
            <div style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', gap: 8 }}>
                <Loader2 className="spin" size={24} color="#6366f1" />
                <span style={{ fontSize: 13, color: '#64748b' }}>Refreshing quick insights...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: 16, textAlign: 'center', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: 14, border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: 13 }}>
                <AlertCircle size={20} style={{ margin: '0 auto 6px auto' }} />
                <span>{error}</span>
                <button onClick={fetchInsights} style={{ display: 'block', margin: '8px auto 0 auto', padding: '4px 10px', fontSize: 11, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 4, color: 'white', cursor: 'pointer' }}>Retry</button>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            
            {/* Column 1: Financial & Sales Flow */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                
                {/* 1. Leads & Rentals Card */}
                <div style={{
                    padding: 14,
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 6 }}>
                        <TrendingUp size={16} color="#10b981" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Leads & Acquisition</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div 
                            onClick={() => window.openWebsiteAnalyticsLeadsTracker && window.openWebsiteAnalyticsLeadsTracker()}
                            style={{ padding: 10, background: 'rgba(255,255,255,0.02)', borderRadius: 8, cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.15s' }}
                            className="interactive-metric-card"
                            title={`Open Paid Leads & ROI Tracker (Google & Justdial) · ${data.leads.paidToday || 0} today`}
                        >
                            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Paid Leads in {data.leads.monthName || 'Oct'}</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 2 }}>{data.leads.paidMonth ?? 0}</div>
                            <div style={{ fontSize: 9, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                <span style={{ color: (data.leads.googleMonth || 0) > 0 ? '#60a5fa' : '#94a3b8', fontWeight: 600 }}>{data.leads.googleMonth || 0} Google</span>
                                <span style={{ color: '#64748b' }}>•</span>
                                <span style={{ color: (data.leads.justdialMonth || 0) > 0 ? '#f59e0b' : '#94a3b8', fontWeight: 600 }}>{data.leads.justdialMonth || 0} Justdial</span>
                            </div>
                        </div>

                        <div 
                            onClick={() => window.openWebsiteAnalyticsLeadsTracker && window.openWebsiteAnalyticsLeadsTracker()}
                            style={{ padding: 10, background: 'rgba(255,255,255,0.02)', borderRadius: 8, cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.15s' }}
                            className="interactive-metric-card"
                            title={`Open Organic & Direct Leads Tracker · ${data.leads.organicToday || 0} today`}
                        >
                            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Organic Leads in {data.leads.monthName || 'Oct'}</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 2 }}>{data.leads.organicMonth ?? 0}</div>
                            <div style={{ fontSize: 9, color: '#10b981', display: 'flex', alignItems: 'center', gap: 2, marginTop: 4 }}>
                                <span>🌱 Direct, web & referrals</span>
                            </div>
                        </div>
                    </div>

                    {/* 7-day trend breakdown */}
                    {data.leads.last7Days && data.leads.last7Days.length > 0 && (
                        <div style={{ 
                            borderTop: '1px solid rgba(255,255,255,0.04)', 
                            paddingTop: 8,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6
                        }}>
                            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, paddingBottom: 2 }}>
                                Past 7 Days Activity
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {data.leads.last7Days.map((day, idx) => (
                                    <div key={day.dateStr} style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between',
                                        fontSize: 11,
                                        color: '#e2e8f0',
                                        padding: '3px 6px',
                                        borderRadius: 4,
                                        backgroundColor: idx === 0 ? 'rgba(255,255,255,0.03)' : 'transparent'
                                    }} title={`${day.displayDate}: ${day.googleLeads || 0} Google, ${day.justdialLeads || 0} Justdial${(day.organicLeads || 0) > 0 ? `, ${day.organicLeads} Organic` : ''} · ₹${Math.round(day.spent || 0).toLocaleString('en-IN')} Google Ads spent`}>
                                        <span style={{ color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                            {day.displayDate} {idx === 0 && <span style={{ fontSize: 9, color: '#10b981', fontWeight: 600 }}>(Today)</span>}
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5 }}>
                                                <span style={{ 
                                                    color: (day.googleLeads || 0) > 0 ? '#60a5fa' : '#64748b', 
                                                    fontWeight: (day.googleLeads || 0) > 0 ? 600 : 400 
                                                }}>
                                                    {day.googleLeads || 0} Google
                                                </span>
                                                <span style={{ color: '#475569', fontSize: 9 }}>•</span>
                                                <span style={{ 
                                                    color: (day.justdialLeads || 0) > 0 ? '#f59e0b' : '#64748b', 
                                                    fontWeight: (day.justdialLeads || 0) > 0 ? 600 : 400 
                                                }}>
                                                    {day.justdialLeads || 0} Justdial
                                                </span>
                                            </div>
                                            <span style={{ 
                                                color: (day.spent || 0) > 0 ? '#fbcfe8' : '#64748b',
                                                fontSize: 10.5,
                                                fontWeight: (day.spent || 0) > 0 ? 600 : 400
                                            }}>
                                                ₹{Math.round(day.spent || 0).toLocaleString('en-IN')} spent
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Cash & Daily Flow Card */}
                <div style={{
                    padding: 14,
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 6 }}>
                        <DollarSign size={16} color="#3b82f6" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Cash & Daily Flow</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                        <div 
                            onClick={() => window.openDaybookReport && window.openDaybookReport()}
                            style={{ padding: 10, background: 'rgba(255,255,255,0.02)', borderRadius: 8, cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.15s' }}
                            className="interactive-metric-card"
                            title="Open Daybook Report"
                        >
                            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Today's Daybook</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                                    <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 2 }}>📥 In:</span>
                                    <span style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(data.daybook.moneyIn)}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                                    <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 2 }}>📤 Out:</span>
                                    <span style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(data.daybook.moneyOut)}</span>
                                </div>
                            </div>
                        </div>

                        <div 
                            onClick={() => window.openCustomerPaymentsReport && window.openCustomerPaymentsReport()}
                            style={{ padding: 10, background: 'rgba(255,255,255,0.02)', borderRadius: 8, cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.15s' }}
                            className="interactive-metric-card"
                            title="Open Customer Payments Pending Verification"
                        >
                            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Technician Cash</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6 }}>
                                {Object.keys(data.cashReceipts.byTech).length > 0 ? (
                                    Object.entries(data.cashReceipts.byTech).map(([tech, sum]) => (
                                        <div key={tech} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10 }}>
                                            <span style={{ color: '#94a3b8', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '90px' }}>{tech.split(' ')[0]}:</span>
                                            <span style={{ fontWeight: 700, color: '#fff' }}>{formatCurrency(sum)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 4 }}>{formatCurrency(0)}</div>
                                )}
                            </div>
                            <div style={{ fontSize: 9, color: data.cashReceipts.count > 0 ? '#f59e0b' : '#94a3b8', fontWeight: 600, marginTop: 4 }}>
                                {data.cashReceipts.count > 0 ? `⚠️ ${data.cashReceipts.count} pending verify` : '✓ Fully verified'}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Column 2: Operations & Command Shortcuts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                
                {/* 3. Quick Actions */}
                <div style={{
                    padding: 12,
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 6 }}>
                        <ArrowUpRight size={16} color="#f59e0b" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Quick Actions</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <button
                            onClick={() => window.openPOSModal && window.openPOSModal()}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                padding: '8px 10px',
                                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(234, 88, 12, 0.12))',
                                border: '1px solid rgba(245, 158, 11, 0.45)',
                                borderRadius: 8,
                                color: '#fbbf24',
                                fontSize: 10,
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                letterSpacing: '0.04em'
                            }}
                            className="dashboard-action-btn"
                        >
                            <Store size={13} />
                            <span>POS</span>
                        </button>

                        <button
                            onClick={() => {
                                if (window.openJobsSavedView) {
                                    window.openJobsSavedView('Kunal View', 'map');
                                } else if (window.openJobsMapWithFilter) {
                                    window.openJobsMapWithFilter(data.kunalActiveTags);
                                }
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                padding: '8px 10px',
                                background: 'rgba(56, 189, 248, 0.1)',
                                border: '1px solid rgba(56, 189, 248, 0.25)',
                                borderRadius: 8,
                                color: '#38bdf8',
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                            className="dashboard-action-btn"
                        >
                            <Map size={12} />
                            <span>KUNAL MAP VIEW</span>
                        </button>

                        <button
                            onClick={() => window.openCreatePaymentForm && window.openCreatePaymentForm()}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                padding: '8px 10px',
                                background: 'rgba(99, 102, 241, 0.1)',
                                border: '1px solid rgba(99, 102, 241, 0.25)',
                                borderRadius: 8,
                                color: '#818cf8',
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                            className="dashboard-action-btn"
                        >
                            <Plus size={12} />
                            <span>CREATE PAYMENT</span>
                        </button>

                        <button
                            onClick={() => window.openCreatePurchaseForm && window.openCreatePurchaseForm()}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                padding: '8px 10px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                borderRadius: 8,
                                color: '#10b981',
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                            className="dashboard-action-btn"
                        >
                            <Plus size={12} />
                            <span>CREATE PURCHASE</span>
                        </button>
                    </div>
                </div>

                {/* 4. Jobs & Dispatch Card */}
                <div style={{
                    padding: 12,
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={16} color="#6366f1" />
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Jobs & Dispatch</span>
                        </div>
                        <span style={{ fontSize: 10, background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                            {data.jobs.scheduled} Scheduled Today
                        </span>
                    </div>

                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Open jobs by technician:</div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, contentVisibility: 'auto' }}>
                        {data.jobs.techOpenCounts.length > 0 ? (
                            data.jobs.techOpenCounts.map(tc => (
                                <div 
                                    key={tc.id} 
                                    onClick={() => {
                                        if (window.openJobsMapWithFilter) {
                                            // Apply technician filter dynamically
                                            window.openJobsMapWithFilter([
                                                {
                                                    id: `tech_${tc.id}`,
                                                    type: "custom",
                                                    label: `Assignee contains "${tc.name}"`,
                                                    conditions: [
                                                        {
                                                            id: Date.now(),
                                                            field: "assignee",
                                                            value: tc.name,
                                                            operator: "contains"
                                                        }
                                                    ]
                                                }
                                            ]);
                                        }
                                    }}
                                    style={{
                                        padding: '4px 8px',
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.04)',
                                        borderRadius: 6,
                                        fontSize: 10,
                                        color: '#cbd5e1',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                    className="tech-open-count-badge"
                                >
                                    <span style={{ fontWeight: 500 }}>{tc.name}:</span>
                                    <span style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontWeight: 700, padding: '1px 4px', borderRadius: 4, fontSize: 9 }}>{tc.count}</span>
                                </div>
                            ))
                        ) : (
                            <div style={{ fontSize: 10, color: '#475569', fontStyle: 'italic', padding: '2px 0' }}>No active open jobs.</div>
                        )}
                    </div>
                </div>

                {/* 5. Activities for Today Card */}
                <div style={{
                    padding: 12,
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    flex: 1
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CalendarCheck size={16} color="#a855f7" />
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Activities for Today</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                                fontSize: 10,
                                background: pendingActivitiesCount > 0 ? 'rgba(168, 85, 247, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                color: pendingActivitiesCount > 0 ? '#c084fc' : '#34d399',
                                padding: '1px 6px',
                                borderRadius: 4,
                                fontWeight: 700
                            }}>
                                {todayActivities.length === 0 ? '0 Activities' : `${pendingActivitiesCount} Due${completedActivitiesCount > 0 ? ` • ${completedActivitiesCount} Done` : ''}`}
                            </span>
                            <button
                                onClick={() => window.openDayPlannerReport && window.openDayPlannerReport()}
                                title="Open Day Planner & Calendar"
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    fontSize: 10,
                                    fontWeight: 600,
                                    padding: '1px 4px',
                                    borderRadius: 4,
                                    transition: 'color 0.15s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
                                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                            >
                                Planner <ArrowUpRight size={11} />
                            </button>
                        </div>
                    </div>

                    {todayActivities.length === 0 ? (
                        <div 
                            onClick={() => window.openDayPlannerReport && window.openDayPlannerReport()}
                            style={{
                                padding: '20px 12px',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                cursor: 'pointer',
                                borderRadius: 8,
                                background: 'rgba(255,255,255,0.01)',
                                border: '1px dashed rgba(255,255,255,0.06)',
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                        >
                            <CalendarCheck size={20} color="#64748b" />
                            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
                                No activities or payments scheduled for today
                            </span>
                            <span style={{ fontSize: 10, color: '#a855f7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                                Schedule in Day Planner <ArrowUpRight size={11} />
                            </span>
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            maxHeight: 280,
                            overflowY: 'auto',
                            paddingRight: 2
                        }}>
                            {sortedActivities.map(act => {
                                const isCompleted = act.status === 'completed';
                                const isRental = Boolean(act.metadata?.is_rental || act.source === 'rental' || act.source === 'rental_contract_end');
                                const isContractEndCall = Boolean(act.metadata?.is_contract_end_call || act.source === 'rental_contract_end');
                                const isNewEra = Boolean(act.metadata?.is_newera || act.source === 'newera');
                                const isPayment = act.reminder_type === 'payment';
                                const isVisit = act.reminder_type === 'visit';
                                const direction = act.metadata?.direction || (isRental ? 'receivable' : (isNewEra ? 'payable' : 'payable'));
                                const isReceivable = direction === 'receivable';
                                const isPayable = direction === 'payable';

                                let badgeText = 'Task';
                                let badgeColor = '#38bdf8';
                                let badgeBg = 'rgba(56, 189, 248, 0.12)';
                                let badgeBorder = 'rgba(56, 189, 248, 0.25)';
                                let BadgeIcon = CheckSquare;

                                if (isContractEndCall) {
                                    badgeText = 'Call CX';
                                    badgeColor = '#f59e0b';
                                    badgeBg = 'rgba(245, 158, 11, 0.12)';
                                    badgeBorder = 'rgba(245, 158, 11, 0.25)';
                                    BadgeIcon = Phone;
                                } else if (isRental) {
                                    badgeText = 'Rent';
                                    badgeColor = '#10b981';
                                    badgeBg = 'rgba(16, 185, 129, 0.12)';
                                    badgeBorder = 'rgba(16, 185, 129, 0.25)';
                                    BadgeIcon = Building2;
                                } else if (isPayment && isReceivable) {
                                    badgeText = 'Receivable';
                                    badgeColor = '#10b981';
                                    badgeBg = 'rgba(16, 185, 129, 0.12)';
                                    badgeBorder = 'rgba(16, 185, 129, 0.25)';
                                    BadgeIcon = DollarSign;
                                } else if (isPayment && isPayable) {
                                    badgeText = isNewEra ? 'Liability' : 'Payable';
                                    badgeColor = '#ef4444';
                                    badgeBg = 'rgba(239, 68, 68, 0.12)';
                                    badgeBorder = 'rgba(239, 68, 68, 0.25)';
                                    BadgeIcon = DollarSign;
                                } else if (isVisit) {
                                    badgeText = 'Visit';
                                    badgeColor = '#a855f7';
                                    badgeBg = 'rgba(168, 85, 247, 0.12)';
                                    badgeBorder = 'rgba(168, 85, 247, 0.25)';
                                    BadgeIcon = MapPin;
                                }

                                const hasAmount = typeof act.amount === 'number' && act.amount > 0;
                                const formattedTime = formatTime(act.due_time);

                                return (
                                    <div
                                        key={act.id}
                                        onClick={() => window.openDayPlannerReport && window.openDayPlannerReport()}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 8,
                                            padding: '7px 9px',
                                            borderRadius: 8,
                                            background: isCompleted ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.04)',
                                            opacity: isCompleted ? 0.6 : 1,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = isCompleted ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)';
                                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1 }}>
                                            {/* Type pill */}
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 3,
                                                fontSize: 9,
                                                fontWeight: 700,
                                                color: badgeColor,
                                                background: badgeBg,
                                                border: `1px solid ${badgeBorder}`,
                                                padding: '2px 5px',
                                                borderRadius: 4,
                                                flexShrink: 0
                                            }}>
                                                <BadgeIcon size={10} />
                                                {badgeText}
                                            </span>

                                            {/* Title and subtitle */}
                                            <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                <span style={{
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    color: isCompleted ? '#94a3b8' : '#f1f5f9',
                                                    textDecoration: isCompleted ? 'line-through' : 'none',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {act.title}
                                                </span>
                                                {(act.contact_name || formattedTime) && (
                                                    <span style={{
                                                        fontSize: 9,
                                                        color: '#64748b',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {act.contact_name ? `${act.contact_name}` : ''}
                                                        {act.contact_name && formattedTime ? ' • ' : ''}
                                                        {formattedTime ? `🕒 ${formattedTime}` : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right: Amount & Status */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                            {hasAmount && (
                                                <span style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    color: isCompleted ? '#94a3b8' : (isPayable ? '#f87171' : '#34d399'),
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {isPayable ? '-' : (isReceivable ? '+' : '')}{formatActivityAmount(act.amount)}
                                                </span>
                                            )}
                                            <span style={{
                                                fontSize: 9,
                                                fontWeight: 700,
                                                color: isCompleted ? '#34d399' : '#fbbf24',
                                                background: isCompleted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                                border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                                                padding: '1px 5px',
                                                borderRadius: 4
                                            }}>
                                                {isCompleted ? 'Done' : 'Due'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>

        </div>
    );
}
