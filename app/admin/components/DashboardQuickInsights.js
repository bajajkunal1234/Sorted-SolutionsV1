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
    Loader2 
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/accountingHelpers';

export default function DashboardQuickInsights() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState({
        leads: { total: 0, manual: 0 },
        daybook: { moneyIn: 0, moneyOut: 0 },
        cashReceipts: { count: 0, total: 0 },
        rentals: { active: 0, rentDue: 0 },
        jobs: { scheduled: 0, techOpenCounts: [] },
        kunalActiveTags: []
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

        return { todayStr, startOfTodayISO };
    };

    const fetchInsights = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const { todayStr, startOfTodayISO } = getISTTodayDateStrings();

            // Run database queries concurrently
            const [
                leadsRes,
                receiptsRes,
                paymentsRes,
                cashReceiptsRes,
                rentalsRes,
                jobsRes,
                techsRes,
                viewsRes
            ] = await Promise.all([
                // 1. Today's Leads
                supabase
                    .from('lead_attributions')
                    .select('conversion_type')
                    .gte('first_contact_at', startOfTodayISO),
                
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
                    .select('amount')
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

            // Handlers & calculation
            const leads = leadsRes.data || [];
            const leadsCount = leads.length;
            const manualLeadsCount = leads.filter(l => l.conversion_type?.startsWith('manual_')).length;

            const receiptsSum = (receiptsRes.data || []).reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
            const paymentsSum = (paymentsRes.data || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

            const pendingCashCount = (cashReceiptsRes.data || []).length;
            const pendingCashSum = (cashReceiptsRes.data || []).reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

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

            setData({
                leads: { total: leadsCount, manual: manualLeadsCount },
                daybook: { moneyIn: receiptsSum, moneyOut: paymentsSum },
                cashReceipts: { count: pendingCashCount, total: pendingCashSum },
                rentals: { active: activeRentalsCount, rentDue: overdueRentalsCount },
                jobs: { scheduled: scheduledTodayCount, techOpenCounts },
                kunalActiveTags: kunalTags
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
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Leads & Rentals</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div 
                            onClick={() => window.openWebsiteAnalyticsLeadsTracker && window.openWebsiteAnalyticsLeadsTracker()}
                            style={{ padding: 10, background: 'rgba(255,255,255,0.02)', borderRadius: 8, cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.15s' }}
                            className="interactive-metric-card"
                            title="Open Google Ads Leads & ROI Tracker"
                        >
                            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Leads Logged Today</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 2 }}>{data.leads.total}</div>
                            <div style={{ fontSize: 9, color: '#10b981', display: 'flex', alignItems: 'center', gap: 2, marginTop: 4 }}>
                                <span>📞 {data.leads.manual} manual</span>
                            </div>
                        </div>

                        <div 
                            onClick={() => window.openRentalsReport && window.openRentalsReport()}
                            style={{ padding: 10, background: 'rgba(255,255,255,0.02)', borderRadius: 8, cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.15s' }}
                            className="interactive-metric-card"
                            title="Open Rentals Agreements"
                        >
                            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Active Rentals</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 2 }}>{data.rentals.active}</div>
                            <div style={{ fontSize: 9, color: data.rentals.rentDue > 0 ? '#ef4444' : '#94a3b8', fontWeight: 600, marginTop: 4 }}>
                                {data.rentals.rentDue > 0 ? `⚠️ ${data.rentals.rentDue} rent due` : '✓ All up to date'}
                            </div>
                        </div>
                    </div>
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
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 4 }}>{formatCurrency(data.cashReceipts.total)}</div>
                            <div style={{ fontSize: 9, color: data.cashReceipts.count > 0 ? '#f59e0b' : '#94a3b8', fontWeight: 600, marginTop: 4 }}>
                                {data.cashReceipts.count > 0 ? `⚠️ ${data.cashReceipts.count} pending verify` : '✓ Fully verified'}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Column 2: Operations & Command Shortcuts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                
                {/* 3. Jobs & Dispatch Card */}
                <div style={{
                    padding: 14,
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
                            <Calendar size={16} color="#6366f1" />
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Jobs & Dispatch</span>
                        </div>
                        <span style={{ fontSize: 10, background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                            {data.jobs.scheduled} Scheduled Today
                        </span>
                    </div>

                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>Open jobs by technician:</div>
                    
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
                            <div style={{ fontSize: 10, color: '#475569', fontStyle: 'italic', padding: '4px 0' }}>No active open jobs.</div>
                        )}
                    </div>
                </div>

                {/* 4. Quick Command Center */}
                <div style={{
                    padding: 14,
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 6 }}>
                        <ArrowUpRight size={16} color="#f59e0b" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Quick Actions</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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

                        <button
                            onClick={() => window.openJobsMapWithFilter && window.openJobsMapWithFilter(data.kunalActiveTags)}
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
                                transition: 'all 0.15s',
                                gridColumn: 'span 2'
                            }}
                            className="dashboard-action-btn"
                        >
                            <Map size={12} />
                            <span>KUNAL MAP VIEW</span>
                        </button>
                    </div>
                </div>

            </div>

        </div>
    );
}
