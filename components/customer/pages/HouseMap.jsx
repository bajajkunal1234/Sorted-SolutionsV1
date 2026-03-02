'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Trash2, RotateCcw, ZoomIn, ZoomOut, Move, Edit3, Check, X, Maximize2, Minimize2, Zap } from 'lucide-react'

// ─── Product Catalogue ───────────────────────────────────────────────────────
const PRODUCTS = [
    { type: 'ac', label: 'Air Conditioner', emoji: '❄️', color: '#3b82f6' },
    { type: 'refrigerator', label: 'Refrigerator', emoji: '🧊', color: '#06b6d4' },
    { type: 'sofa', label: 'Sofa', emoji: '🛋️', color: '#f59e0b' },
    { type: 'tv', label: 'TV', emoji: '📺', color: '#8b5cf6' },
    { type: 'washing', label: 'Washing Machine', emoji: '🌀', color: '#10b981' },
    { type: 'curtain', label: 'Curtains', emoji: '🪟', color: '#ec4899' },
    { type: 'bed', label: 'Bed', emoji: '🛏️', color: '#6366f1' },
    { type: 'microwave', label: 'Microwave', emoji: '📦', color: '#ef4444' },
    { type: 'dining', label: 'Dining Table', emoji: '🍽️', color: '#84cc16' },
    { type: 'wardrobe', label: 'Wardrobe', emoji: '👔', color: '#a78bfa' },
    { type: 'plant', label: 'Indoor Plant', emoji: '🌿', color: '#22c55e' },
    { type: 'lamp', label: 'Floor Lamp', emoji: '💡', color: '#fbbf24' },
]

// ─── Default Room Layout ─────────────────────────────────────────────────────
// Each room: grid col/row in a regular grid, width/height in grid units
const DEFAULT_ROOMS = [
    { id: 'lr', name: 'Living Room', gx: 0, gy: 0, gw: 3, gh: 3, floorColor: '#fef3c7', accent: '#f59e0b', products: [] },
    { id: 'kt', name: 'Kitchen', gx: 3, gy: 0, gw: 2, gh: 3, accent: '#22c55e', floorColor: '#dcfce7', products: [] },
    { id: 'b1', name: 'Bedroom 1', gx: 0, gy: 3, gw: 2, gh: 3, accent: '#8b5cf6', floorColor: '#ede9fe', products: [] },
    { id: 'b2', name: 'Bedroom 2', gx: 2, gy: 3, gw: 3, gh: 3, accent: '#ec4899', floorColor: '#fce7f3', products: [] },
]

const GRID = 70   // px per grid unit
const WALL = 38   // isometric wall height

// Isometric projection: flat grid (gx,gy) → screen (sx,sy)
function iso(gx, gy) {
    return {
        sx: (gx - gy) * GRID,
        sy: (gx + gy) * GRID * 0.5,
    }
}

const uid = () => Math.random().toString(36).slice(2, 9)
const STORAGE_KEY = 'sorted_house_v3'

function shadeHex(hex, pct) {
    if (!hex?.startsWith('#')) return hex
    const parse = s => parseInt(s, 16)
    let r = parse(hex.slice(1, 3)), g = parse(hex.slice(3, 5)), b = parse(hex.slice(5, 7))
    const clamp = v => Math.min(255, Math.max(0, Math.round(v + v * pct / 100)))
    return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HouseMap() {
    const [rooms, setRooms] = useState(DEFAULT_ROOMS)
    const [zoom, setZoom] = useState(1)
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const [addTo, setAddTo] = useState(null)   // roomId for product picker
    const [selProd, setSelProd] = useState(null)   // { roomId, productId }
    const [editRoom, setEditRoom] = useState(null)   // roomId being renamed
    const [editName, setEditName] = useState('')
    const [addRoomOpen, setAddRoomOpen] = useState(false)
    const [newRoomName, setNewRoomName] = useState('')
    const [fullscreen, setFullscreen] = useState(false)
    const [dragging, setDragging] = useState(null)   // { roomId, productId }

    const isPanning = useRef(false)
    const panStart = useRef({ x: 0, y: 0 })
    const panOrigin = useRef({ x: 0, y: 0 })
    const dragLast = useRef({ x: 0, y: 0 })

    // ── Persistence ──────────────────────────────────────────────────────────
    useEffect(() => {
        try {
            const s = localStorage.getItem(STORAGE_KEY)
            if (s) {
                const p = JSON.parse(s)
                if (p?.rooms?.length) setRooms(p.rooms)
                if (p?.pan) setPan(p.pan)
                if (p?.zoom) setZoom(p.zoom)
            }
        } catch (_) { }
    }, [])

    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ rooms, pan, zoom })) }
        catch (_) { }
    }, [rooms, pan, zoom])

    // ── Canvas pan ───────────────────────────────────────────────────────────
    const onCanvasDown = useCallback((e) => {
        if (e.button !== 0) return
        if (e.target.closest('[data-product]') || e.target.closest('[data-ui]')) return
        isPanning.current = true
        panStart.current = { x: e.clientX, y: e.clientY }
        panOrigin.current = { ...pan }
    }, [pan])

    const onCanvasMove = useCallback((e) => {
        if (dragging) {
            // Forward to product drag logic
            const ddx = (e.clientX - dragLast.current.x) / zoom
            const ddy = (e.clientY - dragLast.current.y) / zoom
            dragLast.current = { x: e.clientX, y: e.clientY }
            setRooms(prev => prev.map(room => {
                if (room.id !== dragging.roomId) return room
                return {
                    ...room,
                    products: room.products.map(p => {
                        if (p.id !== dragging.productId) return p
                        const maxX = room.gw * GRID - 36
                        const maxY = room.gh * GRID - 36
                        return { ...p, ox: Math.max(4, Math.min(maxX, (p.ox || 10) + ddx)), oy: Math.max(4, Math.min(maxY, (p.oy || 10) + ddy)) }
                    })
                }
            }))
            return
        }
        if (!isPanning.current) return
        const dx = e.clientX - panStart.current.x
        const dy = e.clientY - panStart.current.y
        setPan({ x: panOrigin.current.x + dx, y: panOrigin.current.y + dy })
    }, [dragging, zoom])

    const onCanvasUp = useCallback(() => { isPanning.current = false; setDragging(null) }, [])

    // ── Room / product actions ────────────────────────────────────────────────
    const addProduct = (roomId, type) => {
        setRooms(prev => prev.map(r => {
            if (r.id !== roomId) return r
            const idx = r.products.length
            return { ...r, products: [...r.products, { id: uid(), type, ox: 10 + (idx % 3) * 42, oy: 10 + Math.floor(idx / 3) * 42 }] }
        }))
        setAddTo(null)
    }
    const removeProduct = (roomId, productId) => {
        setRooms(prev => prev.map(r => r.id !== roomId ? r : { ...r, products: r.products.filter(p => p.id !== productId) }))
        setSelProd(null)
    }
    const renameRoom = (id) => {
        if (!editName.trim()) return
        setRooms(prev => prev.map(r => r.id !== id ? r : { ...r, name: editName.trim() }))
        setEditRoom(null)
    }
    const removeRoom = (id) => {
        if (rooms.length <= 1) return
        if (!confirm('Remove this room and all its products?')) return
        setRooms(prev => prev.filter(r => r.id !== id))
    }
    const addRoom = () => {
        if (!newRoomName.trim()) return
        const maxGx = Math.max(...rooms.map(r => r.gx + r.gw))
        setRooms(prev => [...prev, {
            id: uid(), name: newRoomName.trim(),
            gx: maxGx, gy: 0, gw: 2, gh: 3,
            floorColor: `hsl(${Math.random() * 360 | 0},70%,92%)`,
            accent: `hsl(${Math.random() * 360 | 0},60%,55%)`,
            products: []
        }])
        setNewRoomName(''); setAddRoomOpen(false)
    }
    const resetLayout = () => {
        if (!confirm('Reset to default layout?')) return
        setRooms(DEFAULT_ROOMS); setPan({ x: 0, y: 0 }); setZoom(1)
    }

    const selProductData = selProd
        ? (() => {
            const r = rooms.find(r => r.id === selProd.roomId)
            const p = r?.products.find(p => p.id === selProd.productId)
            const cat = PRODUCTS.find(c => c.type === p?.type)
            return p && cat ? { r, p, cat } : null
        })() : null

    return (
        <div
            style={{
                display: 'flex', flexDirection: 'column',
                height: fullscreen ? '100vh' : 'calc(100vh - 80px)',
                position: fullscreen ? 'fixed' : 'relative',
                inset: fullscreen ? 0 : 'auto',
                zIndex: fullscreen ? 9999 : 'auto',
                background: 'linear-gradient(160deg,#0f172a 0%,#1e293b 60%,#0f172a 100%)',
                overflow: 'hidden',
                fontFamily: "'Inter',system-ui,sans-serif",
                userSelect: 'none',
            }}
            onMouseMove={onCanvasMove}
            onMouseUp={onCanvasUp}
            onMouseLeave={onCanvasUp}
        >
            {/* ── TOP BAR ─────────────────────────────────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, flexWrap: 'wrap',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🏠</div>
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>My Home Map</div>
                        <div style={{ color: '#475569', fontSize: 11, whiteSpace: 'nowrap' }}>Drag products • Click to edit</div>
                    </div>
                </div>
                {/* Zoom */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <TBtn onClick={() => setZoom(z => Math.max(0.35, z - 0.15))} title="Zoom Out"><ZoomOut size={14} /></TBtn>
                    <span style={{ color: '#64748b', fontSize: 11, minWidth: 36, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                    <TBtn onClick={() => setZoom(z => Math.min(2.5, z + 0.15))} title="Zoom In"><ZoomIn size={14} /></TBtn>
                </div>
                <TBtn onClick={resetLayout} title="Reset"><RotateCcw size={14} /><span style={{ fontSize: 11, fontWeight: 600 }}>Reset</span></TBtn>
                <TBtn onClick={() => setFullscreen(f => !f)} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>{fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</TBtn>
                <button data-ui onClick={() => setAddRoomOpen(v => !v)} style={accentBtn('#3b82f6')}><Plus size={13} /> Add Room</button>
            </div>

            {/* ── Add Room input ───────────────────────────────────────────── */}
            {addRoomOpen && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 14px', background: 'rgba(15,23,42,0.95)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <input autoFocus placeholder="Room name (e.g. Study Room)" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRoom()} style={inputSt} />
                    <button data-ui onClick={addRoom} style={accentBtn('#10b981', 'sm')}><Check size={12} /> Add</button>
                    <button data-ui onClick={() => setAddRoomOpen(false)} style={accentBtn('#64748b', 'sm')}><X size={12} /></button>
                </div>
            )}

            {/* ── CANVAS ──────────────────────────────────────────────────── */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: dragging ? 'grabbing' : 'grab' }} onMouseDown={onCanvasDown}>
                {/* dotted bg */}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px,transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />

                {/* House container — centered + panned */}
                <div style={{
                    position: 'absolute',
                    left: '50%', top: '50%',
                    transform: `translate(-50%,-50%) translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: dragging ? 'none' : 'transform 0.04s',
                }}>
                    {rooms.map(room => (
                        <IsoRoom
                            key={room.id}
                            room={room}
                            selProd={selProd}
                            setSelProd={setSelProd}
                            editRoom={editRoom}
                            setEditRoom={setEditRoom}
                            editName={editName}
                            setEditName={setEditName}
                            renameRoom={renameRoom}
                            removeRoom={removeRoom}
                            onAddTo={id => setAddTo(id)}
                            removeProduct={removeProduct}
                            setDragging={setDragging}
                            dragLast={dragLast}
                            dragging={dragging}
                        />
                    ))}
                </div>
            </div>

            {/* ── Product picker drawer ────────────────────────────────────── */}
            {addTo && (
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'rgba(10,18,35,0.98)', backdropFilter: 'blur(16px)',
                    borderTop: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px 20px 0 0',
                    padding: 16, zIndex: 100, maxHeight: '52%', overflowY: 'auto',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div>
                            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15 }}>Add to {rooms.find(r => r.id === addTo)?.name}</div>
                            <div style={{ color: '#475569', fontSize: 11 }}>Select a product to place in this room</div>
                        </div>
                        <button onClick={() => setAddTo(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(88px,1fr))', gap: 10 }}>
                        {PRODUCTS.map(cat => (
                            <button key={cat.type} onClick={() => addProduct(addTo, cat.type)} style={{
                                background: `${cat.color}16`, border: `1.5px solid ${cat.color}45`, borderRadius: 12,
                                padding: '11px 6px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                                transition: 'all 0.15s',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.background = `${cat.color}30`; e.currentTarget.style.transform = 'translateY(-2px)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = `${cat.color}16`; e.currentTarget.style.transform = '' }}>
                                <span style={{ fontSize: 26 }}>{cat.emoji}</span>
                                <span style={{ color: '#e2e8f0', fontSize: 10, fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>{cat.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Selected product popup ───────────────────────────────────── */}
            {selProductData && (
                <div style={{
                    position: 'absolute', top: 60, right: 14,
                    background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, minWidth: 180, zIndex: 200,
                    boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${selProductData.cat.color}22`, border: `1.5px solid ${selProductData.cat.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{selProductData.cat.emoji}</div>
                        <div>
                            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13 }}>{selProductData.cat.label}</div>
                            <div style={{ color: '#475569', fontSize: 11 }}>{selProductData.r.name}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => removeProduct(selProd.roomId, selProd.productId)} style={{ flex: 1, padding: '8px', background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.28)', borderRadius: 8, color: '#f87171', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                            <Trash2 size={12} /> Remove
                        </button>
                        <button onClick={() => setSelProd(null)} style={{ padding: '8px 10px', background: 'rgba(100,116,139,0.14)', border: '1px solid rgba(100,116,139,0.28)', borderRadius: 8, color: '#94a3b8', cursor: 'pointer' }}><X size={12} /></button>
                    </div>
                </div>
            )}

            {/* ── Legend ──────────────────────────────────────────────────── */}
            <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(10,18,35,0.8)', backdropFilter: 'blur(8px)', borderRadius: 10, padding: '7px 12px', border: '1px solid rgba(255,255,255,0.07)', fontSize: 11, color: '#475569', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><Move size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Drag canvas to pan</div>
                <div>🖱️ Drag products to reposition</div>
                <div>👆 Tap product to manage</div>
            </div>
        </div>
    )
}

// ─── Isometric Room ───────────────────────────────────────────────────────────
function IsoRoom({ room, selProd, setSelProd, editRoom, setEditRoom, editName, setEditName, renameRoom, removeRoom, onAddTo, removeProduct, setDragging, dragLast, dragging }) {
    const [hovered, setHovered] = useState(false)
    const { gx, gy, gw, gh, floorColor, accent, products } = room

    // Corner projections of this room in iso space
    const TL = iso(gx, gy)
    const TR = iso(gx + gw, gy)
    const BR = iso(gx + gw, gy + gh)
    const BL = iso(gx, gy + gh)

    // SVG floor parallelogram (4 vertices)
    const floorPts = [TL, TR, BR, BL].map(p => `${p.sx},${p.sy + WALL}`).join(' ')

    // Visible left wall (BL corner down WALL)
    const lwPts = [
        `${BL.sx},${BL.sy + WALL}`,
        `${BL.sx},${BL.sy + WALL + WALL}`,
        `${BR.sx},${BR.sy + WALL + WALL}`,
        `${BR.sx},${BR.sy + WALL}`,
    ].join(' ')

    // Visible right wall (BR corner down WALL) — only show one side
    const rwPts = [
        `${TR.sx},${TR.sy + WALL}`,
        `${TR.sx},${TR.sy + WALL + WALL}`,
        `${BR.sx},${BR.sy + WALL + WALL}`,
        `${BR.sx},${BR.sy + WALL}`,
    ].join(' ')

    // Bounding box for SVG container: enough to contain the room + walls
    const allX = [TL.sx, TR.sx, BR.sx, BL.sx]
    const allY = [TL.sy, TR.sy, BR.sy, BL.sy].map(y => y + WALL + WALL)
    const minX = Math.min(...allX), maxX = Math.max(...allX)
    const minY = Math.min(...[TL.sy, TR.sy, BR.sy, BL.sy]), maxY = Math.max(...allY)
    const svgW = maxX - minX + 4
    const svgH = maxY - minY + 4
    const offX = -minX + 2
    const offY = -minY + 2

    // Floor center for label
    const cx = ((TL.sx + TR.sx + BR.sx + BL.sx) / 4 + offX)
    const cy = ((TL.sy + TR.sy + BR.sy + BL.sy) / 4 + offY + WALL - 4)

    const wallL = shadeHex(accent, -20)
    const wallR = shadeHex(accent, -38)

    // Absolute position: put the room's iso TL at correct spot
    const posLeft = TL.sx + minX > 0 ? minX : minX
    const posTop = TL.sy

    return (
        <div
            style={{ position: 'absolute', left: minX, top: minY }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <svg width={svgW} height={svgH} style={{ overflow: 'visible', display: 'block' }}>
                <defs>
                    {/* Floor tile pattern */}
                    <pattern id={`fp-${room.id}`} patternUnits="userSpaceOnUse" width="14" height="14">
                        <rect width="14" height="14" fill={floorColor} />
                        <line x1="14" y1="0" x2="0" y2="14" stroke={shadeHex(floorColor, -12)} strokeWidth="0.6" opacity="0.5" />
                    </pattern>
                    <filter id={`sh-${room.id}`} x="-20%" y="-20%" width="140%" height="160%">
                        <feDropShadow dx="2" dy="8" stdDeviation="5" floodColor="rgba(0,0,0,0.45)" />
                    </filter>
                </defs>

                {/* Left wall */}
                <polygon points={lwPts.split(' ').map(pt => { const [x, y] = pt.split(','); return `${+x + offX},${+y + offY}` }).join(' ')}
                    fill={wallL} stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
                {/* Right wall */}
                <polygon points={rwPts.split(' ').map(pt => { const [x, y] = pt.split(','); return `${+x + offX},${+y + offY}` }).join(' ')}
                    fill={wallR} stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
                {/* Floor */}
                <polygon
                    points={floorPts.split(' ').map(pt => { const [x, y] = pt.split(','); return `${+x + offX},${+y + offY}` }).join(' ')}
                    fill={`url(#fp-${room.id})`}
                    stroke={hovered ? accent : 'rgba(0,0,0,0.2)'}
                    strokeWidth={hovered ? 1.5 : 0.6}
                    filter={`url(#sh-${room.id})`}
                    style={{ transition: 'stroke 0.2s,stroke-width 0.2s' }}
                />
                {/* Rim highlight */}
                <polygon points={floorPts.split(' ').map(pt => { const [x, y] = pt.split(','); return `${+x + offX},${+y + offY}` }).join(' ')}
                    fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.7" pointerEvents="none" />

                {/* Room label */}
                {editRoom !== room.id && (
                    <text x={cx} y={cy} textAnchor="middle" fill={shadeHex(accent, -55)} fontSize="9" fontWeight="700" fontFamily="Inter,system-ui" pointerEvents="none" letterSpacing="0.4">
                        {room.name}
                    </text>
                )}
            </svg>

            {/* Products overlay */}
            {products.map(prod => {
                const cat = PRODUCTS.find(c => c.type === prod.type)
                const isSel = selProd?.productId === prod.id
                const isDrag = dragging?.productId === prod.id

                // Map product's local flat position onto the iso floor
                // prod.ox, prod.oy are 0..gw*GRID, 0..gh*GRID (flat room coords)
                // We need to project (gx + ox/GRID, gy + oy/GRID) into iso
                const normX = (prod.ox || 10) / (gw * GRID)
                const normY = (prod.oy || 10) / (gh * GRID)
                const pgx = gx + normX * gw
                const pgy = gy + normY * gh
                const { sx, sy } = iso(pgx, pgy)
                const pLeft = sx - minX + offX - 16
                const pTop = sy - minY + offY + WALL - 16

                return (
                    <div
                        key={prod.id}
                        data-product
                        style={{
                            position: 'absolute',
                            left: pLeft,
                            top: pTop,
                            width: 32, height: 32,
                            borderRadius: '50%',
                            background: isSel ? `${cat.color}50` : `${cat.color}28`,
                            border: `${isSel ? 2.5 : 1.5}px solid ${cat.color}${isSel ? 'dd' : '88'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16,
                            cursor: isDrag ? 'grabbing' : 'grab',
                            zIndex: isSel || isDrag ? 50 : 10,
                            boxShadow: isSel ? `0 0 0 4px ${cat.color}35, 0 6px 20px rgba(0,0,0,0.4)` : '0 3px 10px rgba(0,0,0,0.35)',
                            transform: isDrag ? 'scale(1.2)' : isSel ? 'scale(1.1)' : 'scale(1)',
                            transition: isDrag ? 'box-shadow 0.1s' : 'all 0.14s',
                            backdropFilter: 'blur(4px)',
                        }}
                        title={cat.label}
                        onMouseDown={e => {
                            e.stopPropagation()
                            dragLast.current = { x: e.clientX, y: e.clientY }
                            setDragging({ roomId: room.id, productId: prod.id })
                        }}
                        onClick={e => {
                            e.stopPropagation()
                            setSelProd(isSel ? null : { roomId: room.id, productId: prod.id })
                        }}
                    >
                        {cat.emoji}
                    </div>
                )
            })}

            {/* Hover controls */}
            {hovered && editRoom !== room.id && (
                <div style={{ position: 'absolute', left: cx - 48, top: -24, display: 'flex', gap: 5, zIndex: 300 }}>
                    <RBtn color="#3b82f6" title="Add product" onClick={() => onAddTo(room.id)}><Plus size={11} /></RBtn>
                    <RBtn color="#6366f1" title="Rename room" onClick={() => { setEditRoom(room.id); setEditName(room.name) }}><Edit3 size={11} /></RBtn>
                    <RBtn color="#ef4444" title="Remove room" onClick={() => removeRoom(room.id)}><Trash2 size={11} /></RBtn>
                </div>
            )}

            {/* Inline rename */}
            {editRoom === room.id && (
                <div style={{ position: 'absolute', left: cx - 80, top: -28, display: 'flex', gap: 5, zIndex: 400 }}>
                    <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') renameRoom(room.id); if (e.key === 'Escape') setEditRoom(null) }}
                        style={{ ...inputSt, fontSize: 11, padding: '4px 8px', width: 120 }} />
                    <RBtn color="#10b981" onClick={() => renameRoom(room.id)}><Check size={10} /></RBtn>
                    <RBtn color="#64748b" onClick={() => setEditRoom(null)}><X size={10} /></RBtn>
                </div>
            )}
        </div>
    )
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function TBtn({ onClick, title, children }) {
    return (
        <button title={title} onClick={onClick} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#f1f5f9' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8' }}>
            {children}
        </button>
    )
}
function RBtn({ onClick, title, color, children }) {
    return (
        <button data-ui title={title} onClick={e => { e.stopPropagation(); onClick() }} style={{ width: 24, height: 24, borderRadius: 6, background: `${color}22`, border: `1.5px solid ${color}66`, color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = `${color}40`; e.currentTarget.style.transform = 'scale(1.12)' }}
            onMouseLeave={e => { e.currentTarget.style.background = `${color}22`; e.currentTarget.style.transform = '' }}>
            {children}
        </button>
    )
}

function accentBtn(color, size) {
    return {
        padding: size === 'sm' ? '5px 9px' : '7px 12px',
        background: `${color}18`, border: `1.5px solid ${color}45`, borderRadius: 8,
        color, fontSize: 11, fontWeight: 700, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s', whiteSpace: 'nowrap',
    }
}

const inputSt = {
    padding: '7px 12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none', flex: 1, minWidth: 0,
}
