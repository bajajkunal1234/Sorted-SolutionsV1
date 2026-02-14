'use client'

import { useState } from 'react';
import { Package, Shield, Calendar, DollarSign, Wrench, TrendingUp } from 'lucide-react';
import { activeRentals, activeAMCs } from '../../data/rentalsAmcData';

function RentAMCTab({ customerId }) {
    // Filter rentals and AMCs for this customer
    const customerRentals = activeRentals.filter(r => r.customerId === customerId);
    const customerAMCs = activeAMCs.filter(a => a.customerId === customerId);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            {/* Rentals Section */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                    <Package size={20} color="#10b981" />
                    <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, margin: 0 }}>
                        Active Rentals
                    </h3>
                    <span style={{
                        padding: '2px 8px',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        color: '#10b981',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 600
                    }}>
                        {customerRentals.length}
                    </span>
                </div>

                {customerRentals.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {customerRentals.map(rental => (
                            <div
                                key={rental.id}
                                style={{
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: 'var(--bg-elevated)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '2px solid #10b981'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                                    <div>
                                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                                            {rental.productName}
                                        </h4>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                            SN: {rental.serialNumber} • {rental.id}
                                        </div>
                                    </div>
                                    <span style={{
                                        padding: '4px 12px',
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: 'var(--font-size-xs)',
                                        fontWeight: 600,
                                        textTransform: 'uppercase'
                                    }}>
                                        {rental.status}
                                    </span>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                    gap: 'var(--spacing-md)',
                                    marginBottom: 'var(--spacing-md)'
                                }}>
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Monthly Rent</div>
                                        <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: '#10b981' }}>
                                            ₹{rental.monthlyRent.toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Security Deposit</div>
                                        <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                                            ₹{rental.securityDeposit.toLocaleString()}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: rental.depositPaid ? '#10b981' : '#ef4444' }}>
                                            {rental.depositPaid ? '✓ Paid' : '✗ Pending'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Tenure</div>
                                        <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                                            {rental.tenure.duration} {rental.tenure.unit}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                            {new Date(rental.tenure.startDate).toLocaleDateString()} - {new Date(rental.tenure.endDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Next Rent Due</div>
                                        <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: new Date(rental.nextRentDueDate) < new Date() ? '#ef4444' : '#f59e0b' }}>
                                            {new Date(rental.nextRentDueDate).toLocaleDateString()}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                            {rental.rentsPaid}/{rental.rentsPaid + rental.rentsRemaining} paid
                                        </div>
                                    </div>
                                </div>

                                {/* Service Info */}
                                {rental.nextServiceDate && (
                                    <div style={{
                                        padding: 'var(--spacing-sm)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: 'var(--font-size-sm)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', color: 'var(--text-secondary)' }}>
                                            <Wrench size={14} />
                                            Next Service: {new Date(rental.nextServiceDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                )}

                                {/* Quick Actions */}
                                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-md)' }}>
                                    <button className="btn btn-secondary" style={{ flex: 1, padding: '6px', fontSize: 'var(--font-size-sm)' }}>
                                        <DollarSign size={14} />
                                        Collect Rent
                                    </button>
                                    <button className="btn btn-secondary" style={{ flex: 1, padding: '6px', fontSize: 'var(--font-size-sm)' }}>
                                        <Calendar size={14} />
                                        Schedule Service
                                    </button>
                                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}>
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{
                        padding: 'var(--spacing-lg)',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center',
                        color: 'var(--text-tertiary)',
                        border: '2px dashed var(--border-primary)'
                    }}>
                        <Package size={32} style={{ margin: '0 auto var(--spacing-sm)', opacity: 0.5 }} />
                        <p style={{ fontSize: 'var(--font-size-sm)' }}>No active rentals</p>
                    </div>
                )}
            </div>

            {/* AMCs Section */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                    <Shield size={20} color="#8b5cf6" />
                    <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, margin: 0 }}>
                        Active AMCs
                    </h3>
                    <span style={{
                        padding: '2px 8px',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        color: '#8b5cf6',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 600
                    }}>
                        {customerAMCs.length}
                    </span>
                </div>

                {customerAMCs.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {customerAMCs.map(amc => (
                            <div
                                key={amc.id}
                                style={{
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: 'var(--bg-elevated)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '2px solid #8b5cf6'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                                    <div>
                                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                                            {amc.planName}
                                        </h4>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                            {amc.productBrand} {amc.productModel} • {amc.id}
                                        </div>
                                    </div>
                                    <span style={{
                                        padding: '4px 12px',
                                        backgroundColor: '#8b5cf6',
                                        color: 'white',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: 'var(--font-size-xs)',
                                        fontWeight: 600,
                                        textTransform: 'uppercase'
                                    }}>
                                        {amc.status}
                                    </span>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                    gap: 'var(--spacing-md)',
                                    marginBottom: 'var(--spacing-md)'
                                }}>
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>AMC Amount</div>
                                        <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: '#8b5cf6' }}>
                                            ₹{amc.amcAmount.toLocaleString()}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: amc.paymentStatus === 'paid' ? '#10b981' : '#ef4444' }}>
                                            {amc.paymentStatus === 'paid' ? '✓ Paid' : '✗ Pending'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Contract Period</div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                            {new Date(amc.startDate).toLocaleDateString()}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                            to {new Date(amc.endDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Next Service</div>
                                        <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: '#f59e0b' }}>
                                            {amc.nextServiceDate ? new Date(amc.nextServiceDate).toLocaleDateString() : 'Not scheduled'}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                            {amc.nextServiceType || 'N/A'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Services Done</div>
                                        <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                                            {amc.servicesCompleted.length}
                                        </div>
                                    </div>
                                </div>

                                {/* Services Remaining */}
                                <div style={{
                                    padding: 'var(--spacing-sm)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-sm)',
                                    marginBottom: 'var(--spacing-sm)'
                                }}>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-xs)' }}>
                                        Services Remaining
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap', fontSize: 'var(--font-size-sm)' }}>
                                        {Object.entries(amc.servicesRemaining).map(([service, count]) => (
                                            <div key={service}>
                                                <span style={{ fontWeight: 600, color: '#8b5cf6' }}>{count}x</span> {service}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                    <button className="btn btn-secondary" style={{ flex: 1, padding: '6px', fontSize: 'var(--font-size-sm)' }}>
                                        <Calendar size={14} />
                                        Schedule Service
                                    </button>
                                    <button className="btn btn-secondary" style={{ flex: 1, padding: '6px', fontSize: 'var(--font-size-sm)' }}>
                                        <TrendingUp size={14} />
                                        Renew AMC
                                    </button>
                                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}>
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{
                        padding: 'var(--spacing-lg)',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center',
                        color: 'var(--text-tertiary)',
                        border: '2px dashed var(--border-primary)'
                    }}>
                        <Shield size={32} style={{ margin: '0 auto var(--spacing-sm)', opacity: 0.5 }} />
                        <p style={{ fontSize: 'var(--font-size-sm)' }}>No active AMCs</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default RentAMCTab;




