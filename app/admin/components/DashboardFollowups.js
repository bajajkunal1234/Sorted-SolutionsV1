'use client'

import { useState, useEffect } from 'react';
import { amcAPI, rentalsAPI } from '@/lib/adminAPI';
import { supabase } from '@/lib/supabase';
import { Calendar, AlertCircle, Shield, Package, Loader2, Users, Wrench, CreditCard, FileText, ChevronRight } from 'lucide-react';

export default function DashboardFollowups() {
    const [amcRenewals, setAmcRenewals] = useState([]);
    const [rentOverdue, setRentOverdue] = useState([]);
    const [techCounts, setTechCounts] = useState({
        sparesToPost: 0,
        sparesToPay: 0,
        expensesPending: 0,
        leavesPending: 0
    });
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [amcs, rentals, sparesRes, expensesRes, leavesRes] = await Promise.all([
                amcAPI.getActive().catch(err => { console.error('Failed to fetch AMCs:', err); return []; }),
                rentalsAPI.getActive().catch(err => { console.error('Failed to fetch Rentals:', err); return []; }),
                supabase.from('purchase_invoices').select('id, status, total_amount, paid_amount').eq('reference', 'Technician Purchase'),
                supabase.from('expenses').select('id').eq('status', 'pending'),
                supabase.from('technician_leaves').select('id').eq('status', 'pending')
            ]);

            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(now.getDate() + 30);

            // Filter active AMCs ending within 30 days or already expired
            const renewals = (amcs || []).filter(amc => {
                if (amc.status === 'terminated') return false;
                if (!amc.end_date) return false;
                const endDate = new Date(amc.end_date);
                return endDate <= thirtyDaysFromNow;
            }).sort((a, b) => new Date(a.end_date) - new Date(b.end_date));

            // Filter active Rentals where rent is due within 7 days or overdue
            const sevenDaysFromNow = new Date();
            sevenDaysFromNow.setDate(now.getDate() + 7);

            const overdues = (rentals || []).filter(r => {
                if (r.status === 'terminated') return false;
                if (!r.next_rent_due_date) return false; // Maybe paid in full
                const dueDate = new Date(r.next_rent_due_date);
                return dueDate <= sevenDaysFromNow;
            }).sort((a, b) => new Date(a.next_rent_due_date) - new Date(b.next_rent_due_date));

            // Process technician query results
            const sparesData = sparesRes.data || [];
            const expensesData = expensesRes.data || [];
            const leavesData = leavesRes.data || [];

            if (sparesRes.error) console.error('Spares query error:', sparesRes.error);
            if (expensesRes.error) console.error('Expenses query error:', expensesRes.error);
            if (leavesRes.error) console.error('Leaves query error:', leavesRes.error);

            const sparesToPost = sparesData.filter(s => s.status === 'draft').length;
            const sparesToPay = sparesData.filter(s => s.status === 'finalized' && (parseFloat(s.total_amount || 0) - parseFloat(s.paid_amount || 0)) > 0).length;
            const expensesPending = expensesData.length;
            const leavesPending = leavesData.length;

            setAmcRenewals(renewals);
            setRentOverdue(overdues);
            setTechCounts({
                sparesToPost,
                sparesToPay,
                expensesPending,
                leavesPending
            });
        } catch (err) {
            console.error('Failed to fetch followups:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const hasTechPending = techCounts.sparesToPost > 0 || techCounts.sparesToPay > 0 || techCounts.expensesPending > 0 || techCounts.leavesPending > 0;

    const handleItemClick = (action) => {
        if (window.openTechnicianManagement) {
            window.openTechnicianManagement(action);
        } else {
            console.warn('openTechnicianManagement handler not registered');
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)' }}>
                <Loader2 size={24} className="spin" style={{ marginRight: '8px' }} /> Loading follow-ups...
            </div>
        );
    }

    if (amcRenewals.length === 0 && rentOverdue.length === 0 && !hasTechPending) {
        return (
            <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
                <Calendar size={32} color="var(--text-tertiary)" style={{ margin: '0 auto var(--spacing-sm)' }} />
                <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>You are all caught up!</div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>No upcoming renewals, pending rents, or technician requests.</div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            
            {/* Technicians Management */}
            {hasTechPending && (
                <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} color="var(--color-primary, #3b82f6)" /> Technicians Management
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                        {techCounts.sparesToPost > 0 && (
                            <div 
                                onClick={() => handleItemClick('spares-post')}
                                style={itemStyle}
                                onMouseEnter={toggleHover}
                                onMouseLeave={toggleHover}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={iconBoxStyle('#f59e0b')}>
                                        <Wrench size={16} color="#f59e0b" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>Spares Purchases to Post</div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                            Technician-raised spare parts invoices pending review & posting
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={badgeStyle('#f59e0b')}>{techCounts.sparesToPost}</span>
                                    <ChevronRight size={16} color="var(--text-tertiary)" />
                                </div>
                            </div>
                        )}

                        {techCounts.sparesToPay > 0 && (
                            <div 
                                onClick={() => handleItemClick('spares-pay')}
                                style={itemStyle}
                                onMouseEnter={toggleHover}
                                onMouseLeave={toggleHover}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={iconBoxStyle('#10b981')}>
                                        <CreditCard size={16} color="#10b981" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>Spares Purchases to Pay</div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                            Finalized invoices with remaining unpaid balances
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={badgeStyle('#10b981')}>{techCounts.sparesToPay}</span>
                                    <ChevronRight size={16} color="var(--text-tertiary)" />
                                </div>
                            </div>
                        )}

                        {techCounts.expensesPending > 0 && (
                            <div 
                                onClick={() => handleItemClick('expenses')}
                                style={itemStyle}
                                onMouseEnter={toggleHover}
                                onMouseLeave={toggleHover}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={iconBoxStyle('#3b82f6')}>
                                        <FileText size={16} color="#3b82f6" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>Pending Expense Claims</div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                            Travel and general expense claims pending approval
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={badgeStyle('#3b82f6')}>{techCounts.expensesPending}</span>
                                    <ChevronRight size={16} color="var(--text-tertiary)" />
                                </div>
                            </div>
                        )}

                        {techCounts.leavesPending > 0 && (
                            <div 
                                onClick={() => handleItemClick('leaves')}
                                style={itemStyle}
                                onMouseEnter={toggleHover}
                                onMouseLeave={toggleHover}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={iconBoxStyle('#ef4444')}>
                                        <Calendar size={16} color="#ef4444" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>Leave Requests pending approval</div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                            Leave requests waiting for admin decision
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={badgeStyle('#ef4444')}>{techCounts.leavesPending}</span>
                                    <ChevronRight size={16} color="var(--text-tertiary)" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* AMC Renewals */}
            {amcRenewals.length > 0 && (
                <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield size={18} color="#f59e0b" /> AMC Renewals Due
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                        {amcRenewals.map(amc => {
                            const isPast = new Date(amc.end_date) < new Date();
                            return (
                                <div key={amc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', border: `1px solid ${isPast ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-primary)'}`, borderRadius: 'var(--radius-md)' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{amc.accounts?.name || amc.customer_name || 'Customer'}</div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                            {amc.plan_name || amc.amc_plans?.name} • {amc.product_brand} {amc.product_model}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700, color: isPast ? '#ef4444' : '#f59e0b' }}>
                                            {isPast ? 'Expired' : 'Expiring'} {new Date(amc.end_date).toLocaleDateString('en-GB')}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                            ₹{(Number(amc.amc_amount) || 0).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Rent Overdue */}
            {rentOverdue.length > 0 && (
                <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Package size={18} color="#ef4444" /> Rental Follow-ups
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                        {rentOverdue.map(rental => {
                            const isPast = new Date(rental.next_rent_due_date) < new Date();
                            return (
                                <div key={rental.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', border: `1px solid ${isPast ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-primary)'}`, borderRadius: 'var(--radius-md)' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{rental.accounts?.name || rental.customer_name || 'Customer'}</div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                            {rental.product_name || rental.rental_plans?.product_name}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700, color: isPast ? '#ef4444' : '#f59e0b' }}>
                                            {isPast ? 'Overdue' : 'Due'} {new Date(rental.next_rent_due_date).toLocaleDateString('en-GB')}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                            Rent: ₹{(Number(rental.monthly_rent) || 0).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

const itemStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--spacing-md)',
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
};

const iconBoxStyle = (color) => ({
    padding: 'var(--spacing-xs)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: `${color}15`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
});

const badgeStyle = (color) => ({
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: 700,
    backgroundColor: `${color}20`,
    color: color
});

const toggleHover = (e) => {
    const isEnter = e.type === 'mouseenter';
    e.currentTarget.style.borderColor = isEnter ? 'var(--color-primary, #3b82f6)' : 'var(--border-primary)';
    e.currentTarget.style.transform = isEnter ? 'translateY(-2px)' : 'translateY(0)';
    e.currentTarget.style.boxShadow = isEnter ? '0 4px 12px rgba(0, 0, 0, 0.1)' : 'none';
};
