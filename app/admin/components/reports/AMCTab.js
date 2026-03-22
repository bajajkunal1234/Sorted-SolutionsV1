'use client'

import { useState, useEffect, useMemo } from 'react';
import { Shield, Plus, Edit2, Trash2, TrendingUp, DollarSign, Calendar, AlertCircle, RefreshCcw, Printer } from 'lucide-react';
import { amcAPI } from '@/lib/adminAPI';
import AMCPlanForm from './AMCPlanForm';
import NewAMCForm from './NewAMCForm';
import AgreementTemplateEditor from './AgreementTemplateEditor';
import PrintAgreementModal from './PrintAgreementModal';

function AMCTab() {
    const [activeView, setActiveView] = useState('active'); // active, plans, analytics
    const [showPlanForm, setShowPlanForm] = useState(false);
    const [showNewAMCForm, setShowNewAMCForm] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [showPrintAgreement, setShowPrintAgreement] = useState(false);
    const [selectedAmcForPrint, setSelectedAmcForPrint] = useState(null);
    const [plans, setPlans] = useState([]);
    const [activeAMCs, setActiveAMCs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [plansData, activeData] = await Promise.all([
                amcAPI.getPlans(),
                amcAPI.getActive()
            ]);
            setPlans(plansData || []);
            setActiveAMCs(activeData || []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch AMC data:', err);
            setError('Failed to load AMC data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Calculate analytics
    const stats = useMemo(() => {
        const totalActiveAMCs = activeAMCs.length;
        const monthlyAMCRevenue = activeAMCs.reduce((sum, amc) => sum + (Number(amc.amc_amount || 0) / 12), 0);
        const expiringThisMonth = activeAMCs.filter(amc => {
            if (!amc.end_date) return false;
            const endDate = new Date(amc.end_date);
            const now = new Date();
            const monthFromNow = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
            return endDate <= monthFromNow && endDate >= now;
        }).length;

        return { totalActiveAMCs, monthlyAMCRevenue, expiringThisMonth, totalPlans: plans.length };
    }, [activeAMCs, plans]);

    return (
        <div style={{ padding: 'var(--spacing-lg)' }}>
            {/* Header */}
            <div style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-sm)' }}>
                        AMC Management
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        Manage AMC plans, track active contracts, and monitor service schedules
                    </p>
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={fetchData}
                    disabled={loading}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                >
                    <RefreshCcw size={16} className={loading ? 'spin' : ''} />
                    Refresh
                </button>
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
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Active AMCs</span>
                        <Shield size={20} color="#8b5cf6" />
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#8b5cf6' }}>
                        {stats.totalActiveAMCs}
                    </div>
                </div>

                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Monthly Revenue</span>
                        <TrendingUp size={20} color="#10b981" />
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#10b981' }}>
                        ₹{Math.round(stats.monthlyAMCRevenue).toLocaleString()}
                    </div>
                </div>

                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Expiring Soon</span>
                        <AlertCircle size={20} color="#f59e0b" />
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#f59e0b' }}>
                        {stats.expiringThisMonth}
                    </div>
                </div>

                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Total Plans</span>
                        <Shield size={20} color="#3b82f6" />
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#3b82f6' }}>
                        {stats.totalPlans}
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
                        {view === 'active' ? 'Active AMCs' : view === 'plans' ? 'AMC Plans' : view === 'template' ? 'Agreement Template' : 'Analytics'}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            {activeView === 'active' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>Active AMCs</h3>
                        <button
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                            onClick={() => setShowNewAMCForm(true)}
                        >
                            <Plus size={16} />
                            New AMC
                        </button>
                    </div>

                    {/* AMCs List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)' }}>
                                <RefreshCcw size={24} className="spin" style={{ margin: '0 auto var(--spacing-sm)' }} />
                                Loading active AMCs...
                            </div>
                        ) : error ? (
                            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: '#ef4444' }}>
                                {error}
                            </div>
                        ) : activeAMCs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)', border: '1px dashed var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                                <Shield size={32} style={{ margin: '0 auto var(--spacing-sm)', opacity: 0.5 }} />
                                No active AMC contracts found
                            </div>
                        ) : activeAMCs.map(amc => (
                            <div key={amc.id} style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'var(--bg-elevated)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--border-primary)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                                {amc.plan_name || amc.amc_plans?.name}
                                            </h4>
                                            <span style={{
                                                padding: '2px 8px',
                                                backgroundColor: amc.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                                                color: amc.status === 'active' ? '#10b981' : '#8b5cf6',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: 'var(--font-size-xs)',
                                                fontWeight: 600,
                                                textTransform: 'uppercase'
                                            }}>
                                                {amc.status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                                            {amc.accounts?.name || 'Unknown Customer'} • {amc.product_brand} {amc.product_model}
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                                            <div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Contract Period</div>
                                                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                                    {new Date(amc.start_date).toLocaleDateString('en-GB')} - {new Date(amc.end_date).toLocaleDateString('en-GB')}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Next Service</div>
                                                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                                    {amc.next_service_date ? new Date(amc.next_service_date).toLocaleDateString('en-GB') : 'Not scheduled'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>AMC Amount</div>
                                                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>₹{(Number(amc.amc_amount) || 0).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                                            onClick={() => alert(`Schedule Service for ${amc.accounts?.name}\n\nAMC: ${amc.plan_name}\nProduct: ${amc.product_brand} ${amc.product_model}\nNext Service: ${amc.next_service_type || 'General Service'}\n\nThis will create a new job and assign a technician.`)}
                                        >
                                            Schedule Service
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                                            onClick={() => {
                                                setSelectedAmcForPrint(amc);
                                                setShowPrintAgreement(true);
                                            }}
                                            title="Print Agreement"
                                        >
                                            <Printer size={16} />
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                                            onClick={() => alert(`AMC Details: ${amc.id}\n\nCustomer: ${amc.accounts?.name}\nPlan: ${amc.plan_name}\nProduct: ${amc.product_brand} ${amc.product_model}\nContract: ${new Date(amc.start_date).toLocaleDateString('en-GB')} - ${new Date(amc.end_date).toLocaleDateString('en-GB')}\nAmount: ₹${amc.amc_amount}\n\nThis will open a detailed view modal.`)}
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
                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>AMC Plans</h3>
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
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>
                                Loading plans...
                            </div>
                        ) : plans.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)', gridColumn: '1 / -1', border: '1px dashed var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                                No AMC plans found
                            </div>
                        ) : plans.map(plan => (
                            <div key={plan.id} style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'var(--bg-elevated)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--border-primary)',
                                opacity: plan.is_active ? 1 : 0.6
                            }}>
                                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                                        {plan.name}
                                    </h4>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        {plan.category} • {plan.duration?.value} {plan.duration?.unit}
                                    </div>
                                </div>

                                <div style={{
                                    padding: 'var(--spacing-sm)',
                                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    marginBottom: 'var(--spacing-sm)'
                                }}>
                                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#8b5cf6' }}>
                                        ₹{(Number(plan.price) || 0).toLocaleString()}
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        per {plan.duration?.unit}
                                    </div>
                                </div>

                                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-xs)' }}>
                                        Included Services
                                    </div>
                                    {Array.isArray(plan.services) && plan.services.slice(0, 3).map((service, idx) => (
                                        <div key={idx} style={{ fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>
                                            • {service.quantity}x {service.item} ({service.frequency})
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
                                        onClick={async () => {
                                            if (window.confirm(`Delete AMC plan: ${plan.name}?\n\nThis action cannot be undone.`)) {
                                                try {
                                                    setLoading(true);
                                                    await amcAPI.deletePlan(plan.id);
                                                    await fetchData();
                                                } catch (err) {
                                                    console.error('Failed to delete plan:', err);
                                                    alert('Failed to delete plan.');
                                                } finally {
                                                    setLoading(false);
                                                }
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
                        AMC Analytics
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
                        type="amc"
                        title="AMC Agreement Template"
                        placeholders={[
                            'CUSTOMER_NAME',
                            'CUSTOMER_ADDRESS',
                            'CUSTOMER_PHONE',
                            'CUSTOMER_EMAIL',
                            'PRODUCT_NAME',
                            'SERIAL_NUMBER',
                            'START_DATE',
                            'END_DATE',
                            'AMC_AMOUNT',
                            'NEXT_SERVICE_DATE',
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
                <AMCPlanForm
                    onClose={() => setShowPlanForm(false)}
                    onSave={async (data) => {
                        try {
                            setLoading(true);
                            await amcAPI.createPlan({
                                name: data.name,
                                category: data.category,
                                applicable_products: data.applicableProducts,
                                duration: data.duration,
                                price: data.price,
                                services: data.services,
                                benefits: data.benefits,
                                terms: data.terms,
                                is_active: data.isActive
                            });
                            await fetchData();
                            setShowPlanForm(false);
                        } catch (err) {
                            console.error('Failed to create plan:', err);
                            alert('Failed to create plan.');
                        } finally {
                            setLoading(false);
                        }
                    }}
                />
            )}

            {editingPlan && (
                <AMCPlanForm
                    plan={{
                        id: editingPlan.id,
                        name: editingPlan.name,
                        category: editingPlan.category,
                        applicableProducts: editingPlan.applicable_products,
                        duration: editingPlan.duration,
                        price: editingPlan.price,
                        services: editingPlan.services,
                        benefits: editingPlan.benefits,
                        terms: editingPlan.terms,
                        isActive: editingPlan.is_active
                    }}
                    onClose={() => setEditingPlan(null)}
                    onSave={async (data) => {
                        try {
                            setLoading(true);
                            await amcAPI.updatePlan(editingPlan.id, {
                                name: data.name,
                                category: data.category,
                                applicable_products: data.applicableProducts,
                                duration: data.duration,
                                price: data.price,
                                services: data.services,
                                benefits: data.benefits,
                                terms: data.terms,
                                is_active: data.isActive
                            });
                            await fetchData();
                            setEditingPlan(null);
                        } catch (err) {
                            console.error('Failed to update plan:', err);
                            alert('Failed to update plan.');
                        } finally {
                            setLoading(false);
                        }
                    }}
                />
            )}

            {showNewAMCForm && (
                <NewAMCForm
                    plans={plans}
                    onClose={() => setShowNewAMCForm(false)}
                    onSave={async (data) => {
                        try {
                            setLoading(true);
                            const payload = {
                                customer_id: data.customerId,
                                plan_id: data.planId,
                                plan_name: data.planName || plans.find(p => p.id === data.planId)?.name || '',
                                product_brand: data.productBrand,
                                product_model: data.productModel,
                                serial_number: data.serialNumber,
                                start_date: data.startDate,
                                end_date: data.endDate,
                                amc_amount: data.amcAmount,
                                payment_status: data.paymentStatus,
                                auto_renew: data.autoRenew,
                                notes: data.notes,
                                status: 'active'
                            };
                            const newAMC = await amcAPI.createActive(payload);
                            await fetchData();
                            return { ...payload, id: newAMC?.id, accounts: { name: data.customerName || 'Customer' } };
                        } catch (err) {
                            console.error('Failed to create AMC:', err);
                            alert('Failed to create AMC subscription.');
                        } finally {
                            setLoading(false);
                        }
                    }}
                />
            )}

            {showPrintAgreement && selectedAmcForPrint && (
                <PrintAgreementModal 
                    type="amc"
                    data={selectedAmcForPrint}
                    onClose={() => setShowPrintAgreement(false)}
                />
            )}
        </div>
    );
}

export default AMCTab;
