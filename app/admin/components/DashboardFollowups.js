'use client'

import { useState, useEffect } from 'react';
import { amcAPI, rentalsAPI } from '@/lib/adminAPI';
import { Calendar, AlertCircle, Shield, Package, Loader2 } from 'lucide-react';

export default function DashboardFollowups() {
    const [amcRenewals, setAmcRenewals] = useState([]);
    const [rentOverdue, setRentOverdue] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [amcs, rentals] = await Promise.all([
                amcAPI.getActive(),
                rentalsAPI.getActive()
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

            setAmcRenewals(renewals);
            setRentOverdue(overdues);
        } catch (err) {
            console.error('Failed to fetch followups:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)' }}>
                <Loader2 size={24} className="spin" style={{ marginRight: '8px' }} /> Loading follow-ups...
            </div>
        );
    }

    if (amcRenewals.length === 0 && rentOverdue.length === 0) {
        return (
            <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
                <Calendar size={32} color="var(--text-tertiary)" style={{ margin: '0 auto var(--spacing-sm)' }} />
                <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>You are all caught up!</div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>No upcoming AMC renewals or pending rents.</div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            
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
