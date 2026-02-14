'use client'

import { X, Calendar, DollarSign, Package, User, MapPin } from 'lucide-react';

function RentalDetailsModal({ rental, onClose }) {
    const progressPercentage = (rental.rentsPaid / (rental.rentsPaid + rental.rentsRemaining)) * 100;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                <div className="modal-header">
                    <h2 className="modal-title">Rental Agreement Details</h2>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-content" style={{ padding: 'var(--spacing-lg)' }}>
                    {/* Status Badge */}
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <span style={{
                            padding: '4px 12px',
                            backgroundColor: rental.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: rental.status === 'active' ? '#10b981' : '#ef4444',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 600,
                            textTransform: 'uppercase'
                        }}>
                            {rental.status}
                        </span>
                    </div>

                    {/* Customer & Product Info */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 'var(--spacing-md)',
                        marginBottom: 'var(--spacing-lg)'
                    }}>
                        <div style={{
                            padding: 'var(--spacing-md)',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)' }}>
                                <User size={16} color="var(--text-secondary)" />
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Customer</span>
                            </div>
                            <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                                {rental.customerName}
                            </div>
                        </div>

                        <div style={{
                            padding: 'var(--spacing-md)',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)' }}>
                                <Package size={16} color="var(--text-secondary)" />
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Product</span>
                            </div>
                            <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                                {rental.productName}
                            </div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                SN: {rental.serialNumber}
                            </div>
                        </div>
                    </div>

                    {/* Financial Details */}
                    <div style={{
                        padding: 'var(--spacing-md)',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--spacing-lg)'
                    }}>
                        <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                            Financial Details
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-md)' }}>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Monthly Rent</div>
                                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: '#10b981' }}>
                                    ₹{rental.monthlyRent.toLocaleString()}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Security Deposit</div>
                                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>
                                    ₹{rental.securityDeposit.toLocaleString()}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Setup Fee</div>
                                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>
                                    ₹{rental.setupFee?.toLocaleString() || 0}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tenure Details */}
                    <div style={{
                        padding: 'var(--spacing-md)',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--spacing-lg)'
                    }}>
                        <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                            Tenure & Payment Progress
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Duration</div>
                                <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                                    {rental.tenure.duration} {rental.tenure.unit}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Start Date</div>
                                <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                                    {new Date(rental.tenure.startDate).toLocaleDateString()}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>End Date</div>
                                <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                                    {new Date(rental.tenure.endDate).toLocaleDateString()}
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                    Payments: {rental.rentsPaid} / {rental.rentsPaid + rental.rentsRemaining}
                                </span>
                                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                                    {Math.round(progressPercentage)}%
                                </span>
                            </div>
                            <div style={{
                                height: '8px',
                                backgroundColor: 'var(--bg-primary)',
                                borderRadius: 'var(--radius-sm)',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${progressPercentage}%`,
                                    backgroundColor: '#10b981',
                                    transition: 'width var(--transition-normal)'
                                }} />
                            </div>
                        </div>
                    </div>

                    {/* Next Payment */}
                    <div style={{
                        padding: 'var(--spacing-md)',
                        backgroundColor: new Date(rental.nextRentDueDate) < new Date() ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${new Date(rental.nextRentDueDate) < new Date() ? '#ef4444' : '#3b82f6'}`
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)' }}>
                            <Calendar size={16} color={new Date(rental.nextRentDueDate) < new Date() ? '#ef4444' : '#3b82f6'} />
                            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                {new Date(rental.nextRentDueDate) < new Date() ? 'Overdue Payment' : 'Next Payment Due'}
                            </span>
                        </div>
                        <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 700 }}>
                            {new Date(rental.nextRentDueDate).toLocaleDateString()} • ₹{rental.monthlyRent.toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default RentalDetailsModal;





