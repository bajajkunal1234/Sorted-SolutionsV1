'use client'

import { useState, useEffect } from 'react';
import { Package, Shield, Calendar, DollarSign, Wrench, Loader2, RefreshCcw } from 'lucide-react';

function RentAMCTab({ customerId }) {
    const [rentals, setRentals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (customerId) fetchRentals();
    }, [customerId]);

    const fetchRentals = async () => {
        try {
            setLoading(true);
            setError(null);
            const { supabase } = await import('@/lib/supabase');
            const { data, error: err } = await supabase
                .from('active_rentals')
                .select('*')
                .eq('customer_id', customerId)
                .order('start_date', { ascending: false });
            if (err) throw err;
            setRentals(data || []);
        } catch (err) {
            console.error('Error fetching rentals:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fmt = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const isOverdue = (d) => d && new Date(d) < new Date();

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: 'var(--text-tertiary)', flexDirection: 'column', gap: 12 }}>
            <Loader2 size={32} className="animate-spin" color="var(--color-primary)" />
            <span>Loading rentals...</span>
        </div>
    );

    if (error) return (
        <div style={{ padding: 24, textAlign: 'center', color: '#ef4444' }}>
            <p style={{ marginBottom: 12 }}>Failed to load rentals: {error}</p>
            <button onClick={fetchRentals} className="btn btn-secondary" style={{ gap: 6 }}>
                <RefreshCcw size={14} /> Retry
            </button>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <Package size={20} color="#10b981" />
                    <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, margin: 0 }}>Active Rentals</h3>
                    <span style={{ padding: '2px 8px', backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                        {rentals.length}
                    </span>
                </div>
                <button onClick={fetchRentals} className="btn-icon" title="Refresh" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <RefreshCcw size={15} />
                </button>
            </div>

            {/* Rentals List */}
            {rentals.length === 0 ? (
                <div style={{ padding: 'var(--spacing-xl)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-tertiary)', border: '2px dashed var(--border-primary)' }}>
                    <Package size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>No active rentals for this customer</p>
                    <p style={{ fontSize: 'var(--font-size-xs)', marginTop: 4 }}>Create a rental in the Rentals tab</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    {rentals.map(rental => (
                        <div key={rental.id} style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: `2px solid ${rental.status === 'active' ? '#10b981' : rental.status === 'paused' ? '#f59e0b' : '#6b7280'}` }}>
                            {/* Title row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                                <div>
                                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 4 }}>
                                        {rental.product_name}
                                    </h4>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                        {rental.serial_number && <>SN: {rental.serial_number} • </>}
                                        ID: {rental.id?.slice(0, 8)}
                                    </div>
                                </div>
                                <span style={{ padding: '4px 12px', backgroundColor: rental.status === 'active' ? '#10b981' : rental.status === 'paused' ? '#f59e0b' : '#6b7280', color: 'white', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 600, textTransform: 'uppercase' }}>
                                    {rental.status || 'active'}
                                </span>
                            </div>

                            {/* Stats grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Monthly Rent</div>
                                    <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: '#10b981' }}>{fmt(rental.monthly_rent)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Security Deposit</div>
                                    <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{fmt(rental.security_deposit || rental.deposit_amount)}</div>
                                    <div style={{ fontSize: 11, color: rental.deposit_paid ? '#10b981' : '#ef4444' }}>{rental.deposit_paid ? '✓ Paid' : '✗ Pending'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Period</div>
                                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{fmtDate(rental.start_date)}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>to {fmtDate(rental.end_date)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Next Rent Due</div>
                                    <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: isOverdue(rental.next_rent_due_date) ? '#ef4444' : '#f59e0b' }}>
                                        {fmtDate(rental.next_rent_due_date)}
                                    </div>
                                    {(rental.rents_paid != null) && (
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                            {rental.rents_paid}/{(rental.rents_paid || 0) + (rental.rents_remaining || 0)} paid
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Rent Advance row */}
                            {rental.rent_advance > 0 && (
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                                    Rent Advance: <strong>{fmt(rental.rent_advance)}</strong>
                                </div>
                            )}

                            {/* Notes */}
                            {rental.notes && (
                                <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)', fontStyle: 'italic' }}>
                                    {rental.notes}
                                </div>
                            )}

                            {/* Quick Actions */}
                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-sm)' }}>
                                <button className="btn btn-secondary" style={{ flex: 1, padding: '6px', fontSize: 'var(--font-size-sm)' }}
                                    onClick={() => window.location.href = '/admin#rentals'}>
                                    <DollarSign size={14} /> Collect Rent
                                </button>
                                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                                    onClick={() => window.location.href = '/admin#rentals'}>
                                    View Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* AMC Section placeholder */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                    <Shield size={20} color="#8b5cf6" />
                    <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, margin: 0 }}>Active AMCs</h3>
                    <span style={{ padding: '2px 8px', backgroundColor: 'rgba(139,92,246,0.1)', color: '#8b5cf6', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>0</span>
                </div>
                <div style={{ padding: 'var(--spacing-lg)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-tertiary)', border: '2px dashed var(--border-primary)' }}>
                    <Shield size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                    <p style={{ fontSize: 'var(--font-size-sm)' }}>No active AMCs</p>
                </div>
            </div>
        </div>
    );
}

export default RentAMCTab;
