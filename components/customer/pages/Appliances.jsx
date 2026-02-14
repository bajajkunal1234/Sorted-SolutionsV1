'use client'

import React, { useState } from 'react'
import { Package, Plus, Wrench, Calendar, AlertCircle } from 'lucide-react'
import AddApplianceModal from '../modals/AddApplianceModal'
import BookServiceModal from '../modals/BookServiceModal'

// Mock appliances data
const initialAppliances = []

function Appliances() {
  const [appliances, setAppliances] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [session, setSession] = useState(null)

  // Fetch initial data
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const storedSession = localStorage.getItem('customerSession')
        if (!storedSession) {
          setLoading(false)
          return
        }

        const sessionData = JSON.parse(storedSession)
        setSession(sessionData)
        const customerId = sessionData.user?.id || sessionData.customer?.id

        if (customerId) {
          // Fetch Appliances
          const appRes = await fetch(`/api/customer/appliances?customerId=${customerId}`)
          const appData = await appRes.json()
          if (appData.success) {
            setAppliances(appData.appliances)
          }

          // Fetch Properties
          const propRes = await fetch(`/api/customer/properties?customerId=${customerId}`)
          const propData = await propRes.json()
          if (propData.success) {
            setProperties(propData.properties)
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleAddAppliance = async (applianceData) => {
    try {
      const customerId = session?.user?.id || session?.customer?.id
      if (!customerId) return

      const payload = {
        ...applianceData,
        customer_id: customerId,
        type: applianceData.category, // Map category to type
        purchase_date: applianceData.purchaseDate,
        warranty_expiry: applianceData.warrantyExpiry,
        serial_number: applianceData.serialNumber,
        room: applianceData.room
      }

      const response = await fetch('/api/customer/appliances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        setAppliances([data.appliance, ...appliances])
        setShowAddModal(false)
      } else {
        alert('Failed to add appliance: ' + data.error)
      }
    } catch (error) {
      console.error('Error adding appliance:', error)
      alert('An error occurred while adding the appliance')
    }
  }

  const handleBookService = (booking) => {
    console.log('Service booked:', booking)
    alert('Service booked successfully!')
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
      case 'healthy':
        return 'var(--color-success)' // Green
      case 'warning':
        return 'var(--color-warning)' // Yellow
      case 'critical':
      case 'removed':
        return 'var(--color-danger)' // Red
      default:
        return 'var(--text-secondary)'
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading appliances...</div>
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <div>
          <h2 style={{ marginBottom: 'var(--spacing-xs)' }}>My Appliances</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 'var(--font-size-sm)' }}>
            {appliances.length} appliances registered
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} />
          Add
        </button>
      </div>

      {/* Appliances List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        {appliances.length === 0 ? (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            backgroundColor: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-primary)'
          }}>
            <Package size={48} color="var(--text-tertiary)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No appliances yet</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Add your home appliances to track warranty and book service easily.</p>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              Add Your First Appliance
            </button>
          </div>
        ) : (
          appliances.map((appliance) => (
            <div key={appliance.id} className="card" style={{ padding: 'var(--spacing-md)' }}>
              <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-start' }}>
                {/* Icon */}
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: `${getStatusColor(appliance.status)}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Package size={24} style={{ color: getStatusColor(appliance.status) }} />
                </div>

                {/* Details */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-xs)' }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '2px' }}>{appliance.brand} {appliance.type}</div>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                        {appliance.model ? `Model: ${appliance.model}` : 'Model not specified'}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: 'var(--spacing-xs) var(--spacing-sm)',
                        backgroundColor: `${getStatusColor(appliance.status)}20`,
                        color: getStatusColor(appliance.status),
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 500,
                        textTransform: 'capitalize',
                      }}
                    >
                      {appliance.status}
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                      {appliance.serial_number ? `SN: ${appliance.serial_number}` : ''}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                      🛡️ Warranty: {appliance.warranty_expiry ? new Date(appliance.warranty_expiry).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--spacing-xs) var(--spacing-sm)' }}
                      onClick={() => setShowServiceModal(true)}
                    >
                      <Wrench size={14} />
                      Book Service
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      <AddApplianceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddAppliance}
        properties={properties}
      />
      <BookServiceModal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        onBook={handleBookService}
        appliances={appliances}
      />
    </div>
  )
}

export default Appliances




