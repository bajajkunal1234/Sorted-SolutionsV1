'use client'

import { User, Phone, Mail, MapPin, Briefcase, TrendingUp, TrendingDown, Building } from 'lucide-react';
import { formatCurrency, getGroupPath } from '@/lib/utils/accountingHelpers';
import { accountGroups } from '@/lib/data/accountingData';

function AccountsDetailsView({ accounts, onAccountClick }) {
    return (
        <div style={{ padding: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {accounts.map(account => {
                    const isPositive = (account.closingBalance || 0) >= 0;
                    const groupPath = getGroupPath(account.under, accountGroups);

                    return (
                        <div
                            key={account.id}
                            onClick={() => onAccountClick?.(account)}
                            style={{
                                backgroundColor: 'var(--bg-elevated)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-lg)',
                                padding: 'var(--spacing-lg)',
                                cursor: 'pointer',
                                transition: 'all var(--transition-fast)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateX(4px)';
                                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                                e.currentTarget.style.borderColor = 'var(--color-primary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateX(0)';
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.borderColor = 'var(--border-primary)';
                            }}
                        >
                            {/* Header Row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: 'var(--radius-md)',
                                            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <User size={20} style={{ color: 'var(--text-inverse)' }} />
                                        </div>
                                        <div>
                                            <h3 style={{
                                                fontSize: 'var(--font-size-lg)',
                                                fontWeight: 600,
                                                color: 'var(--text-primary)',
                                                margin: 0
                                            }}>
                                                {account.name}
                                            </h3>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                                                {account.sku}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    padding: '8px 16px',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 600,
                                    backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: isPositive ? 'var(--color-success)' : 'var(--color-danger)',
                                    textTransform: 'capitalize'
                                }}>
                                    {isPositive ? 'Receivable' : 'Payable'}
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: 'var(--spacing-md)',
                                marginBottom: 'var(--spacing-md)'
                            }}>
                                {/* Type & Group */}
                                <div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                        Type & Group
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                        <Building size={14} style={{ color: 'var(--text-secondary)' }} />
                                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                                            {account.type}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        {groupPath}
                                    </div>
                                </div>

                                {/* Contact Info */}
                                {(account.phone || account.email) && (
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                            Contact
                                        </div>
                                        {account.phone && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: '2px' }}>
                                                <Phone size={12} style={{ color: 'var(--text-tertiary)' }} />
                                                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                                    {account.phone}
                                                </span>
                                            </div>
                                        )}
                                        {account.email && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                                <Mail size={12} style={{ color: 'var(--text-tertiary)' }} />
                                                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                                    {account.email}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Jobs Done */}
                                {account.jobsDone > 0 && (
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                            Jobs Completed
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                            <Briefcase size={14} style={{ color: 'var(--text-secondary)' }} />
                                            <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                {account.jobsDone}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Address */}
                            {account.address && (
                                <div style={{
                                    padding: 'var(--spacing-sm)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-sm)',
                                    marginBottom: 'var(--spacing-md)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-xs)' }}>
                                        <MapPin size={14} style={{ color: 'var(--text-tertiary)', marginTop: '2px' }} />
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                            {account.address.street}<br />
                                            {account.address.city}, {account.address.state} {account.address.pincode}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Balance Row */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: 'var(--spacing-md)',
                                backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                <div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                                        {isPositive ? 'Amount to Receive' : 'Amount to Pay'}
                                    </div>
                                    <div style={{
                                        fontSize: 'var(--font-size-2xl)',
                                        fontWeight: 700,
                                        color: isPositive ? 'var(--color-success)' : 'var(--color-danger)'
                                    }}>
                                        {formatCurrency(Math.abs(account.closingBalance))}
                                    </div>
                                </div>
                                {isPositive ? (
                                    <TrendingUp size={40} style={{ color: 'var(--color-success)', opacity: 0.5 }} />
                                ) : (
                                    <TrendingDown size={40} style={{ color: 'var(--color-danger)', opacity: 0.5 }} />
                                )}
                            </div>

                            {/* GST Info */}
                            {account.gstin && (
                                <div style={{
                                    marginTop: 'var(--spacing-sm)',
                                    padding: 'var(--spacing-sm)',
                                    backgroundColor: 'var(--bg-tertiary)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--text-secondary)',
                                    fontFamily: 'monospace'
                                }}>
                                    GSTIN: {account.gstin}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {accounts.length === 0 && (
                <div style={{
                    padding: 'var(--spacing-2xl)',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)'
                }}>
                    No accounts found. Try adjusting your filters.
                </div>
            )}
        </div>
    );
}

export default AccountsDetailsView;
