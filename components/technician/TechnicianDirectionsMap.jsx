'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Blue dot for technician
const techIcon = new L.DivIcon({
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 3px rgba(59,130,246,0.4)"></div>`,
    className: '', iconAnchor: [9, 9],
});

// Red pin for customer
const custIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41],
});

/** Fetch driving route from OSRM (completely free, no key needed) */
async function fetchRoute(fromLat, fromLng, toLat, toLng) {
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?steps=true&geometries=geojson&overview=full`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.code === 'Ok' && data.routes.length > 0) {
            const route = data.routes[0];
            return {
                coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
                distanceM: route.distance,
                durationS: route.duration,
                steps: route.legs[0]?.steps?.map(s => ({
                    instruction: s.maneuver?.type === 'arrive' ? '📍 Arrive at destination' : formatStep(s),
                    distanceM: s.distance,
                })) || [],
            };
        }
    } catch (_) {}
    return null;
}

function formatStep(step) {
    const dir = step.maneuver?.modifier;
    const icons = {
        left: '↰', 'slight left': '↖', 'sharp left': '↙',
        right: '↱', 'slight right': '↗', 'sharp right': '↘',
        straight: '↑', uturn: '↺',
    };
    const arrow = icons[dir] || '→';
    const street = step.name && step.name !== '' ? ` onto ${step.name}` : '';
    const type = step.maneuver?.type;
    if (type === 'depart') return `🚀 Start${street}`;
    if (type === 'turn') return `${arrow} Turn ${dir}${street}`;
    if (type === 'roundabout') return `🔄 Take roundabout${street}`;
    return `${arrow} Continue${street}`;
}

function formatDist(m) {
    return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}
function formatTime(s) {
    const m = Math.round(s / 60);
    return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

function FitRoute({ coords }) {
    const map = useMap();
    useEffect(() => {
        if (coords && coords.length > 1) {
            map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
        }
    }, [coords, map]);
    return null;
}

function RecenterOnTech({ position }) {
    const map = useMap();
    const didCenter = useRef(false);
    useEffect(() => {
        if (position && !didCenter.current) {
            map.setView(position, 15);
            didCenter.current = true;
        }
    }, [position, map]);
    return null;
}

/**
 * TechnicianDirectionsMap
 *
 * Shows in-app turn-by-turn directions from technician's live GPS → customer location.
 * Uses OSRM for routing (100% free, no API key).
 * Uses Leaflet + Carto tiles (100% free).
 *
 * Props:
 *   techLocation    { lat, lng } or [lat, lng]   — technician's real-time GPS
 *   custLocation    [lat, lng]                    — customer's saved pin
 *   height          string  (default '380px')
 *   onNavigateExternal fn   — fallback to open Google Maps if user prefers
 */
export default function TechnicianDirectionsMap({
    techLocation,
    custLocation,
    height = '380px',
    onNavigateExternal,
}) {
    const [route, setRoute] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeStep, setActiveStep] = useState(0);
    const lastFetchKey = useRef('');

    // Extract tech position
    const techPos = techLocation
        ? Array.isArray(techLocation) ? techLocation : [techLocation.lat, techLocation.lng]
        : null;
    const custPos = custLocation
        ? Array.isArray(custLocation) ? custLocation : [custLocation.lat, custLocation.lng]
        : null;

    useEffect(() => {
        if (!techPos || !custPos) return;
        const key = `${techPos[0].toFixed(4)},${techPos[1].toFixed(4)}|${custPos[0].toFixed(4)},${custPos[1].toFixed(4)}`;
        if (key === lastFetchKey.current) return;
        lastFetchKey.current = key;

        setLoading(true);
        setError('');
        fetchRoute(techPos[0], techPos[1], custPos[0], custPos[1])
            .then(result => {
                if (result) { setRoute(result); setActiveStep(0); }
                else setError('Could not load route. Try navigating via Google Maps.');
            })
            .finally(() => setLoading(false));
    }, [techPos?.[0], techPos?.[1], custPos?.[0], custPos?.[1]]);

    if (!custPos) {
        return (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                📍 Customer location not available. Ask admin to update the property pin.
            </div>
        );
    }

    const mapCenter = techPos || custPos;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* ── Route Summary Header ── */}
            {route && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(16,185,129,0.08))',
                    borderBottom: '1px solid rgba(59,130,246,0.15)',
                    borderRadius: '12px 12px 0 0',
                }}>
                    <div style={{ display: 'flex', gap: 20 }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8' }}>{formatDist(route.distanceM)}</div>
                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Distance</div>
                        </div>
                        <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 800, color: '#6ee7b7' }}>{formatTime(route.durationS)}</div>
                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>ETA</div>
                        </div>
                    </div>
                    {onNavigateExternal && (
                        <button
                            type="button"
                            onClick={onNavigateExternal}
                            style={{
                                padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                                border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)',
                                color: '#818cf8', cursor: 'pointer',
                            }}
                        >
                            🗺️ Open Google Maps
                        </button>
                    )}
                </div>
            )}

            {/* ── Map ── */}
            <div style={{ height, width: '100%', position: 'relative', zIndex: 0 }}>
                {loading && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)',
                        fontSize: 14, color: '#7dd3fc', gap: 8, fontWeight: 600,
                    }}>
                        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                        Calculating route...
                    </div>
                )}

                <MapContainer
                    center={mapCenter}
                    zoom={14}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                    zoomControl={true}
                >
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        attribution='&copy; Carto | Routing by OSRM'
                    />

                    {/* Route polyline */}
                    {route?.coords && (
                        <>
                            {/* Outer glow */}
                            <Polyline positions={route.coords} pathOptions={{ color: 'rgba(59,130,246,0.25)', weight: 10 }} />
                            {/* Main route */}
                            <Polyline positions={route.coords} pathOptions={{ color: '#3b82f6', weight: 5, opacity: 0.9 }} />
                        </>
                    )}

                    {/* Customer destination pin */}
                    {custPos && <Marker position={custPos} icon={custIcon} />}

                    {/* Technician live position */}
                    {techPos && <Marker position={techPos} icon={techIcon} />}

                    {/* Fit map to show full route */}
                    {route?.coords && <FitRoute coords={route.coords} />}
                    {!route && techPos && <RecenterOnTech position={techPos} />}
                </MapContainer>
            </div>

            {/* ── Turn-by-turn Steps ── */}
            {route?.steps && route.steps.length > 0 && (
                <div style={{
                    borderTop: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '0 0 12px 12px',
                    overflow: 'hidden',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    background: 'rgba(15,23,42,0.5)',
                }}>
                    <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15,23,42,0.4)' }}>
                        Turn-by-Turn Directions
                    </div>
                    {route.steps.map((step, i) => (
                        <div
                            key={i}
                            onClick={() => setActiveStep(i)}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '10px 14px',
                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                background: activeStep === i ? 'rgba(59,130,246,0.08)' : 'transparent',
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                                    background: activeStep === i ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${activeStep === i ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 11, fontWeight: 700, color: activeStep === i ? '#60a5fa' : '#475569',
                                }}>
                                    {i + 1}
                                </div>
                                <div style={{ fontSize: 13, color: activeStep === i ? '#e2e8f0' : '#94a3b8', fontWeight: activeStep === i ? 600 : 400 }}>
                                    {step.instruction}
                                </div>
                            </div>
                            {step.distanceM > 0 && (
                                <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace', flexShrink: 0, marginLeft: 8 }}>
                                    {formatDist(step.distanceM)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {error && (
                <div style={{ padding: 12, fontSize: 13, color: '#fca5a5', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    {error}
                </div>
            )}
        </div>
    );
}
