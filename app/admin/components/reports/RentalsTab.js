import { useState, useEffect, useMemo } from 'react';
import { Package, Plus, Edit2, Trash2, TrendingUp, DollarSign, Calendar, AlertCircle, RefreshCcw, Printer, XCircle, CalendarPlus } from 'lucide-react';
import { rentalsAPI, transactionsAPI } from '@/lib/adminAPI';
import RentalPlanForm from './RentalPlanForm';
import NewRentalForm from './NewRentalForm';
import RentReceiptsModal from './RentReceiptsModal';
import RentalDetailsModal from './RentalDetailsModal';
import AgreementTemplateEditor from './AgreementTemplateEditor';
import PrintAgreementModal from './PrintAgreementModal';
import TerminationModal from './TerminationModal';
import ExtendRentalModal from './ExtendRentalModal';

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
    const [showPrintAgreement, setShowPrintAgreement] = useState(false);
    const [selectedRentalForPrint, setSelectedRentalForPrint] = useState(null);
    const [terminateTarget, setTerminateTarget] = useState(null);
    const [extendTarget, setExtendTarget] = useState(null);

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
                {['active', 'plans', 'template'].map(view => (
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
                        {view === 'active' ? 'Active Rentals' : view === 'plans' ? 'Rental Plans' : view === 'template' ? 'Agreement Template' : 'Analytics'}
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

                                const duration = Number(rental.tenure?.duration || 1);
                                const unit = rental.tenure?.unit || 'month';
                                const totalMonths = unit.includes('year') ? duration * 12 : duration;
                                const rentsPaid = Number(rental.rents_paid || 0);
                                const rentsRemaining = Number(rental.rents_remaining != null ? rental.rents_remaining : Math.max(0, totalMonths - rentsPaid));

                                let endDateObj = null;
                                if (rental.end_date) {
                                    endDateObj = new Date(rental.end_date + 'T23:59:59');
                                } else if (rental.start_date) {
                                    const [origY, origM, origD] = rental.start_date.split('-').map(Number);
                                    const targetEndM = origM + totalMonths;
                                    const endY = origY + Math.floor((targetEndM - 1) / 12);
                                    const endMonth = ((targetEndM - 1) % 12) + 1;
                                    const maxDays = new Date(endY, endMonth, 0).getDate();
                                    const endD = Math.min(origD, maxDays);
                                    endDateObj = new Date(endY, endMonth - 1, endD, 23, 59, 59);
                                }

                                const now = new Date();
                                // A contract has ONLY ended when the calendar tenure end date has elapsed in time!
                                const isContractEnded = rental.status === 'active' && Boolean(endDateObj && endDateObj < now);

                                // Whether all rents for the tenure have been paid (e.g. upfront advance or fully collected)
                                const isAllPaid = rentsRemaining === 0 && rentsPaid >= totalMonths;

                                // Is the contract in its final month?
                                // Only if it has NOT yet ended, but the end date is within 35 days from now
                                let isLastMonth = false;
                                if (rental.status === 'active' && !isContractEnded && endDateObj) {
                                    const diffDays = Math.ceil((endDateObj - now) / (1000 * 60 * 60 * 24));
                                    isLastMonth = diffDays <= 35 && diffDays >= 0;
                                }

                                return (
                                    <div key={rental.id} style={{
                                        padding: 'var(--spacing-md)',
                                        backgroundColor: 'var(--bg-elevated)',
                                        borderRadius: 'var(--radius-lg)',
                                        border: isContractEnded 
                                            ? '2px solid #ef4444' 
                                            : (isLastMonth ? '2px solid #f59e0b' : '1px solid var(--border-primary)'),
                                        boxShadow: isContractEnded 
                                            ? '0 0 14px rgba(239, 68, 68, 0.18)' 
                                            : (isLastMonth ? '0 0 14px rgba(245, 158, 11, 0.18)' : 'none')
                                    }}>
                                        {/* Contract Ending / Ended Action Banner */}
                                        {isContractEnded ? (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                flexWrap: 'wrap',
                                                gap: '8px',
                                                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                                color: '#ef4444',
                                                padding: '8px 12px',
                                                borderRadius: 'var(--radius-sm)',
                                                marginBottom: 'var(--spacing-sm)',
                                                fontSize: 'var(--font-size-xs)',
                                                fontWeight: 600
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <AlertCircle size={15} />
                                                    <span>⚠️ Contract Ended ({rental.tenure?.duration} {rental.tenure?.unit} completed) — Action Required: Extend or Terminate</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button
                                                        className="btn btn-primary"
                                                        style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#10b981', border: 'none', cursor: 'pointer' }}
                                                        onClick={() => setExtendTarget({ ...rental, productName, customerName, monthlyRent, securityDeposit })}
                                                    >
                                                        <CalendarPlus size={12} /> Extend Contract
                                                    </button>
                                                    <button
                                                        className="btn"
                                                        style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', cursor: 'pointer' }}
                                                        onClick={() => setTerminateTarget({ ...rental, productName, customerName, monthlyRent, securityDeposit })}
                                                    >
                                                        <XCircle size={12} /> Terminate
                                                    </button>
                                                </div>
                                            </div>
                                        ) : isLastMonth ? (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                flexWrap: 'wrap',
                                                gap: '8px',
                                                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                                border: '1px solid rgba(245, 158, 11, 0.35)',
                                                color: '#f59e0b',
                                                padding: '8px 12px',
                                                borderRadius: 'var(--radius-sm)',
                                                marginBottom: 'var(--spacing-sm)',
                                                fontSize: 'var(--font-size-xs)',
                                                fontWeight: 600
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <AlertCircle size={15} />
                                                    <span>⏳ Final Month of Contract — Action Required: Call CX to Extend or Terminate</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button
                                                        className="btn btn-primary"
                                                        style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#10b981', border: 'none', cursor: 'pointer' }}
                                                        onClick={() => setExtendTarget({ ...rental, productName, customerName, monthlyRent, securityDeposit })}
                                                    >
                                                        <CalendarPlus size={12} /> Extend Contract
                                                    </button>
                                                    <button
                                                        className="btn"
                                                        style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', cursor: 'pointer' }}
                                                        onClick={() => setTerminateTarget({ ...rental, productName, customerName, monthlyRent, securityDeposit })}
                                                    >
                                                        <XCircle size={12} /> Terminate
                                                    </button>
                                                </div>
                                            </div>
                                        ) : null}

                                        <div className="rental-card-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
                                                    {isAllPaid && (
                                                        <span style={{
                                                            padding: '2px 8px',
                                                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                                            color: '#10b981',
                                                            borderRadius: 'var(--radius-sm)',
                                                            fontSize: 'var(--font-size-xs)',
                                                            fontWeight: 600,
                                                            border: '1px solid rgba(16, 185, 129, 0.3)'
                                                        }}>
                                                            All Paid ({rentsPaid}/{totalMonths})
                                                        </span>
                                                    )}
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
                                                        <div style={{ 
                                                            fontSize: 'var(--font-size-sm)', 
                                                            fontWeight: 600, 
                                                            color: isAllPaid ? '#10b981' : ((rental.next_rent_due_date && new Date(rental.next_rent_due_date) < new Date()) ? '#ef4444' : 'inherit') 
                                                        }}>
                                                            {isAllPaid ? 'All Paid' : (rental.next_rent_due_date ? new Date(rental.next_rent_due_date).toLocaleDateString('en-GB') : 'N/A')}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Deposit</div>
                                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>₹{securityDeposit.toLocaleString()}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rental-card-actions" style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                                                {rental.status !== 'terminated' && (
                                                    <button
                                                        className="btn"
                                                        style={{
                                                            padding: '6px 12px',
                                                            fontSize: 'var(--font-size-sm)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            backgroundColor: (isContractEnded || isLastMonth) ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
                                                            color: (isContractEnded || isLastMonth) ? '#10b981' : 'var(--text-primary)',
                                                            border: (isContractEnded || isLastMonth) ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-primary)',
                                                            fontWeight: 600,
                                                            cursor: 'pointer'
                                                        }}
                                                        onClick={() => setExtendTarget({ ...rental, productName, customerName, monthlyRent, securityDeposit })}
                                                        title="Extend Rental Contract"
                                                    >
                                                        <CalendarPlus size={14} /> Extend
                                                    </button>
                                                )}
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                                                    onClick={() => {
                                                        setSelectedRentalForPayment({ ...rental, productName, customerName, monthlyRent, securityDeposit });
                                                        setShowCollectRentForm(true);
                                                    }}
                                                >
                                                    Rent Receipts
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
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                                                    onClick={() => {
                                                        setSelectedRentalForPrint({ ...rental, productName, customerName, monthlyRent, securityDeposit });
                                                        setShowPrintAgreement(true);
                                                    }}
                                                    title="Print Agreement"
                                                >
                                                    <Printer size={16} />
                                                </button>
                                                {rental.status !== 'terminated' && (
                                                    <button
                                                        className="btn"
                                                        style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                        onClick={() => setTerminateTarget({ ...rental, productName, customerName, monthlyRent, securityDeposit })}
                                                    >
                                                        <XCircle size={14} /> Terminate
                                                    </button>
                                                )}
                                                <button
                                                    className="btn"
                                                    style={{ padding: '6px 10px', fontSize: 'var(--font-size-sm)', backgroundColor: '#ef444420', color: '#ef4444', border: '1px solid #ef444440', borderRadius: 'var(--radius-sm)' }}
                                                    onClick={async () => {
                                                        if (!window.confirm(`Delete rental record for ${productName} — ${customerName}?\n\nOnly use this to reverse a mistake. For actual contract termination, use the Terminate button.`)) return;
                                                        try {
                                                            const res = await fetch(`/api/admin/rentals?type=rental&id=${rental.id}`, { method: 'DELETE' });
                                                            const data = await res.json();
                                                            if (!data.success) throw new Error(data.error);
                                                            await fetchData();
                                                        } catch (err) {
                                                            alert('Failed to delete: ' + err.message);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 size={14} />
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
                                                if (window.confirm(`Delete rental plan: ${plan.product_name}?\n\nThis will be blocked if any active rental agreements use it.`)) {
                                                    try {
                                                        const res = await fetch(`/api/admin/rentals?type=plan&id=${plan.id}`, { method: 'DELETE' });
                                                        const data = await res.json();
                                                        if (!data.success) throw new Error(data.error);
                                                        await fetchData();
                                                    } catch (err) {
                                                        alert(err.message);
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

            {activeView === 'template' && (
                <div style={{ height: 'calc(100vh - 250px)' }}>
                    <AgreementTemplateEditor 
                        type="rental"
                        title="Rental Agreement Template"
                        placeholders={[
                            'CUSTOMER_NAME',
                            'CUSTOMER_ADDRESS',
                            'CUSTOMER_PHONE',
                            'CUSTOMER_EMAIL',
                            'PRODUCT_NAME',
                            'SERIAL_NUMBER',
                            'START_DATE',
                            'END_DATE',
                            'MONTHLY_RENT',
                            'SECURITY_DEPOSIT',
                            'SETUP_FEE',
                            'COMPANY_NAME',
                            'COMPANY_PHONE',
                            'COMPANY_EMAIL',
                            'TODAYS_DATE'
                        ]}
                    />
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
                            const rentsPaidInit = rentalData.monthlyRent > 0 
                                ? Math.floor((rentalData.rentAdvance || 0) / rentalData.monthlyRent) 
                                : 0;

                            const nextDueDate = new Date(rentalData.startDate);
                            nextDueDate.setMonth(nextDueDate.getMonth() + rentsPaidInit);

                            let totalRents = 0;
                            if (rentalData.tenure?.unit?.includes('month')) {
                                totalRents = rentalData.tenure.duration;
                            } else if (rentalData.tenure?.unit?.includes('year')) {
                                totalRents = rentalData.tenure.duration * 12;
                            }

                            const rentReceiptsInit = {};
                            if (rentsPaidInit > 0 && rentalData.advanceReceiptId) {
                                for (let i = 1; i <= rentsPaidInit; i++) {
                                    rentReceiptsInit[i] = rentalData.advanceReceiptId;
                                }
                            }

                            const payload = {
                                customer_id: rentalData.customerId,
                                customer_name: rentalData.customerName || '',
                                delivery_address_id: rentalData.property?.id ? String(rentalData.property.id) : null,
                                property: rentalData.property || null,
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
                                rents_paid: rentsPaidInit,
                                rents_remaining: Math.max(0, totalRents - rentsPaidInit),
                                next_rent_due_date: nextDueDate.toISOString().split('T')[0],
                                deposit_receipt_id: rentalData.depositReceiptId || null,
                                advance_receipt_id: rentalData.advanceReceiptId || null,
                                rent_receipts: rentReceiptsInit,
                                tenure: {
                                    duration: rentalData.tenure?.duration,
                                    unit: rentalData.tenure?.unit
                                }
                            };

                            const newRental = await rentalsAPI.createActive(payload);
                            await fetchData();
                            // Do not close here, let the form show the success state. Return the full payload + ID.
                            return { ...payload, id: newRental?.id, accounts: { name: payload.customer_name } };
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
                <RentReceiptsModal
                    rental={selectedRentalForPayment}
                    onClose={() => {
                        setShowCollectRentForm(false);
                        setSelectedRentalForPayment(null);
                    }}
                    onSave={async (paymentData) => {
                        try {
                            setLoading(true);
                            // Ensure next_rent_due_date is not blindly null from the modal if they skip.
                            // The modal sends null if all rents are paid or if there is no next.
                            await rentalsAPI.updateActive(paymentData.rentalId, {
                                rent_receipts: paymentData.rent_receipts,
                                deposit_receipt_id: paymentData.deposit_receipt_id,
                                rents_paid: paymentData.rents_paid,
                                rents_remaining: paymentData.rents_remaining,
                                next_rent_due_date: paymentData.next_rent_due_date || null
                            });

                            await fetchData();
                            setShowCollectRentForm(false);
                            setSelectedRentalForPayment(null);
                        } catch (err) {
                            console.error('Failed to link receipts:', err);
                            alert('Failed to save receipt linkages: ' + (err.message || err));
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
                    onViewAccount={(id) => window.openCustomerAccount({ id })}
                />
            )}

            {showPrintAgreement && selectedRentalForPrint && (
                <PrintAgreementModal 
                    type="rental"
                    data={selectedRentalForPrint}
                    onClose={() => setShowPrintAgreement(false)}
                />
            )}

            {terminateTarget && (
                <TerminationModal
                    type="rental"
                    record={terminateTarget}
                    customerId={terminateTarget.customer_id}
                    onClose={() => setTerminateTarget(null)}
                    onSuccess={() => { setTerminateTarget(null); fetchData(); }}
                />
            )}

            {extendTarget && (
                <ExtendRentalModal
                    rental={extendTarget}
                    onClose={() => setExtendTarget(null)}
                    onSuccess={() => {
                        setExtendTarget(null);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
}

export default RentalsTab;
