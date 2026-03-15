'use client'

import { useState } from 'react';
import { Shield, Plus, Edit2, Trash2, TrendingUp, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import { amcPlans, activeAMCs } from '../../data/rentalsAmcData';
import AMCPlanForm from './AMCPlanForm';
import NewAMCForm from './NewAMCForm';

function AMCTab() {
    const [activeView, setActiveView] = useState('active'); // active, plans, analytics
    const [showPlanForm, setShowPlanForm] = useState(false);
    const [showNewAMCForm, setShowNewAMCForm] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);

    // Calculate analytics
    const totalActiveAMCs = activeAMCs.length;
    const monthlyAMCRevenue = activeAMCs.reduce((sum, amc) => sum + (amc.amcAmount / 12), 0);
    const expiringThisMonth = activeAMCs.filter(amc => {
        const endDate = new Date(amc.endDate);
        const now = new Date();
        const monthFromNow = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        return endDate <= monthFromNow && endDate >= now;
    }).length;

    return (
        <div style={{ padding: 'var(--spacing-lg)' }}>
            {/* Header */}
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-sm)' }}>
                    AMC Management
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                    Manage AMC plans, track active contracts, and monitor service schedules
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
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Active AMCs</span>
                        <Shield size={20} color="#8b5cf6" />
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#8b5cf6' }}>
                        {totalActiveAMCs}
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
                        ₹{Math.round(monthlyAMCRevenue).toLocaleString()}
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
                        {expiringThisMonth}
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
                        {amcPlans.length}
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
                        {view === 'active' ? 'Active AMCs' : view === 'plans' ? 'AMC Plans' : 'Analytics'}
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
                        {activeAMCs.map(amc => (
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
                                                {amc.planName}
                                            </h4>
                                            <span style={{
                                                padding: '2px 8px',
                                                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                                color: '#8b5cf6',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: 'var(--font-size-xs)',
                                                fontWeight: 600,
                                                textTransform: 'uppercase'
                                            }}>
                                                {amc.status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                                            {amc.customerName} • {amc.productBrand} {amc.productModel}
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                                            <div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Contract Period</div>
                                                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                                    {new Date(amc.startDate).toLocaleDateString('en-GB')} - {new Date(amc.endDate).toLocaleDateString('en-GB')}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Next Service</div>
                                                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                                    {amc.nextServiceDate ? new Date(amc.nextServiceDate).toLocaleDateString('en-GB') : 'Not scheduled'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Services Completed</div>
                                                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                                    {amc.servicesCompleted.length}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>AMC Amount</div>
                                                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>₹{amc.amcAmount.toLocaleString()}</div>
                                            </div>
                                        </div>

                                        {/* Services Remaining */}
                                        <div style={{ marginTop: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-xs)' }}>
                                                Services Remaining
                                            </div>
                                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                                                {Object.entries(amc.servicesRemaining).map(([service, count]) => (
                                                    <div key={service} style={{ fontSize: 'var(--font-size-xs)' }}>
                                                        <span style={{ fontWeight: 600 }}>{count}x</span> {service}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                                            onClick={() => alert(`Schedule Service for ${amc.customerName}\n\nAMC: ${amc.planName}\nProduct: ${amc.productBrand} ${amc.productModel}\nNext Service: ${amc.nextServiceType}\n\nThis will create a new job and assign a technician.`)}
                                        >
                                            Schedule Service
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                                            onClick={() => alert(`AMC Details: ${amc.id}\n\nCustomer: ${amc.customerName}\nPlan: ${amc.planName}\nProduct: ${amc.productBrand} ${amc.productModel}\nContract: ${new Date(amc.startDate).toLocaleDateString('en-GB')} - ${new Date(amc.endDate).toLocaleDateString('en-GB')}\nAmount: ₹${amc.amcAmount}\nServices Completed: ${amc.servicesCompleted.length}\n\nThis will open a detailed view modal.`)}
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
                        {amcPlans.map(plan => (
                            <div key={plan.id} style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'var(--bg-elevated)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--border-primary)'
                            }}>
                                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                                        {plan.name}
                                    </h4>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        {plan.category} • {plan.duration.value} {plan.duration.unit}
                                    </div>
                                </div>

                                <div style={{
                                    padding: 'var(--spacing-sm)',
                                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    marginBottom: 'var(--spacing-sm)'
                                }}>
                                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#8b5cf6' }}>
                                        ₹{plan.price.toLocaleString()}
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        per year
                                    </div>
                                </div>

                                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-xs)' }}>
                                        Included Services
                                    </div>
                                    {plan.services.slice(0, 3).map((service, idx) => (
                                        <div key={idx} style={{ fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>
                                            • {service.quantity}x {service.item} ({service.frequency})
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-md)' }}>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ flex: 1, padding: '6px', fontSize: 'var(--font-size-sm)' }}
                                        onClick={() => alert(`Edit AMC Plan: ${plan.name}\n\nThis will open the plan editor to modify:\n- Service schedule\n- Pricing\n- Benefits\n- Terms and conditions`)}
                                    >
                                        <Edit2 size={14} style={{ marginRight: '4px' }} />
                                        Edit
                                    </button>
                                    <button
                                        className="btn"
                                        style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)', backgroundColor: '#ef4444' }}
                                        onClick={() => {
                                            if (window.confirm(`Delete AMC plan: ${plan.name}?\n\nThis action cannot be undone.`)) {
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

            {/* Forms */}
            {showPlanForm && (
                <AMCPlanForm
                    onClose={() => setShowPlanForm(false)}
                    onSave={(data) => {
                        console.log('New AMC plan:', data);
                        alert('AMC plan created successfully!');
                        setShowPlanForm(false);
                    }}
                />
            )}

            {editingPlan && (
                <AMCPlanForm
                    plan={editingPlan}
                    onClose={() => setEditingPlan(null)}
                    onSave={(data) => {
                        console.log('Updated AMC plan:', data);
                        alert('AMC plan updated successfully!');
                        setEditingPlan(null);
                    }}
                />
            )}

            {showNewAMCForm && (
                <NewAMCForm
                    onClose={() => setShowNewAMCForm(false)}
                    onSave={(data) => {
                        console.log('New AMC:', data);
                        alert('AMC subscription created successfully!');
                        setShowNewAMCForm(false);
                    }}
                />
            )}
        </div>
    );
}

export default AMCTab;





