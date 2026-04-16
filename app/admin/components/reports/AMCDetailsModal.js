'use client'

import { X, Calendar, Package, User, CheckCircle, XCircle, Clock, MapPin, Phone, ExternalLink, PenTool } from 'lucide-react';

function AMCDetailsModal({ amc, onClose, onViewAccount }) {
    // Support both camelCase (old) and snake_case (Supabase)
    const customerName = amc.accounts?.name || amc.customer_name || amc.customerName || 'N/A';
    const planName     = amc.plan_name || amc.amc_plans?.name || 'Custom Plan';
    const productName  = `${amc.product_brand || ''} ${amc.product_model || ''}`.trim() || 'N/A';
    const startDate    = amc.start_date;
    const endDate      = amc.end_date;
    const amount       = Number(amc.amc_amount || 0);
    const jobsCount    = amc.jobs?.length || 0;
    
    // Extracted account details
    const mobileNum    = amc.accounts?.mobile || amc.accounts?.phone || '';
    let address      = amc.accounts?.mailing_address || '';
    if (amc.accounts?.property && amc.accounts.property.length > 0) {
        const prop = amc.accounts.property[0];
        address = [prop.address, prop.locality, prop.city].filter(Boolean).join(', ');
    }

    const isExpiring   = endDate && new Date(endDate) <= new Date(Date.now() + 30*24*60*60*1000);
    const isExpired    = endDate && new Date(endDate) < new Date();

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
                        <h2 className="modal-title">AMC Agreement Details</h2>
                        <span style={{
                            display: 'inline-block', marginTop: 4, padding: '2px 10px', fontSize: 11, fontWeight: 700,
                            borderRadius: 20, textTransform: 'uppercase',
                            backgroundColor: amc.status === 'active' ? '#10b98120' : '#ef444420',
                            color: amc.status === 'active' ? '#10b981' : '#ef4444'
                        }}>{amc.status === 'active' ? 'Active AMC' : (amc.status || 'unknown')}</span>
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
                                {onViewAccount && amc.account_id && (
                                    <button 
                                        onClick={() => { onClose(); onViewAccount(amc.account_id); }}
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
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Plan: {planName}</div>
                        </Card>
                    </div>

                    {/* Contract Dates */}
                    <Card style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            AMC Duration Options
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                            {[
                                ['Plan Value', fmtAmt(amount)],
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

                    {/* Expiry Warning */}
                    {isExpired || isExpiring ? (
                        <div style={{
                            padding: '14px 16px', borderRadius: 'var(--radius-md)', marginBottom: 16,
                            backgroundColor: isExpired ? '#ef444410' : '#f59e0b10',
                            border: `1px solid ${isExpired ? '#ef4444' : '#f59e0b'}`
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                {isExpired ? <XCircle size={15} color="#ef4444" /> : <Clock size={15} color="#f59e0b" />}
                                <span style={{ fontSize: 13, fontWeight: 600, color: isExpired ? '#ef4444' : '#f59e0b' }}>
                                    {isExpired ? 'AMC Expired' : 'AMC Expiring Soon'}
                                </span>
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 700 }}>
                                {fmtDate(endDate)} 
                            </div>
                        </div>
                    ) : null}

                    {/* Service Progress */}
                    <Card style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Service Summary
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                             <PenTool size={16} color="#6366f1" />
                             <div>
                                 <div style={{ fontSize: 14, fontWeight: 600 }}>{jobsCount} Linked Job{jobsCount === 1 ? '' : 's'}</div>
                                 <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Service records created against this contract</div>
                             </div>
                        </div>
                    </Card>
                    
                    {/* Notes */}
                    {amc.notes && (
                        <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', fontSize: 13 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4, textTransform: 'uppercase' }}>Notes</div>
                            {amc.notes}
                        </div>
                    )}
                </div>

                <div className="modal-footer" style={{ flexShrink: 0 }}>
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                    <button className="btn btn-primary" onClick={() => { alert('Schedule routing not implemented in modal directly yet.'); onClose(); }}>Schedule Service</button>
                </div>
            </div>
        </div>
    );
}

export default AMCDetailsModal;
