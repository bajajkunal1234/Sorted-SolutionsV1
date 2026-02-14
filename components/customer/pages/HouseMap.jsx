'use client'

import React, { useState } from 'react'
import { Home, Maximize2, ZoomIn, ZoomOut, RotateCw } from 'lucide-react'

// Mock data for appliances with positions
const mockAppliances = [
    { id: 1, name: 'Living Room AC', room: 'Living Room', status: 'healthy', x: 20, y: 15, icon: '❄️' },
    { id: 2, name: 'Kitchen Refrigerator', room: 'Kitchen', status: 'healthy', x: 70, y: 15, icon: '🧊' },
    { id: 3, name: 'Washing Machine', room: 'Utility', status: 'warning', x: 70, y: 70, icon: '🌀' },
    { id: 4, name: 'Bedroom AC', room: 'Bedroom 1', status: 'healthy', x: 20, y: 70, icon: '❄️' },
    { id: 5, name: 'TV', room: 'Living Room', status: 'healthy', x: 30, y: 25, icon: '📺' },
    { id: 6, name: 'Microwave', room: 'Kitchen', status: 'healthy', x: 75, y: 25, icon: '📦' },
]

const rooms = [
    { id: 1, name: 'Living Room', x: 10, y: 10, width: 35, height: 35, color: '#6366f1' },
    { id: 2, name: 'Kitchen', x: 55, y: 10, width: 35, height: 35, color: '#10b981' },
    { id: 3, name: 'Bedroom 1', x: 10, y: 55, width: 35, height: 35, color: '#f59e0b' },
    { id: 4, name: 'Utility', x: 55, y: 55, width: 35, height: 35, color: '#8b5cf6' },
]

function HouseMap() {
    const [appliances, setAppliances] = useState([])
    const [selectedRoom, setSelectedRoom] = useState(null)
    const [zoom, setZoom] = useState(1)
    const [loading, setLoading] = useState(true)

    React.useEffect(() => {
        const fetchAppliances = async () => {
            const storedSession = localStorage.getItem('customerSession')
            if (!storedSession) {
                setLoading(false)
                return
            }

            try {
                const sessionData = JSON.parse(storedSession)
                const customerId = sessionData.user?.id || sessionData.customer?.id

                if (customerId) {
                    const res = await fetch(`/api/customer/appliances?customerId=${customerId}`)
                    const data = await res.json()
                    if (data.success) {
                        // Map appliances to rooms and assign positions
                        const mappedAppliances = data.appliances.map((app, index) => {
                            // Find room
                            const room = rooms.find(r => r.name.toLowerCase() === (app.room || '').toLowerCase()) || rooms[0] // Default to Living Room if not found

                            // Generate position within room (dispersed)
                            // Simple grid logic within the room
                            const itemsInRoom = data.appliances.filter(a => (a.room || '').toLowerCase() === room.name.toLowerCase()).length
                            const offset = (index % 4) * 8
                            const x = room.x + 10 + (index % 3) * 8
                            const y = room.y + 10 + Math.floor(index / 3) * 8

                            return {
                                ...app,
                                name: `${app.brand} ${app.type}`,
                                icon: getIconForType(app.type),
                                x: Math.min(x, room.x + room.width - 5), // Keep inside
                                y: Math.min(y, room.y + room.height - 5)
                            }
                        })
                        setAppliances(mappedAppliances)
                    }
                }
            } catch (error) {
                console.error('Error fetching appliances:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchAppliances()
    }, [])

    const getIconForType = (type) => {
        const t = (type || '').toLowerCase()
        if (t.includes('ac') || t.includes('air')) return '❄️'
        if (t.includes('fridge') || t.includes('ref')) return '🧊'
        if (t.includes('wash')) return '🌀'
        if (t.includes('tv')) return '📺'
        if (t.includes('micro') || t.includes('oven')) return '📦'
        return '🔌'
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
            case 'healthy':
                return '#10b981'
            case 'warning':
                return '#f59e0b'
            case 'critical':
                return '#ef4444'
            default:
                return '#6b7280'
        }
    }

    const handleZoomIn = () => setZoom(Math.min(zoom + 0.1, 1.5))
    const handleZoomOut = () => setZoom(Math.max(zoom - 0.1, 0.7))

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading map...</div>

    return (
        <div className="page-container">
            {/* Header */}
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h2 style={{ marginBottom: 'var(--spacing-xs)' }}>3D House Map</h2>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 'var(--font-size-sm)' }}>
                    Interactive view of all your appliances
                </p>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={handleZoomIn} style={{ padding: 'var(--spacing-xs) var(--spacing-sm)' }}>
                    <ZoomIn size={16} />
                    Zoom In
                </button>
                <button className="btn btn-secondary" onClick={handleZoomOut} style={{ padding: 'var(--spacing-xs) var(--spacing-sm)' }}>
                    <ZoomOut size={16} />
                    Zoom Out
                </button>
                <button className="btn btn-secondary" onClick={() => setZoom(1)} style={{ padding: 'var(--spacing-xs) var(--spacing-sm)' }}>
                    <Maximize2 size={16} />
                    Reset
                </button>
            </div>

            {/* 3D House Map */}
            <div className="card" style={{ padding: 'var(--spacing-lg)', backgroundColor: '#f8fafc', minHeight: '400px', position: 'relative', overflow: 'hidden' }}>
                <div
                    style={{
                        position: 'relative',
                        width: '100%',
                        height: '500px',
                        transform: `scale(${zoom})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.3s ease',
                    }}
                >
                    {/* SVG House Map */}
                    <svg
                        viewBox="0 0 100 100"
                        style={{
                            width: '100%',
                            height: '100%',
                            filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
                        }}
                    >
                        {/* Rooms */}
                        {rooms.map((room) => (
                            <g key={room.id}>
                                {/* Room Rectangle */}
                                <rect
                                    x={room.x}
                                    y={room.y}
                                    width={room.width}
                                    height={room.height}
                                    fill={selectedRoom === room.id ? `${room.color}40` : `${room.color}20`}
                                    stroke={room.color}
                                    strokeWidth="0.5"
                                    rx="1"
                                    style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                                    onClick={() => setSelectedRoom(selectedRoom === room.id ? null : room.id)}
                                />

                                {/* Room Label */}
                                <text
                                    x={room.x + room.width / 2}
                                    y={room.y + 5}
                                    textAnchor="middle"
                                    fill={room.color}
                                    fontSize="3"
                                    fontWeight="600"
                                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                                >
                                    {room.name}
                                </text>

                                {/* Room Floor Pattern */}
                                <pattern id={`pattern-${room.id}`} patternUnits="userSpaceOnUse" width="4" height="4">
                                    <path d="M 0 0 L 4 0 L 4 4 L 0 4 Z" fill="none" stroke={room.color} strokeWidth="0.1" opacity="0.2" />
                                </pattern>
                                <rect
                                    x={room.x}
                                    y={room.y}
                                    width={room.width}
                                    height={room.height}
                                    fill={`url(#pattern-${room.id})`}
                                    style={{ pointerEvents: 'none' }}
                                />
                            </g>
                        ))}

                        {/* Appliances */}
                        {appliances.map((appliance) => (
                            <g key={appliance.id}>
                                {/* Appliance Circle */}
                                <circle
                                    cx={appliance.x}
                                    cy={appliance.y}
                                    r="4"
                                    fill="white"
                                    stroke={getStatusColor(appliance.status)}
                                    strokeWidth="0.8"
                                    style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                                    onClick={() => alert(`${appliance.name}\nStatus: ${appliance.status}`)}
                                />

                                {/* Status Indicator */}
                                <circle
                                    cx={appliance.x + 2.5}
                                    cy={appliance.y - 2.5}
                                    r="1.2"
                                    fill={getStatusColor(appliance.status)}
                                    style={{ pointerEvents: 'none' }}
                                />

                                {/* Appliance Icon */}
                                <text
                                    x={appliance.x}
                                    y={appliance.y + 1.5}
                                    textAnchor="middle"
                                    fontSize="3"
                                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                                >
                                    {appliance.icon}
                                </text>

                                {/* Appliance Label */}
                                <text
                                    x={appliance.x}
                                    y={appliance.y + 7}
                                    textAnchor="middle"
                                    fill="#374151"
                                    fontSize="2"
                                    fontWeight="500"
                                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                                >
                                    {appliance.name.split(' ')[0]}
                                </text>
                            </g>
                        ))}

                        {/* House Outline */}
                        <rect
                            x="8"
                            y="8"
                            width="84"
                            height="84"
                            fill="none"
                            stroke="#1f2937"
                            strokeWidth="1"
                            rx="2"
                        />
                    </svg>
                </div>
            </div>

            {/* Legend */}
            <div className="card" style={{ marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-md)' }}>
                <h4 style={{ marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>Status Legend</h4>
                <div style={{ display: 'flex', gap: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                        <span style={{ fontSize: 'var(--font-size-sm)' }}>Healthy</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                        <span style={{ fontSize: 'var(--font-size-sm)' }}>Needs Attention</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                        <span style={{ fontSize: 'var(--font-size-sm)' }}>Critical</span>
                    </div>
                </div>
            </div>

            {/* Appliance List */}
            <div style={{ marginTop: 'var(--spacing-lg)' }}>
                <h4 style={{ marginBottom: 'var(--spacing-md)' }}>Appliances in View</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--spacing-sm)' }}>
                    {appliances.map((appliance) => (
                        <div
                            key={appliance.id}
                            className="card"
                            style={{
                                padding: 'var(--spacing-sm)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-sm)',
                                cursor: 'pointer',
                            }}
                        >
                            <div style={{ fontSize: 'var(--font-size-xl)' }}>{appliance.icon}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{appliance.name}</div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{appliance.room}</div>
                            </div>
                            <div
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: getStatusColor(appliance.status),
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default HouseMap




