'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Package, Wrench, AlertCircle, CheckCircle, Activity, ChevronRight, Zap } from 'lucide-react'
import AddApplianceModal from '../modals/AddApplianceModal'
import BookServiceModal from '../modals/BookServiceModal'
// Emoji map based on HouseMap
const APPLIANCE_META = {
  'ac': { emoji: '❄️', color: '#3b82f6', label: 'Air Conditioner' },
  'refrigerator': { emoji: '🧊', color: '#06b6d4', label: 'Refrigerator' },
  'washing_machine': { emoji: '🌀', color: '#10b981', label: 'Washing Machine' },
  'microwave_oven': { emoji: '📡', color: '#ef4444', label: 'Microwave Oven' },
  'gas_stove_hob': { emoji: '🔥', color: '#f59e0b', label: 'Gas Stove / Hob' },
  'water_purifier': { emoji: '💧', color: '#38bdf8', label: 'Water Purifier' },
  'default': { emoji: '🔌', color: '#64748b', label: 'Appliance' }
}

export default function Appliances() {
  const [appliances, setAppliances] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [selectedForService, setSelectedForService] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const customerId = localStorage.getItem('customerId')
      if (!customerId) { setLoading(false); return }

      const [appRes, propRes] = await Promise.all([
        fetch(`/api/customer/appliances?customerId=${customerId}`),
        fetch(`/api/customer/properties?customerId=${customerId}`)
      ])

      const appData = await appRes.json()
      const propData = await propRes.json()

      if (appData.success) setAppliances(appData.appliances || [])
      if (propData.success) setProperties(propData.properties || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAppliance = async (applianceData) => {
    try {
      const customerId = localStorage.getItem('customerId')
      if (!customerId) return

      const payload = {
        customer_id: customerId,
        type: applianceData.type || applianceData.category,
        brand: applianceData.brand,
        model: applianceData.model,
        serial_number: applianceData.serialNumber,
        purchase_date: applianceData.purchaseDate,
        warranty_expiry: applianceData.warrantyExpiry,
        room: applianceData.room,
      }

      const response = await fetch('/api/customer/appliances', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()

      if (data.success) {
        setAppliances([data.appliance, ...appliances])
        setShowAddModal(false)
      } else {
        throw new Error(data.error || 'Failed to add appliance')
      }
    } catch (error) {
      throw error // rethrow so modal shows inline error
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(139,92,246,0.2)', borderTopColor: '#8b5cf6', animation: 'spin 1s linear infinite' }} />
        <span style={{ color: '#94a3b8', fontSize: 14 }}>Loading appliances...</span>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, color: '#f8fafc', letterSpacing: '-0.5px' }}>
            Appliances
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px', fontWeight: 500 }}>
            {appliances.length} {appliances.length === 1 ? 'appliance' : 'appliances'} registered
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            width: 44, height: 44, borderRadius: 16,
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            border: 'none', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(99,102,241,0.4)', cursor: 'pointer', transition: 'transform 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </header>

      {/* Grid Layout */}
      {appliances.length === 0 ? (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 24, padding: '40px 20px', textAlign: 'center', marginTop: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(139,92,246,0.1)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
            <Package size={40} />
          </div>
          <h3 style={{ fontSize: 18, color: '#f8fafc', fontWeight: 700, margin: '0 0 8px 0' }}>No Appliances Yet</h3>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 24px 0', lineHeight: 1.5 }}>Track warranties, health scores, and book repairs magically.</p>
          <button onClick={() => setShowAddModal(true)} style={{ background: '#f8fafc', color: '#0f172a', border: 'none', padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Add Your First Appliance
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
          {appliances.map(app => {
            const meta = APPLIANCE_META[app.type?.toLowerCase()] || APPLIANCE_META.default
            const isInWarranty = app.warranty_expiry && new Date(app.warranty_expiry) > new Date()
            const hasRecentService = app.last_service_date && (new Date() - new Date(app.last_service_date)) < 180 * 24 * 60 * 60 * 1000
            const healthLabel = isInWarranty ? 'Covered' : 'Expired'
            const healthColor = isInWarranty ? '#10b981' : '#f59e0b'

            return (
              <div key={app.id} style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '24px',
                padding: '16px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s',
                cursor: 'default'
              }}>
                {/* Top row: Emotion & Health Score */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 16,
                    background: `${meta.color}20`, border: `1px solid ${meta.color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                    boxShadow: `inset 0 2px 4px rgba(255,255,255,0.1)`
                  }}>
                    {meta.emoji}
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: isInWarranty ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                    color: healthColor,
                    padding: '4px 8px', borderRadius: '12px', fontSize: 11, fontWeight: 700
                  }}>
                    <Activity size={10} strokeWidth={3} /> {healthLabel}
                  </div>
                </div>

                {/* Texts */}
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', margin: '0 0 2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {app.brand}
                </h3>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 16px 0', textTransform: 'capitalize' }}>
                  {meta.label}
                </p>

                {/* Bottom action */}
                <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {app.warranty_expiry && new Date(app.warranty_expiry) > new Date() ? <><CheckCircle size={10} color="#10b981" /> In Warranty</> : <><AlertCircle size={10} color="#f59e0b" /> Out of Warranty</>}
                  </span>
                  <button
                    onClick={() => { setSelectedForService(app); setShowServiceModal(true) }}
                    style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
                  >
                    <Wrench size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <AddApplianceModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onAdd={(a) => handleAddAppliance(a)} properties={properties} />
      <BookServiceModal
        isOpen={showServiceModal}
        onClose={() => { setShowServiceModal(false); setSelectedForService(null) }}
        onBook={() => { fetchData(); setShowServiceModal(false) }}
        appliances={appliances}
        preSelectedAppliance={selectedForService}
      />
    </div>
  )
}
