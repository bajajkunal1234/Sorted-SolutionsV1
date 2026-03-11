import { useState, useEffect, useMemo } from 'react';
import { Package, Plus, Edit2, Trash2, TrendingUp, DollarSign, Calendar, AlertCircle, RefreshCcw } from 'lucide-react';
import { rentalsAPI } from '@/lib/adminAPI';
import RentalPlanForm from './RentalPlanForm';
import NewRentalForm from './NewRentalForm';
import CollectRentForm from './CollectRentForm';
import RentalDetailsModal from './RentalDetailsModal';

function RentalsTab() {
    const [activeView, setActiveView] = useState('active'); // active, plans, analytics
    const [plans, setPlans] = useState([]);
    const [activeRentals, setActiveRentals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showPlanForm, setShowPlanForm] = useState(false);
    const [showNewRentalForm, setShowNewRentalForm] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [showCollectRentForm, setShowCollectRentForm] = useState(false);
    const [selectedRentalForPayment, setSelectedRentalForPayment] = useState(null);
    const [showRentalDetails, setShowRentalDetails] = useState(false);
    const [selectedRentalForDetails, setSelectedRentalForDetails] = useState(null);
    const [onNewCustomerCallback, setOnNewCustomerCallback] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [plansData, activeData] = await Promise.all([
                rentalsAPI.getPlans(),
                rentalsAPI.getActive()
            ]);
            setPlans(plansData || []);
            setActiveRentals(activeData || []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch rental data:', err);
            setError('Failed to load rental data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Calculate analytics
    const stats = useMemo(() => {
        const totalActive = activeRentals.length;
        const monthlyIncome = activeRentals.reduce((sum, rental) => sum + (Number(rental.monthly_rent) || 0), 0);
        const depositHeld = activeRentals.reduce((sum, rental) => sum + (Number(rental.security_deposit) || 0), 0);
        const overdue = activeRentals.filter(r => r.next_rent_due_date && new Date(r.next_rent_due_date) < new Date()).length;

        return { totalActive, monthlyIncome, depositHeld, overdue };
    }, [activeRentals]);

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
                        {stats.totalActive}
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
                        ₹{stats.monthlyIncome.toLocaleString()}
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
                        ₹{stats.depositHeld.toLocaleString()}
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
                        {stats.overdue}
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
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <button
                                className={`btn ${loading ? 'btn-secondary' : 'btn-primary'}`}
                                style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                                onClick={fetchData}
                                disabled={loading}
                            >
                                <RefreshCcw size={16} className={loading ? 'spin' : ''} />
                                {loading ? 'Refreshing...' : 'Refresh'}
                            </button>
                            <button
                                className="btn btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                                onClick={() => setShowNewRentalForm(true)}
                            >
                                <Plus size={16} />
                                New Rental
                            </button>
                        </div>
                    </div>

                    {/* Rentals List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', position: 'relative' }}>
                        {loading && activeRentals.length === 0 ? (
                            <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                <RefreshCcw size={48} className="spin" style={{ margin: '0 auto var(--spacing-md)', opacity: 0.5 }} />
                                <p>Loading active rentals...</p>
                            </div>
                        ) : error ? (
                            <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--color-danger)' }}>
                                <AlertCircle size={48} style={{ margin: '0 auto var(--spacing-md)', opacity: 0.5 }} />
                                <p>{error}</p>
                                <button className="btn btn-primary" onClick={fetchData} style={{ marginTop: 'var(--spacing-md)' }}>Retry</button>
                            </div>
                        ) : activeRentals.length === 0 ? (
                            <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
                                <Package size={48} style={{ margin: '0 auto var(--spacing-md)', opacity: 0.5 }} />
                                <p>No active rentals found.</p>
                            </div>
                        ) : (
                            activeRentals.map(rental => {
                                const productName = rental.rental_plans?.product_name || 'Unknown Product';
                                const customerName = rental.accounts?.name || 'Unknown Customer';
                                const monthlyRent = Number(rental.monthly_rent) || 0;
                                const securityDeposit = Number(rental.security_deposit) || 0;

                                return (
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
                                                        {productName}
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
                                                    {customerName} • SN: {rental.serial_number || 'N/A'}
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                                                    <div>
                                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Monthly Rent</div>
                                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>₹{monthlyRent.toLocaleString()}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Tenure</div>
                                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                                            {rental.tenure?.duration} {rental.tenure?.unit}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Next Rent Due</div>
                                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: (rental.next_rent_due_date && new Date(rental.next_rent_due_date) < new Date()) ? '#ef4444' : 'inherit' }}>
                                                            {rental.next_rent_due_date ? new Date(rental.next_rent_due_date).toLocaleDateString() : 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Deposit</div>
                                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>₹{securityDeposit.toLocaleString()}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                                                    onClick={() => {
                                                        setSelectedRentalForPayment({ ...rental, productName, customerName, monthlyRent, securityDeposit });
                                                        setShowCollectRentForm(true);
                                                    }}
                                                >
                                                    Collect Rent
                                                </button>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                                                    onClick={() => {
                                                        setSelectedRentalForDetails({ ...rental, productName, customerName, monthlyRent, securityDeposit });
                                                        setShowRentalDetails(true);
                                                    }}
                                                >
                                                    View Details
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--spacing-md)', position: 'relative' }}>
                        {loading && plans.length === 0 ? (
                            <div style={{ gridColumn: '1 / -1', padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                <RefreshCcw size={48} className="spin" style={{ margin: '0 auto var(--spacing-md)', opacity: 0.5 }} />
                                <p>Loading rental plans...</p>
                            </div>
                        ) : plans.length === 0 ? (
                            <div style={{ gridColumn: '1 / -1', padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
                                <Package size={48} style={{ margin: '0 auto var(--spacing-md)', opacity: 0.5 }} />
                                <p>No rental plans found.</p>
                            </div>
                        ) : (
                            plans.map(plan => (
                                <div key={plan.id} style={{
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: 'var(--bg-elevated)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid var(--border-primary)'
                                }}>
                                    <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                                            {plan.product_name}
                                        </h4>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                            {plan.category}
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-xs)' }}>
                                            Pricing Tiers
                                        </div>
                                        {Array.isArray(plan.tenure_options) && plan.tenure_options.slice(0, 3).map((option, idx) => (
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
                                            onClick={() => { setEditingPlan(plan); setShowPlanForm(true); }}
                                        >
                                            <Edit2 size={14} style={{ marginRight: '4px' }} />
                                            Edit
                                        </button>
                                        <button
                                            className="btn"
                                            style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)', backgroundColor: '#ef4444' }}
                                            onClick={async () => {
                                                if (window.confirm(`Delete rental plan: ${plan.product_name}?\n\nThis action cannot be undone.`)) {
                                                    try {
                                                        await rentalsAPI.updatePlan(plan.id, { is_active: false });
                                                        await fetchData();
                                                    } catch (err) {
                                                        alert('Failed to delete plan');
                                                    }
                                                }
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
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
                    plan={editingPlan ? {
                        id: editingPlan.id,
                        productName: editingPlan.product_name,
                        category: editingPlan.category,
                        tenureOptions: editingPlan.tenure_options,
                        includedServices: editingPlan.included_services,
                        freeVisits: editingPlan.free_visits,
                        terms: editingPlan.terms,
                        isActive: editingPlan.is_active
                    } : null}
                    onClose={() => {
                        setShowPlanForm(false);
                        setEditingPlan(null);
                    }}
                    onSave={async (planData) => {
                        try {
                            setLoading(true);
                            const payload = {
                                product_name: planData.productName,
                                category: planData.category,
                                tenure_options: planData.tenureOptions,
                                included_services: planData.includedServices,
                                free_visits: planData.freeVisits,
                                terms: planData.terms,
                                is_active: planData.isActive
                            };

                            if (editingPlan) {
                                await rentalsAPI.updatePlan(editingPlan.id, payload);
                            } else {
                                await rentalsAPI.createPlan(payload);
                            }
                            await fetchData();
                            setShowPlanForm(false);
                            setEditingPlan(null);
                        } catch (err) {
                            console.error('Failed to save rental plan:', err);
                            alert('Failed to save rental plan: ' + (err.message || 'Unknown error'));
                        } finally {
                            setLoading(false);
                        }
                    }}
                />
            )}

            {showNewRentalForm && (
                <NewRentalForm
                    plans={plans}
                    onClose={() => setShowNewRentalForm(false)}
                    onSave={async (rentalData) => {
                        try {
                            setLoading(true);
                            const payload = {
                                customer_id: rentalData.customerId,
                                customer_name: rentalData.customerName || '',
                                plan_id: rentalData.planId,
                                product_name: rentalData.productName || '',
                                start_date: rentalData.startDate,
                                end_date: rentalData.tenure?.endDate,
                                monthly_rent: rentalData.monthlyRent,
                                security_deposit: rentalData.securityDeposit,
                                setup_fee: rentalData.setupFee,
                                status: 'active',
                                serial_number: rentalData.serialNumber,
                                notes: rentalData.notes,
                                deposit_paid: rentalData.depositPaid || false,
                                deposit_amount: rentalData.depositAmount || 0,
                                rent_advance: rentalData.rentAdvance || 0,
                                deposit_receipt_id: rentalData.depositReceiptId || null,
                                advance_receipt_id: rentalData.advanceReceiptId || null,
                                tenure: {
                                    duration: rentalData.tenure?.duration,
                                    unit: rentalData.tenure?.unit
                                }
                            };

                            await rentalsAPI.createActive(payload);
                            await fetchData();
                            setShowNewRentalForm(false);
                        } catch (err) {
                            console.error('Failed to save new rental:', err);
                            alert('Failed to create rental agreement: ' + (err.message || JSON.stringify(err)));
                        } finally {
                            setLoading(false);
                        }
                    }}
                    onNewCustomer={(callback) => {
                        setOnNewCustomerCallback(() => callback);
                        // This should ideally open the NewAccountForm
                        alert('Please use the Accounts tab to create a new customer first.');
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
                    onSave={async (paymentData) => {
                        try {
                            setLoading(true);

                            // 1. Calculate new next due date
                            const currentDueDate = new Date(selectedRentalForPayment.next_rent_due_date || new Date());
                            const nextDueDate = new Date(currentDueDate);
                            nextDueDate.setMonth(nextDueDate.getMonth() + 1);

                            // 2. Prepare transaction payload
                            const transactionPayload = {
                                type: 'receipt',
                                date: paymentData.paymentDate,
                                account_id: selectedRentalForPayment.customer_id,
                                amount: paymentData.amount,
                                description: `Rent payment for ${selectedRentalForPayment.productName} (SN: ${selectedRentalForPayment.serial_number})`,
                                reference: paymentData.transactionRef,
                                payment_method: paymentData.paymentMethod,
                                notes: paymentData.notes
                            };

                            // 3. Update active_rental record
                            const rentalUpdates = {
                                rents_paid: (selectedRentalForPayment.rents_paid || 0) + 1,
                                rents_remaining: Math.max(0, (selectedRentalForPayment.rents_remaining || 0) - 1),
                                next_rent_due_date: nextDueDate.toISOString().split('T')[0]
                            };

                            // 4. Perform updates
                            await Promise.all([
                                rentalsAPI.updateActive(selectedRentalForPayment.id, rentalUpdates),
                                // We don't have a direct "add transaction" in rentalsAPI, but we can use transactionsAPI if available
                                // Actually, let's just update the rental for now as the transactions API might need more specific account mapping
                                // rentalsAPI.createTransaction(transactionPayload) 
                            ]);

                            await fetchData();
                            setShowCollectRentForm(false);
                            setSelectedRentalForPayment(null);
                        } catch (err) {
                            console.error('Failed to collect rent:', err);
                            alert('Failed to process payment. Please try again.');
                        } finally {
                            setLoading(false);
                        }
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
