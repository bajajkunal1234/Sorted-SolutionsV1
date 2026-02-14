'use client'

import { useState } from 'react';
import { Package, Plus, Edit2, Trash2, TrendingUp, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import { rentalPlans, activeRentals } from '@/lib/data/rentalsAmcData';
import RentalPlanForm from './RentalPlanForm';
import NewRentalForm from './NewRentalForm';
import CollectRentForm from './CollectRentForm';
import RentalDetailsModal from './RentalDetailsModal';

function RentalsTab() {
    const [activeView, setActiveView] = useState('active'); // active, plans, analytics
    const [showPlanForm, setShowPlanForm] = useState(false);
    const [showNewRentalForm, setShowNewRentalForm] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [showCollectRentForm, setShowCollectRentForm] = useState(false);
    const [selectedRentalForPayment, setSelectedRentalForPayment] = useState(null);
    const [showRentalDetails, setShowRentalDetails] = useState(false);
    const [selectedRentalForDetails, setSelectedRentalForDetails] = useState(null);
    const [onNewCustomerCallback, setOnNewCustomerCallback] = useState(null);

    // Calculate analytics
    const totalActiveRentals = activeRentals.length;
    const monthlyRentalIncome = activeRentals.reduce((sum, rental) => sum + rental.monthlyRent, 0);
    const totalDepositHeld = activeRentals.reduce((sum, rental) => sum + rental.securityDeposit, 0);
    const overdueRentals = activeRentals.filter(r => new Date(r.nextRentDueDate) < new Date()).length;

    return (
        <div style={{ padding: 'var(--spacing-lg)' }}>
            {/* Header */}
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-sm)' }}>
                    Rental Management
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                    Manage rental plans, track active rentals, and monitor rental income
                </p>
            </div>

            {/* Analytics Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 'var(--spacing-md)',
                marginBottom: 'var(--spacing-lg)'
            }}>
                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Active Rentals</span>
                        <Package size={20} color="#10b981" />
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#10b981' }}>
                        {totalActiveRentals}
                    </div>
                </div>

                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Monthly Income</span>
                        <TrendingUp size={20} color="#3b82f6" />
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#3b82f6' }}>
                        ₹{monthlyRentalIncome.toLocaleString()}
                    </div>
                </div>

                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Deposit Held</span>
                        <DollarSign size={20} color="#f59e0b" />
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#f59e0b' }}>
                        ₹{totalDepositHeld.toLocaleString()}
                    </div>
                </div>

                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Overdue</span>
                        <AlertCircle size={20} color="#ef4444" />
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#ef4444' }}>
                        {overdueRentals}
                    </div>
                </div>
            </div>

            {/* View Tabs */}
            <div style={{
                display: 'flex',
                gap: 'var(--spacing-sm)',
                marginBottom: 'var(--spacing-lg)',
                borderBottom: '1px solid var(--border-primary)'
            }}>
                {['active', 'plans'].map(view => (
                    <button
                        key={view}
                        onClick={() => setActiveView(view)}
                        style={{
                            padding: 'var(--spacing-sm) var(--spacing-md)',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeView === view ? '2px solid var(--color-primary)' : '2px solid transparent',
                            color: activeView === view ? 'var(--color-primary)' : 'var(--text-secondary)',
                            fontWeight: activeView === view ? 600 : 400,
                            cursor: 'pointer',
                            fontSize: 'var(--font-size-sm)',
                            textTransform: 'capitalize'
                        }}
                    >
                        {view === 'active' ? 'Active Rentals' : view === 'plans' ? 'Rental Plans' : 'Analytics'}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            {activeView === 'active' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>Active Rentals</h3>
                        <button
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                            onClick={() => setShowNewRentalForm(true)}
                        >
                            <Plus size={16} />
                            New Rental
                        </button>
                    </div>

                    {/* Rentals List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        {activeRentals.map(rental => (
                            <div key={rental.id} style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'var(--bg-elevated)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--border-primary)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                                {rental.productName}
                                            </h4>
                                            <span style={{
                                                padding: '2px 8px',
                                                backgroundColor: rental.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                color: rental.status === 'active' ? '#10b981' : '#ef4444',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: 'var(--font-size-xs)',
                                                fontWeight: 600,
                                                textTransform: 'uppercase'
                                            }}>
                                                {rental.status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                                            {rental.customerName} • SN: {rental.serialNumber}
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                                            <div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Monthly Rent</div>
                                                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>₹{rental.monthlyRent.toLocaleString()}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Tenure</div>
                                                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                                    {rental.tenure.duration} {rental.tenure.unit}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Next Rent Due</div>
                                                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: new Date(rental.nextRentDueDate) < new Date() ? '#ef4444' : 'inherit' }}>
                                                    {new Date(rental.nextRentDueDate).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Deposit</div>
                                                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>₹{rental.securityDeposit.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                                            onClick={() => {
                                                setSelectedRentalForPayment(rental);
                                                setShowCollectRentForm(true);
                                            }}
                                        >
                                            Collect Rent
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                                            onClick={() => {
                                                setSelectedRentalForDetails(rental);
                                                setShowRentalDetails(true);
                                            }}
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeView === 'plans' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>Rental Plans</h3>
                        <button
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                            onClick={() => setShowPlanForm(true)}
                        >
                            <Plus size={16} />
                            Create Plan
                        </button>
                    </div>

                    {/* Plans Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--spacing-md)' }}>
                        {rentalPlans.map(plan => (
                            <div key={plan.id} style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'var(--bg-elevated)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--border-primary)'
                            }}>
                                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                                        {plan.productName}
                                    </h4>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        {plan.category}
                                    </div>
                                </div>

                                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-xs)' }}>
                                        Pricing Tiers
                                    </div>
                                    {plan.tenureOptions.slice(0, 3).map((option, idx) => (
                                        <div key={idx} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: 'var(--font-size-sm)',
                                            marginBottom: '4px'
                                        }}>
                                            <span>{option.duration} {option.unit}</span>
                                            <span style={{ fontWeight: 600 }}>₹{option.monthlyRent}/mo</span>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-md)' }}>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ flex: 1, padding: '6px', fontSize: 'var(--font-size-sm)' }}
                                        onClick={() => setEditingPlan(plan)}
                                    >
                                        <Edit2 size={14} style={{ marginRight: '4px' }} />
                                        Edit
                                    </button>
                                    <button
                                        className="btn"
                                        style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)', backgroundColor: '#ef4444' }}
                                        onClick={() => {
                                            if (window.confirm(`Delete rental plan: ${plan.productName}?\n\nThis action cannot be undone.`)) {
                                                alert('Plan deleted successfully!');
                                            }
                                        }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeView === 'analytics' && (
                <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                        Rental Analytics
                    </h3>
                    <div style={{
                        padding: 'var(--spacing-xl)',
                        backgroundColor: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-lg)',
                        textAlign: 'center',
                        border: '1px solid var(--border-primary)'
                    }}>
                        <Calendar size={48} color="var(--text-tertiary)" style={{ margin: '0 auto var(--spacing-md)' }} />
                        <p style={{ color: 'var(--text-secondary)' }}>Analytics dashboard coming soon</p>
                    </div>
                </div>
            )}

            {/* Forms */}
            {showPlanForm && (
                <RentalPlanForm
                    plan={editingPlan}
                    onClose={() => {
                        setShowPlanForm(false);
                        setEditingPlan(null);
                    }}
                    onSave={(planData) => {
                        console.log('Rental Plan saved:', planData);
                        setShowPlanForm(false);
                        setEditingPlan(null);
                    }}
                />
            )}

            {showNewRentalForm && (
                <NewRentalForm
                    onClose={() => setShowNewRentalForm(false)}
                    onSave={(rentalData) => {
                        console.log('New Rental saved:', rentalData);
                        setShowNewRentalForm(false);
                    }}
                    onNewCustomer={(callback) => {
                        setOnNewCustomerCallback(() => callback);
                        // This will be handled by parent component to open NewAccountForm
                        alert('Please integrate with AccountsTab to open NewAccountForm with type="customer" preselected');
                    }}
                />
            )}

            {showCollectRentForm && selectedRentalForPayment && (
                <CollectRentForm
                    rental={selectedRentalForPayment}
                    onClose={() => {
                        setShowCollectRentForm(false);
                        setSelectedRentalForPayment(null);
                    }}
                    onSave={(paymentData) => {
                        console.log('Rent payment collected:', paymentData);
                        setShowCollectRentForm(false);
                        setSelectedRentalForPayment(null);
                    }}
                />
            )}

            {showRentalDetails && selectedRentalForDetails && (
                <RentalDetailsModal
                    rental={selectedRentalForDetails}
                    onClose={() => {
                        setShowRentalDetails(false);
                        setSelectedRentalForDetails(null);
                    }}
                />
            )}
        </div>
    );
}

export default RentalsTab;
