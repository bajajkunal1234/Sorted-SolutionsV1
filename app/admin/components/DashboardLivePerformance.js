'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Briefcase, CheckCircle, TrendingUp, DollarSign, Activity, Loader2 } from 'lucide-react';

const getISTDateString = (isoString) => {
    if (!isoString) return null;
    try {
        const date = new Date(isoString);
        // Convert to IST (UTC+5:30)
        const offsetDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
        return offsetDate.toISOString().split('T')[0];
    } catch (e) {
        return null;
    }
};

export default function DashboardLivePerformance() {
    const [technicians, setTechnicians] = useState([]);
    const [selectedTechId, setSelectedTechId] = useState('all');
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        combined: { revenue: 0, assigned: 0, closed: 0, onJob: 0, visits: 0 },
        byTech: {}
    });

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch active technicians
            const { data: techs, error: techsErr } = await supabase
                .from('technicians')
                .select('id, name')
                .eq('is_active', true)
                .order('name', { ascending: true });

            if (techsErr) throw techsErr;
            setTechnicians(techs || []);

            // Today's date YYYY-MM-DD in IST
            const localDate = new Date();
            const utcTime = localDate.getTime() + (localDate.getTimezoneOffset() * 60000);
            const nowIST = new Date(utcTime + (3600000 * 5.5));
            const year = nowIST.getFullYear();
            const month = String(nowIST.getMonth() + 1).padStart(2, '0');
            const day = String(nowIST.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            // Get start of today in IST as UTC ISO string for db query
            const startOfTodayIST = new Date(nowIST);
            startOfTodayIST.setHours(0, 0, 0, 0);
            const startOfTodayUTC = new Date(startOfTodayIST.getTime() - (3600000 * 5.5));
            const startOfTodayISO = startOfTodayUTC.toISOString();

            // Fetch jobs and invoices concurrently
            const [jobsRes, invoicesRes] = await Promise.all([
                supabase
                    .from('jobs')
                    .select('id, technician_id, status, arrived_at, completed_at, scheduled_date')
                    .or(`scheduled_date.eq.${todayStr},completed_at.gte.${startOfTodayISO},arrived_at.gte.${startOfTodayISO}`),
                supabase
                    .from('sales_invoices')
                    .select('total_amount, technician_id, status, date')
                    .eq('date', todayStr)
                    .neq('status', 'cancelled')
            ]);

            const jobs = jobsRes.data || [];
            const invoices = invoicesRes.data || [];

            // Compute metrics
            const byTech = {};
            (techs || []).forEach(t => {
                byTech[t.id] = {
                    name: t.name,
                    revenue: 0,
                    assigned: 0,
                    closed: 0,
                    onJob: 0,
                    visits: 0
                };
            });

            // Populate job metrics
            jobs.forEach(job => {
                const techId = job.technician_id;
                if (!byTech[techId]) return;

                // 1. Jobs Assigned: counts if scheduled_date is today
                if (job.scheduled_date === todayStr) {
                    byTech[techId].assigned++;
                }

                // 2. Visits: counts if arrived_at was today in IST
                if (job.arrived_at) {
                    const arrDate = getISTDateString(job.arrived_at);
                    if (arrDate === todayStr) {
                        byTech[techId].visits++;
                    }
                }

                // 3. Closed: counts if status is closed and completed_at was today in IST
                if (job.status === 'closed' && job.completed_at) {
                    const compDate = getISTDateString(job.completed_at);
                    if (compDate === todayStr) {
                        byTech[techId].closed++;
                    }
                }

                // 4. Currently on Job: real-time active diagnosis/work
                if (job.arrived_at && !job.completed_at && job.status !== 'closed' && job.status !== 'cancelled') {
                    byTech[techId].onJob++;
                }
            });

            // Populate invoice metrics
            invoices.forEach(inv => {
                const techId = inv.technician_id;
                if (!byTech[techId]) return;
                byTech[techId].revenue += parseFloat(inv.total_amount || 0);
            });

            // Compute combined
            const combined = { revenue: 0, assigned: 0, closed: 0, onJob: 0, visits: 0 };
            Object.values(byTech).forEach(m => {
                combined.revenue += m.revenue;
                combined.assigned += m.assigned;
                combined.closed += m.closed;
                combined.onJob += m.onJob;
                combined.visits += m.visits;
            });

            setMetrics({ combined, byTech });
        } catch (e) {
            console.error('Error fetching today performance metrics:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Auto-refresh every 60s
        const interval = setInterval(fetchData, 60_000);
        return () => clearInterval(interval);
    }, []);

    const activeMetrics = selectedTechId === 'all' 
        ? metrics.combined 
        : (metrics.byTech[selectedTechId] || { revenue: 0, assigned: 0, closed: 0, onJob: 0, visits: 0 });

    const cardData = [
        { label: 'Revenue Generated', value: `₹${(activeMetrics.revenue || 0).toLocaleString()}`, icon: DollarSign, color: '#10b981' },
        { label: 'Jobs Assigned', value: activeMetrics.assigned || 0, icon: Briefcase, color: '#3b82f6' },
        { label: 'Visits Done', value: activeMetrics.visits || 0, icon: TrendingUp, color: '#f59e0b' },
        { label: 'Jobs Closed', value: activeMetrics.closed || 0, icon: CheckCircle, color: '#8b5cf6' },
    ];

    return (
        <div style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-md)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                <h3 style={{ 
                    fontSize: 'var(--font-size-lg)', 
                    fontWeight: 600, 
                    margin: 0, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px' 
                }}>
                    ⚡ Today's Live Performance
                </h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <select
                        value={selectedTechId}
                        onChange={(e) => setSelectedTechId(e.target.value)}
                        style={{
                            padding: '6px 12px',
                            fontSize: 'var(--font-size-sm)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-primary)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all">All Technicians (Combined)</option>
                        {technicians.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => {
                            if (typeof window.openPerformanceTracking === 'function') {
                                window.openPerformanceTracking('performance');
                            }
                        }}
                        style={{
                            padding: '6px 12px',
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 500,
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-primary)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
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
                        View All
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '120px', color: 'var(--text-secondary)' }}>
                    <Loader2 className="animate-spin" size={24} style={{ marginRight: '8px' }} />
                    Loading metrics...
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: 'var(--spacing-sm)'
                }}>
                    {cardData.map((card, idx) => {
                        const Icon = card.icon;
                        return (
                            <div key={idx} style={{
                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: `${card.color}15`,
                                    color: card.color,
                                    flexShrink: 0
                                }}>
                                    <Icon size={18} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 500, letterSpacing: '0.5px' }}>
                                        {card.label}
                                    </span>
                                    <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {card.value}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
