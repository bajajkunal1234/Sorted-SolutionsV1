'use client'

import { useState, useEffect } from 'react';
import { Package, Shield, Calendar, DollarSign, Loader2, RefreshCcw, CheckCircle, AlertCircle } from 'lucide-react';
import CollectRentForm from '../reports/CollectRentForm';
import { transactionsAPI, rentalsAPI } from '@/lib/adminAPI';

function RentAMCTab({ customerId }) {
    const [rentals, setRentals] = useState([]);
    const [amcs, setAmcs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCollectRentForm, setShowCollectRentForm] = useState(false);
    const [selectedRentalForPayment, setSelectedRentalForPayment] = useState(null);

    useEffect(() => {
        if (customerId) fetchAll();
    }, [customerId]);

    const fetchAll = async () => {
        try {
            setLoading(true);
            setError(null);
            const { supabase } = await import('@/lib/supabase');

            const [rentalsRes, amcsRes] = await Promise.all([
                supabase.from('active_rentals').select('*').eq('customer_id', customerId).order('start_date', { ascending: false }),
                supabase.from('active_amcs').select('*, amc_plans(name)').eq('customer_id', customerId).order('created_at', { ascending: false })
            ]);

            if (rentalsRes.error) console.error('Rentals error:', rentalsRes.error);
            if (amcsRes.error) console.error('AMC error:', amcsRes.error);

            setRentals(rentalsRes.data || []);
            setAmcs(amcsRes.data || []);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fmt = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const isOverdue = (d) => d && new Date(d) < new Date();
    const isExpiringSoon = (d) => {
        if (!d) return false;
        const diff = new Date(d) - new Date();
        return diff >= 0 && diff < 30 * 24 * 60 * 60 * 1000; // within 30 days
    };

    const statusColor = (status) => {
        switch (status) {
            case 'active': return '#10b981';
            case 'paused': return '#f59e0b';
            case 'expired': return '#ef4444';
            default: return '#6b7280';
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: 'var(--text-tertiary)', flexDirection: 'column', gap: 12 }}>
            <Loader2 size={32} className="animate-spin" color="var(--color-primary)" />
            <span>Loading rentals & AMCs...</span>
        </div>
    );

    if (error) return (
        <div style={{ padding: 24, textAlign: 'center', color: '#ef4444' }}>
            <p style={{ marginBottom: 12 }}>Failed to load data: {error}</p>
            <button onClick={fetchAll} className="btn btn-secondary" style={{ gap: 6 }}>
                <RefreshCcw size={14} /> Retry
            </button>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>

            {/* ───── RENTALS SECTION ───── */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <Package size={20} color="#10b981" />
                        <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, margin: 0 }}>Active Rentals</h3>
                        <span style={{ padding: '2px 8px', backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                            {rentals.length}
                        </span>
                    </div>
                    <button onClick={fetchAll} className="btn-icon" title="Refresh" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <RefreshCcw size={14} />
                    </button>
                </div>

                {rentals.length === 0 ? (
                    <div style={{ padding: 'var(--spacing-lg)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-tertiary)', border: '2px dashed var(--border-primary)' }}>
                        <Package size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                        <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>No active rentals</p>
                        <p style={{ fontSize: 'var(--font-size-xs)', marginTop: 4 }}>Create a rental in the Rentals tab</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        {rentals.map(rental => (
                            <div key={rental.id} style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: `2px solid ${statusColor(rental.status)}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                                    <div>
                                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 4 }}>{rental.product_name}</h4>
                                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                            {rental.serial_number && <>SN: {rental.serial_number} • </>}ID: {rental.id?.slice(0, 8)}
                                        </div>
                                    </div>
                                    <span style={{ padding: '4px 12px', backgroundColor: statusColor(rental.status), color: 'white', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                                        {rental.status || 'active'}
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)' }}>
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
                                            {rental.next_rent_due_date 
                                                ? fmtDate(rental.next_rent_due_date) 
                                                : (rental.start_date ? (() => { 
                                                    // Fallback for missing next_rent_due_date
                                                    let assumedMonths = rental.monthly_rent > 0 ? Math.floor((rental.rent_advance || 0)/rental.monthly_rent) : 0;
                                                    let d = new Date(rental.start_date);
                                                    d.setMonth(d.getMonth() + assumedMonths);
                                                    return fmtDate(d.toISOString().split('T')[0]);
                                                })() : '—')
                                            }
                                        </div>
                                        {rental.rents_paid != null && (
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{rental.rents_paid}/{(rental.rents_paid || 0) + (rental.rents_remaining || 0)} paid</div>
                                        )}
                                    </div>
                                </div>

                                {rental.notes && (
                                    <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontStyle: 'italic' }}>
                                        {rental.notes}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                    <button className="btn btn-secondary" style={{ flex: 1, padding: '6px', fontSize: 12 }}
                                        onClick={() => {
                                            setSelectedRentalForPayment(rental);
                                            setShowCollectRentForm(true);
                                        }}>
                                        <DollarSign size={13} /> Collect Rent
                                    </button>
                                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}
                                        onClick={() => alert('Detailed view for individual rentals coming soon!')}>
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ───── AMC SECTION ───── */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                    <Shield size={20} color="#8b5cf6" />
                    <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, margin: 0 }}>Active AMCs</h3>
                    <span style={{ padding: '2px 8px', backgroundColor: 'rgba(139,92,246,0.1)', color: '#8b5cf6', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                        {amcs.length}
                    </span>
                </div>

                {amcs.length === 0 ? (
                    <div style={{ padding: 'var(--spacing-lg)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-tertiary)', border: '2px dashed var(--border-primary)' }}>
                        <Shield size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                        <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>No active AMC contracts</p>
                        <p style={{ fontSize: 'var(--font-size-xs)', marginTop: 4 }}>Create an AMC in the AMC tab under Reports</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        {amcs.map(amc => {
                            const planName = amc.plan_name || amc.amc_plans?.name || 'AMC';
                            const expiring = isExpiringSoon(amc.end_date);
                            const expired = amc.status === 'expired' || (amc.end_date && new Date(amc.end_date) < new Date());
                            const borderCol = expired ? '#ef4444' : expiring ? '#f59e0b' : '#8b5cf6';
                            return (
                                <div key={amc.id} style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: `2px solid ${borderCol}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                                        <div>
                                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 4 }}>{planName}</h4>
                                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                                {[amc.product_brand, amc.product_model].filter(Boolean).join(' ')}
                                                {amc.serial_number && <> • SN: {amc.serial_number}</>}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                            <span style={{ padding: '4px 10px', backgroundColor: statusColor(amc.status), color: 'white', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                                                {amc.status || 'active'}
                                            </span>
                                            {expiring && !expired && (
                                                <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>⚠ Expiring soon</span>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)' }}>
                                        <div>
                                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>AMC Amount</div>
                                            <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: '#8b5cf6' }}>{fmt(amc.amc_amount)}</div>
                                            <div style={{ fontSize: 11, color: amc.payment_status === 'paid' ? '#10b981' : '#ef4444' }}>
                                                {amc.payment_status === 'paid' ? '✓ Paid' : '✗ Pending'}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Contract Period</div>
                                            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{fmtDate(amc.start_date)}</div>
                                            <div style={{ fontSize: 11, color: expired ? '#ef4444' : 'var(--text-secondary)' }}>to {fmtDate(amc.end_date)}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Next Service</div>
                                            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: isOverdue(amc.next_service_date) ? '#ef4444' : '#f59e0b' }}>
                                                {fmtDate(amc.next_service_date)}
                                            </div>
                                            {amc.next_service_type && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{amc.next_service_type}</div>}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Auto Renew</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                {amc.auto_renew
                                                    ? <><CheckCircle size={14} color="#10b981" /> <span style={{ fontSize: 12, color: '#10b981' }}>Enabled</span></>
                                                    : <><AlertCircle size={14} color="#6b7280" /> <span style={{ fontSize: 12, color: '#6b7280' }}>Disabled</span></>}
                                            </div>
                                        </div>
                                    </div>

                                    {amc.notes && (
                                        <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontStyle: 'italic' }}>
                                            {amc.notes}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                        <button className="btn btn-secondary" style={{ flex: 1, padding: '6px', fontSize: 12 }}
                                            onClick={() => window.location.href = '/admin#amc'}>
                                            <Calendar size={13} /> Schedule Service
                                        </button>
                                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}
                                            onClick={() => window.location.href = '/admin#amc'}>
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {showCollectRentForm && selectedRentalForPayment && (
                <CollectRentForm
                    rental={selectedRentalForPayment}
                    onClose={() => {
                        setShowCollectRentForm(false);
                        setSelectedRentalForPayment(null);
                    }}
                    onSave={async (paymentData) => {
                        try {
                            setLoading(true);
                            const rental = selectedRentalForPayment;
                            
                            // Initialize due date fallback if it was missing in the record
                            let currentDueDateString = rental.next_rent_due_date;
                            if (!currentDueDateString && rental.start_date) {
                                let assumedMonths = rental.monthly_rent > 0 ? Math.floor((rental.rent_advance || 0)/rental.monthly_rent) : 0;
                                let d = new Date(rental.start_date);
                                d.setMonth(d.getMonth() + assumedMonths);
                                currentDueDateString = d.toISOString().split('T')[0];
                            }
                            const currentDueDate = new Date(currentDueDateString || new Date());
                            const nextDueDate = new Date(currentDueDate);
                            nextDueDate.setMonth(nextDueDate.getMonth() + 1);

                            // Create receipt voucher OR link existing one
                            let receiptId = paymentData.linkedReceiptId || null;

                            if (!paymentData.useExistingReceipt || !receiptId) {
                                // Create a new receipt voucher in accounts
                                const productName = rental.product_name || rental.productName || 'Rental';
                                const receipt = await transactionsAPI.create({
                                    type: 'receipt',
                                    date: paymentData.paymentDate || new Date().toISOString().split('T')[0],
                                    account_id: rental.customer_id,
                                    account_name: rental.customer_name || 'Customer',
                                    amount: paymentData.amount,
                                    description: `Rent payment for ${productName}${rental.serial_number ? ` (SN: ${rental.serial_number})` : ''}`,
                                    reference: paymentData.transactionRef || null,
                                    payment_method: paymentData.paymentMethod || 'cash',
                                    notes: paymentData.notes || null,
                                });
                                receiptId = receipt?.id || null;
                            }

                            // Update active_rental record
                            await rentalsAPI.updateActive(rental.id, {
                                rents_paid: (rental.rents_paid || 0) + 1,
                                rents_remaining: Math.max(0, (rental.rents_remaining || 0) - 1),
                                next_rent_due_date: nextDueDate.toISOString().split('T')[0],
                                ...(receiptId ? { last_receipt_id: String(receiptId) } : {}),
                            });

                            await fetchAll();
                            setShowCollectRentForm(false);
                            setSelectedRentalForPayment(null);
                        } catch (err) {
                            console.error('Failed to collect rent:', err);
                            alert('Failed to process rent payment.');
                        } finally {
                            setLoading(false);
                        }
                    }}
                />
            )}
        </div>
    );
}

export default RentAMCTab;
