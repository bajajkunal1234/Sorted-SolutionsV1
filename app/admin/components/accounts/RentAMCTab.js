'use client'

import { useState, useEffect } from 'react';
import { Package, Shield, Calendar, DollarSign, Loader2, RefreshCcw, CheckCircle, AlertCircle, Wrench, XCircle, TrendingUp } from 'lucide-react';
import CollectRentForm from '../reports/CollectRentForm';
import { transactionsAPI, rentalsAPI, jobsAPI } from '@/lib/adminAPI';

function RentAMCTab({ customerId }) {
    const [rentals, setRentals] = useState([]);
    const [amcs, setAmcs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCollectRentForm, setShowCollectRentForm] = useState(false);
    const [selectedRentalForPayment, setSelectedRentalForPayment] = useState(null);
    const [scheduleAmc, setScheduleAmc] = useState(null);
    const [terminateTarget, setTerminateTarget] = useState(null); // { type:'rental'|'amc', record }

    useEffect(() => {
        if (customerId) fetchAll();
    }, [customerId]);

    const fetchAll = async () => {
        try {
            setLoading(true);
            setError(null);
            const { supabase } = await import('@/lib/supabase');

            const [rentalsRes, amcsRes] = await Promise.all([
                supabase.from('active_rentals').select('*, rental_plans(product_name), jobs(id, job_number, description, status, priority, scheduled_date, scheduled_time, technician_name, created_at)').eq('customer_id', customerId).order('start_date', { ascending: false }),
                supabase.from('active_amcs').select('*, amc_plans(name), jobs(id, job_number, description, status, priority, scheduled_date, scheduled_time, technician_name, created_at)').eq('customer_id', customerId).order('created_at', { ascending: false })
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
                                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 4 }}>{rental.rental_plans?.product_name || rental.product_name}</h4>
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

                                {rental.jobs && rental.jobs.length > 0 && (
                                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border-primary)' }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Wrench size={12} /> Linked Jobs ({rental.jobs.length})
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {rental.jobs.map(job => (
                                                <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: '4px', fontSize: 12 }}>
                                                    <div>
                                                        <span style={{ fontWeight: 600 }}>{job.job_number || 'JOB'}</span>: {job.description || 'No description'}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{ color: 'var(--text-tertiary)' }}>{job.technician_name || 'Unassigned'}</span>
                                                        <span style={{ padding: '2px 6px', borderRadius: 4, backgroundColor: job.status === 'completed' ? '#10b98120' : '#f59e0b20', color: job.status === 'completed' ? '#10b981' : '#f59e0b', fontWeight: 600, textTransform: 'uppercase', fontSize: 10 }}>
                                                            {job.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
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
                                    {rental.status !== 'terminated' && (
                                        <button
                                            className="btn"
                                            style={{ padding: '6px 12px', fontSize: 12, backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                                            onClick={() => setTerminateTarget({ type: 'rental', record: rental })}
                                        >
                                            <XCircle size={13} /> Terminate
                                        </button>
                                    )}
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

                                    {amc.jobs && amc.jobs.length > 0 && (
                                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border-primary)' }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Wrench size={12} /> Linked Jobs ({amc.jobs.length})
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {amc.jobs.map(job => (
                                                    <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: '4px', fontSize: 12 }}>
                                                        <div>
                                                            <span style={{ fontWeight: 600 }}>{job.job_number || 'JOB'}</span>: {job.description || 'No description'}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <span style={{ color: 'var(--text-tertiary)' }}>{job.technician_name || 'Unassigned'}</span>
                                                            <span style={{ padding: '2px 6px', borderRadius: 4, backgroundColor: job.status === 'completed' ? '#10b98120' : '#f59e0b20', color: job.status === 'completed' ? '#10b981' : '#f59e0b', fontWeight: 600, textTransform: 'uppercase', fontSize: 10 }}>
                                                                {job.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {amc.notes && (
                                        <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontStyle: 'italic' }}>
                                            {amc.notes}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                        <button className="btn btn-secondary" style={{ flex: 1, padding: '6px', fontSize: 12 }}
                                            onClick={() => setScheduleAmc({ amc, scheduledDate: amc.next_service_date || new Date().toISOString().split('T')[0], notes: '' })}>
                                            <Calendar size={13} /> Schedule Service
                                        </button>
                                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}
                                            onClick={() => {
                                                const info = [
                                                    `Plan: ${amc.plan_name || amc.amc_plans?.name}`,
                                                    `Product: ${[amc.product_brand, amc.product_model].filter(Boolean).join(' ')}`,
                                                    `Amount: ₹${amc.amc_amount}`,
                                                    `Period: ${fmtDate(amc.start_date)} – ${fmtDate(amc.end_date)}`,
                                                    `Next Service: ${fmtDate(amc.next_service_date)}`,
                                                ].join('\n');
                                                navigator.clipboard?.writeText(info);
                                                alert(`AMC Details:\n\n${info}`);
                                            }}>
                                            View Details
                                        </button>
                                        {amc.status !== 'terminated' && (
                                            <button
                                                className="btn"
                                                style={{ padding: '6px 12px', fontSize: 12, backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                                                onClick={() => setTerminateTarget({ type: 'amc', record: amc })}
                                            >
                                                <XCircle size={13} /> Terminate
                                            </button>
                                        )}
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
                                const productName = rental.rental_plans?.product_name || rental.product_name || rental.productName || 'Rental';
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
            {/* ───── AMC Schedule Service Modal ───── */}
            {scheduleAmc && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
                    onClick={() => setScheduleAmc(null)}>
                    <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 480, boxShadow: 'var(--shadow-xl)', overflow: 'hidden' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontWeight: 600, margin: 0, color: '#8b5cf6' }}>Schedule AMC Service</h3>
                                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                                    {scheduleAmc.amc.plan_name || scheduleAmc.amc.amc_plans?.name} — {[scheduleAmc.amc.product_brand, scheduleAmc.amc.product_model].filter(Boolean).join(' ')}
                                </p>
                            </div>
                            <button onClick={() => setScheduleAmc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 4 }}>✕</button>
                        </div>
                        <div style={{ padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Scheduled Date *</label>
                                <input type="date" className="form-input" style={{ width: '100%' }}
                                    value={scheduleAmc.scheduledDate}
                                    onChange={e => setScheduleAmc(s => ({ ...s, scheduledDate: e.target.value }))} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Job Description</label>
                                <textarea className="form-input" rows={3} style={{ width: '100%', resize: 'vertical' }}
                                    placeholder={`AMC service for ${scheduleAmc.amc.plan_name || 'AMC plan'}`}
                                    value={scheduleAmc.notes}
                                    onChange={e => setScheduleAmc(s => ({ ...s, notes: e.target.value }))} />
                            </div>
                        </div>
                        <div style={{ padding: 'var(--spacing-md)', borderTop: '1px solid var(--border-primary)', display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" style={{ padding: '8px 16px' }} onClick={() => setScheduleAmc(null)}>Cancel</button>
                            <button className="btn btn-primary" style={{ padding: '8px 20px', backgroundColor: '#8b5cf6' }}
                                onClick={async () => {
                                    if (!scheduleAmc.scheduledDate) { alert('Please select a date'); return; }
                                    try {
                                        setLoading(true);
                                        const amc = scheduleAmc.amc;
                                        const description = scheduleAmc.notes.trim() ||
                                            `AMC service — ${amc.plan_name || amc.amc_plans?.name || 'AMC'} for ${[amc.product_brand, amc.product_model].filter(Boolean).join(' ') || 'product'}`;
                                        await jobsAPI.create({
                                            customer_id: customerId,
                                            description,
                                            scheduled_date: scheduleAmc.scheduledDate,
                                            source: 'amc',
                                            amc_id: amc.id,
                                            status: 'scheduled',
                                            priority: 'medium',
                                        });
                                        // Update next_service_date on the AMC record
                                        const nextDate = new Date(scheduleAmc.scheduledDate);
                                        nextDate.setMonth(nextDate.getMonth() + 1);
                                        await fetch(`/api/admin/amc?type=amc`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ id: amc.id, next_service_date: nextDate.toISOString().split('T')[0] })
                                        });
                                        setScheduleAmc(null);
                                        await fetchAll();
                                        alert('Service job scheduled successfully!');
                                    } catch (err) {
                                        console.error(err);
                                        alert('Failed to schedule service: ' + err.message);
                                    } finally {
                                        setLoading(false);
                                    }
                                }}>
                                Schedule Job
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TERMINATION MODAL ─── */}
            {terminateTarget && (() => {
                const { type, record } = terminateTarget;
                const isRental = type === 'rental';
                const monthlyAmt = isRental ? (parseFloat(record.monthly_rent) || 0) : (parseFloat(record.amc_amount) || 0);
                const endDate = record.end_date ? new Date(record.end_date) : null;
                const today = new Date();
                const remainingMs = endDate ? Math.max(0, endDate - today) : 0;
                const remainingMonths = endDate ? Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24 * 30))) : 0;
                const earlyTermDues = isRental ? remainingMonths * monthlyAmt : Math.round((remainingMs / (endDate - new Date(record.start_date))) * monthlyAmt * 100) / 100;

                return (
                    <TerminationModal
                        type={type}
                        record={record}
                        remainingMonths={remainingMonths}
                        earlyTermDues={earlyTermDues}
                        fmt={fmt}
                        fmtDate={fmtDate}
                        customerId={customerId}
                        onClose={() => setTerminateTarget(null)}
                        onSuccess={() => { setTerminateTarget(null); fetchAll(); }}
                    />
                );
            })()}
        </div>
    );
}

export default RentAMCTab;

function TerminationModal({ type, record, remainingMonths, earlyTermDues, fmt, fmtDate, customerId, onClose, onSuccess }) {
    const [termType, setTermType] = useState('customer'); // 'customer' | 'company'
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);

    const waived = termType === 'company';
    const duesAmount = waived ? 0 : earlyTermDues;
    const isRental = type === 'rental';
    const name = isRental
        ? (record.rental_plans?.product_name || record.product_name || 'Rental')
        : (record.plan_name || record.amc_plans?.name || 'AMC');

    const handleConfirm = async () => {
        if (!reason.trim()) { alert('Please enter a reason for termination.'); return; }
        setSaving(true);
        try {
            const today = new Date().toISOString();
            const terminationPayload = {
                id: record.id,
                status: 'terminated',
                terminated_at: today,
                termination_type: termType,
                termination_reason: reason,
                termination_waived: waived,
                early_termination_amount: duesAmount,
            };

            // 1. Update the contract record
            const apiUrl = isRental ? '/api/admin/rentals?type=rental' : '/api/admin/amc?type=amc';
            const res = await fetch(apiUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(terminationPayload),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'Failed to terminate');

            // 2. Auto-create a sales invoice if dues apply
            if (duesAmount > 0) {
                const accountName = record.customer_name || record.accounts?.name || '';
                const invoicePayload = {
                    account_id: customerId,
                    account_name: accountName,
                    date: today.split('T')[0],
                    items: JSON.stringify([{
                        description: `Early Termination — ${name} (${remainingMonths} month${remainingMonths !== 1 ? 's' : ''} remaining)`,
                        type: 'service',
                        qty: 1,
                        rate: duesAmount,
                        taxRate: 0,
                    }]),
                    subtotal: duesAmount,
                    total_amount: duesAmount,
                    cgst: 0, sgst: 0, igst: 0, total_tax: 0,
                    status: 'unpaid',
                    notes: `Early termination of ${isRental ? 'rental' : 'AMC'} contract. Reason: ${reason}`,
                };
                await fetch('/api/admin/transactions?type=sales', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(invoicePayload),
                });
            }

            onSuccess();
        } catch (err) {
            console.error(err);
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px' }}>
            <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '16px', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
                {/* Header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-primary)', background: 'rgba(239,68,68,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <XCircle size={18} /> Terminate {isRental ? 'Rental' : 'AMC'} Contract
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{name}</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>✕</button>
                </div>

                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Contract summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>CONTRACT END</div>
                            <div style={{ fontSize: '14px', fontWeight: 700 }}>{fmtDate(record.end_date)}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>REMAINING</div>
                            <div style={{ fontSize: '14px', fontWeight: 700 }}>{remainingMonths} month{remainingMonths !== 1 ? 's' : ''}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>{isRental ? 'MONTHLY RENT' : 'AMC AMOUNT'}</div>
                            <div style={{ fontSize: '14px', fontWeight: 700 }}>{fmt(isRental ? record.monthly_rent : record.amc_amount)}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>EARLY TERM DUES</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444' }}>{fmt(earlyTermDues)}</div>
                        </div>
                    </div>

                    {/* Termination type toggle */}
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>WHO IS TERMINATING?</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <button
                                onClick={() => setTermType('customer')}
                                style={{
                                    padding: '10px', borderRadius: '10px', border: `2px solid ${termType === 'customer' ? '#ef4444' : 'var(--border-primary)'}`,
                                    backgroundColor: termType === 'customer' ? 'rgba(239,68,68,0.1)' : 'var(--bg-secondary)',
                                    cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                                    color: termType === 'customer' ? '#ef4444' : 'var(--text-secondary)'
                                }}
                            >
                                Customer Initiated<br />
                                <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Dues apply — invoice raised</span>
                            </button>
                            <button
                                onClick={() => setTermType('company')}
                                style={{
                                    padding: '10px', borderRadius: '10px', border: `2px solid ${termType === 'company' ? '#f59e0b' : 'var(--border-primary)'}`,
                                    backgroundColor: termType === 'company' ? 'rgba(245,158,11,0.1)' : 'var(--bg-secondary)',
                                    cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                                    color: termType === 'company' ? '#f59e0b' : 'var(--text-secondary)'
                                }}
                            >
                                Company Initiated<br />
                                <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Dues waived — no invoice</span>
                            </button>
                        </div>
                    </div>

                    {/* Dues summary */}
                    <div style={{
                        padding: '10px 14px', borderRadius: '8px',
                        backgroundColor: waived ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${waived ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        fontSize: '13px', fontWeight: 600,
                        color: waived ? '#f59e0b' : '#ef4444'
                    }}>
                        {waived
                            ? '✓ Remaining dues waived — no invoice will be generated'
                            : `⚠ Sales invoice of ${fmt(earlyTermDues)} will be created for customer to clear`
                        }
                    </div>

                    {/* Reason */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>REASON FOR TERMINATION *</label>
                        <textarea
                            className="form-input"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            rows={3}
                            placeholder="Enter the reason for termination..."
                            style={{ width: '100%', resize: 'vertical', fontSize: '13px' }}
                        />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={onClose} className="btn btn-secondary" style={{ padding: '8px 16px' }} disabled={saving}>
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={saving}
                            style={{
                                padding: '8px 20px', backgroundColor: '#ef4444', color: '#fff',
                                border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer',
                                fontWeight: 700, fontSize: '13px', opacity: saving ? 0.7 : 1,
                                display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                            {saving ? 'Terminating...' : 'Confirm Termination'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
