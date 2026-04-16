'use client'

import { X, Calendar, Package, User, CheckCircle, XCircle, Clock, MapPin, Phone, ExternalLink } from 'lucide-react';

function RentalDetailsModal({ rental, onClose, onViewAccount }) {
    // Support both camelCase (old) and snake_case (Supabase)
    const customerName = rental.customer_name || rental.customerName || 'N/A';
    const productName  = rental.product_name  || rental.productName  || 'N/A';
    const serialNum    = rental.serial_number || rental.serialNumber  || 'N/A';
    const startDate    = rental.start_date    || rental.tenure?.startDate;
    const endDate      = rental.end_date      || rental.tenure?.endDate;
    const monthlyRent  = Number(rental.monthly_rent  || rental.monthlyRent  || 0);
    const secDeposit   = Number(rental.security_deposit || rental.securityDeposit || 0);
    const setupFee     = Number(rental.setup_fee  || rental.setupFee  || 0);
    const depositAmt   = Number(rental.deposit_amount || 0);
    const rentAdv      = Number(rental.rent_advance   || 0);
    const depositPaid  = rental.deposit_paid;
    const rentsPaid    = Number(rental.rents_paid     || 0);
    const rentsRem     = Number(rental.rents_remaining || 0);
    const totalRents   = rentsPaid + rentsRem;
    const progress     = totalRents > 0 ? Math.round((rentsPaid / totalRents) * 100) : 0;
    const nextDue      = rental.next_rent_due_date || rental.nextRentDueDate;
    const isOverdue    = nextDue && new Date(nextDue) < new Date();
    
    // Extracted account details
    const mobileNum = rental.accounts?.mobile || rental.accounts?.phone || '';
    let address = rental.accounts?.mailing_address || '';
    if (rental.accounts?.property && rental.accounts.property.length > 0) {
        const prop = rental.accounts.property[0];
        address = [prop.address, prop.locality, prop.city].filter(Boolean).join(', ');
    }

    const fmtAmt  = n  => `₹${n.toLocaleString()}`;
    const fmtDate = d  => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    const Card = ({ children, style }) => (
        <div style={{ padding: '14px 16px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', ...style }}>
            {children}
        </div>
    );

    const Row = ({ label, value, highlight }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: highlight || 'var(--text-primary)' }}>{value}</span>
        </div>
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={e => e.stopPropagation()}
                style={{ maxWidth: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

                <div className="modal-header" style={{ flexShrink: 0 }}>
                    <div>
                        <h2 className="modal-title">Rental Agreement Details</h2>
                        <span style={{
                            display: 'inline-block', marginTop: 4, padding: '2px 10px', fontSize: 11, fontWeight: 700,
                            borderRadius: 20, textTransform: 'uppercase',
                            backgroundColor: rental.status === 'active' ? '#10b98120' : '#ef444420',
                            color: rental.status === 'active' ? '#10b981' : '#ef4444'
                        }}>{rental.status || 'unknown'}</span>
                    </div>
                    <button className="btn-icon" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-content" style={{ padding: 'var(--spacing-lg)', overflowY: 'auto', flex: 1 }}>

                    {/* Customer & Product */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                        <Card style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <User size={14} color="var(--text-secondary)" />
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Customer</span>
                                </div>
                                {onViewAccount && rental.customer_id && (
                                    <button 
                                        onClick={() => { onClose(); onViewAccount(rental.customer_id); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                    >
                                        <ExternalLink size={12} /> View Account
                                    </button>
                                )}
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{customerName}</div>
                            
                            {mobileNum && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto', paddingTop: 8 }}>
                                    <Phone size={13} color="var(--text-secondary)" />
                                    <span style={{ fontSize: 13 }}>{mobileNum}</span>
                                    <a href={`tel:${mobileNum}`} style={{ marginLeft: 'auto', fontSize: 11, color: '#10b981', textDecoration: 'none', padding: '2px 8px', backgroundColor: '#10b98115', borderRadius: 4, fontWeight: 600 }}>Dial</a>
                                </div>
                            )}
                            {address && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-primary)' }}>
                                    <MapPin size={13} color="var(--text-secondary)" style={{ marginTop: 2, flexShrink: 0 }} />
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, flex: 1 }}>{address}</span>
                                    <a href={`https://maps.google.com/?q=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'none', padding: '2px 8px', backgroundColor: '#3b82f615', borderRadius: 4, fontWeight: 600 }}>Map</a>
                                </div>
                            )}
                        </Card>
                        <Card>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                <Package size={14} color="var(--text-secondary)" />
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Product</span>
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 700 }}>{productName}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>SN: {serialNum}</div>
                        </Card>
                    </div>

                    {/* Contract Dates */}
                    <Card style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Contract Period
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                            {[
                                ['Duration', rental.tenure?.duration ? `${rental.tenure.duration} ${rental.tenure.unit}` : '—'],
                                ['Start Date', fmtDate(startDate)],
                                ['End Date',   fmtDate(endDate)],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>{label}</div>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Financial Details */}
                    <Card style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Financial Summary
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                            <Row label="Monthly Rent"        value={fmtAmt(monthlyRent)} highlight="#10b981" />
                            <Row label="Security Deposit"   value={fmtAmt(secDeposit)} />
                            {setupFee > 0 && <Row label="Setup Fee" value={fmtAmt(setupFee)} />}
                            <div style={{ borderTop: '1px solid var(--border-primary)', margin: '6px 0', gridColumn: '1/-1' }} />
                            <Row label="Deposit Collected"  value={depositAmt > 0 ? fmtAmt(depositAmt) : '—'} />
                            <Row label="Deposit Status"     value={
                                depositPaid
                                    ? <span style={{ display:'flex', alignItems:'center', gap:4, color:'#10b981' }}><CheckCircle size={12}/> Paid</span>
                                    : secDeposit > depositAmt
                                        ? <span style={{ color:'#f59e0b' }}>Partial (₹{(secDeposit - depositAmt).toLocaleString()} pending)</span>
                                        : <span style={{ color:'var(--text-tertiary)' }}>—</span>
                            } />
                            {rentAdv > 0 && <Row label="Rent Advance" value={fmtAmt(rentAdv)} highlight="#6366f1" />}
                        </div>
                    </Card>

                    {/* Payment Progress */}
                    <Card style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Payment Progress
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 13 }}>{rentsPaid} of {totalRents || '?'} payments made</span>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{progress}%</span>
                        </div>
                        <div style={{ height: 8, backgroundColor: 'var(--bg-primary)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
                            <div style={{ height: '100%', width: `${progress}%`, backgroundColor: '#10b981', transition: 'width 0.3s' }} />
                        </div>
                        <Row label="Total Paid" value={fmtAmt(rentsPaid * monthlyRent)} highlight="#10b981" />
                        <Row label="Remaining"  value={rentsRem > 0 ? fmtAmt(rentsRem * monthlyRent) : '—'} />
                    </Card>

                    {/* Next Due */}
                    <div style={{
                        padding: '14px 16px', borderRadius: 'var(--radius-md)',
                        backgroundColor: isOverdue ? '#ef444410' : '#3b82f610',
                        border: `1px solid ${isOverdue ? '#ef4444' : '#3b82f6'}`
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            {isOverdue ? <XCircle size={15} color="#ef4444" /> : <Clock size={15} color="#3b82f6" />}
                            <span style={{ fontSize: 13, fontWeight: 600, color: isOverdue ? '#ef4444' : '#3b82f6' }}>
                                {isOverdue ? 'Overdue' : 'Next Payment Due'}
                            </span>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>
                            {nextDue ? fmtDate(nextDue) : 'Not set'} &nbsp;·&nbsp; {fmtAmt(monthlyRent)}
                        </div>
                    </div>

                    {/* Notes */}
                    {rental.notes && (
                        <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', fontSize: 13 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4, textTransform: 'uppercase' }}>Notes</div>
                            {rental.notes}
                        </div>
                    )}
                </div>

                <div className="modal-footer" style={{ flexShrink: 0 }}>
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

export default RentalDetailsModal;
