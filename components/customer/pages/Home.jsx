'use client'

import React, { useState, useEffect } from 'react'
import { Home as HomeIcon, MapPin, Wrench, Bell, Plus, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import AddPropertyModal from '../modals/AddPropertyModal'
import AddApplianceModal from '../modals/AddApplianceModal'
import BookServiceModal from '../modals/BookServiceModal'
import { useRouter } from 'next/navigation'

function Home() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        properties: 0,
        appliances: 0,
        activeJobs: 0,
        completedJobs: 0
    })
    const [activities, setActivities] = useState([])
    const [properties, setProperties] = useState([])
    const [customerName, setCustomerName] = useState('Customer')

    // Modal states
    const [showPropertyModal, setShowPropertyModal] = useState(false)
    const [showApplianceModal, setShowApplianceModal] = useState(false)
    const [showServiceModal, setShowServiceModal] = useState(false)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            const customerId = localStorage.getItem('customerId')
            const customerData = localStorage.getItem('customerData')

            if (!customerId) {
                router.push('/customer/login')
                return
            }

            if (customerData) {
                const parsed = JSON.parse(customerData)
                setCustomerName(parsed.name || 'Customer')
            }

            // Fetch properties, jobs, and appliances in parallel
            const [propertiesRes, jobsRes, appliancesRes] = await Promise.all([
                fetch(`/api/customer/properties?customerId=${customerId}`),
                fetch(`/api/customer/jobs?customerId=${customerId}`),
                fetch(`/api/customer/appliances?customerId=${customerId}`)
            ])

            const [propertiesData, jobsData, appliancesData] = await Promise.all([
                propertiesRes.json(),
                jobsRes.json(),
                appliancesRes.json()
            ])

            const userProperties = propertiesData.properties || []
            const userJobs = jobsData.jobs || []
            const userAppliances = appliancesData.appliances || []

            setProperties(userProperties)

            // Calculate stats
            const activeJobs = userJobs.filter(j => ['pending', 'confirmed', 'in_progress'].includes(j.status)).length
            const completedJobs = userJobs.filter(j => j.status === 'completed').length

            setStats({
                properties: userProperties.length,
                appliances: userAppliances.length,
                activeJobs,
                completedJobs
            })

            // Generate activities from jobs
            const recentActivities = userJobs
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 5) // Show last 5 activities
                .map(job => ({
                    id: job.id,
                    type: job.status,
                    title: `${job.product?.name || 'Service'} - ${job.status.replace('_', ' ')}`,
                    description: job.problem_description || 'No description provided',
                    date: new Date(job.created_at).toLocaleDateString(),
                    status: job.status
                }))

            setActivities(recentActivities)
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAddProperty = async (property) => {
        // Refresh data after adding property
        fetchDashboardData()
        setShowPropertyModal(false)
    }

    const handleAddAppliance = (appliance) => {
        // Placeholder
        setShowApplianceModal(false)
        alert('Appliance tracking coming soon!')
    }

    const handleBookService = (booking) => {
        fetchDashboardData() // Refresh stats
        setShowServiceModal(false)
        alert('Service booked successfully! We will assign a technician soon.')
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return { icon: CheckCircle, color: 'var(--color-success)' }
            case 'pending': return { icon: Clock, color: 'var(--color-warning)' }
            case 'in_progress': return { icon: Wrench, color: 'var(--color-primary)' }
            case 'cancelled': return { icon: AlertCircle, color: 'var(--color-danger)' }
            default: return { icon: Bell, color: 'var(--color-text-secondary)' }
        }
    }

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <div className="loading-spinner"></div>
            </div>
        )
    }

    return (
        <div className="page-container">
            {/* Header */}
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h1>Welcome, {customerName}!</h1>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                    Your home's personal doctor 🏠
                </p>
            </div>

            {/* Quick Stats */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-xl)',
                }}
            >
                <div className="card" style={{ textAlign: 'center' }}>
                    <MapPin size={32} style={{ color: 'var(--color-primary)', margin: '0 auto var(--spacing-sm)' }} />
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600 }}>{stats.properties}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Properties</div>
                </div>

                <div className="card" style={{ textAlign: 'center' }}>
                    <Wrench size={32} style={{ color: 'var(--color-warning)', margin: '0 auto var(--spacing-sm)' }} />
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600 }}>{stats.activeJobs}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Active Jobs</div>
                </div>

                <div className="card" style={{ textAlign: 'center' }}>
                    <CheckCircle size={32} style={{ color: 'var(--color-success)', margin: '0 auto var(--spacing-sm)' }} />
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600 }}>{stats.completedJobs}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Completed</div>
                </div>
            </div>

            {/* Quick Actions */}
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Quick Actions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    <button
                        className="btn btn-secondary"
                        style={{ justifyContent: 'flex-start' }}
                        onClick={() => setShowServiceModal(true)}
                    >
                        <Wrench size={20} />
                        Book Service
                    </button>
                    <button
                        className="btn btn-secondary"
                        style={{ justifyContent: 'flex-start' }}
                        onClick={() => setShowPropertyModal(true)}
                    >
                        <Plus size={20} />
                        Add Property
                    </button>
                </div>
            </div>

            {/* Recent Activity */}
            <div>
                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Recent Activity</h3>
                {activities.length === 0 ? (
                    <div className="card" style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No recent activity. Book a service to get started!
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {activities.map((activity) => {
                            const { icon: Icon, color } = getStatusIcon(activity.type)
                            return (
                                <div key={activity.id} className="card" style={{ padding: 'var(--spacing-md)' }}>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-start' }}>
                                        <div
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: 'var(--radius-md)',
                                                backgroundColor: `${color}20`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Icon size={20} style={{ color: color }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-xs)', textTransform: 'capitalize' }}>
                                                {activity.title}
                                            </div>
                                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                                {activity.description}
                                            </div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--spacing-xs)' }}>
                                                {activity.date}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Modals */}
            <AddPropertyModal
                isOpen={showPropertyModal}
                onClose={() => setShowPropertyModal(false)}
                onAdd={handleAddProperty}
            />
            <AddApplianceModal
                isOpen={showApplianceModal}
                onClose={() => setShowApplianceModal(false)}
                onAdd={handleAddAppliance}
                properties={properties}
            />
            <BookServiceModal
                isOpen={showServiceModal}
                onClose={() => setShowServiceModal(false)}
                onBook={handleBookService}
            />
        </div>
    )
}

export default Home
