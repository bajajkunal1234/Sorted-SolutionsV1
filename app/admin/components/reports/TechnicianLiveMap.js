'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabase';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Green dot — on-job technician
const onJobIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3204/3204085.png',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
});

// Grey dot — idle technician (custom SVG pin)
const idleIcon = new L.DivIcon({
    className: '',
    html: `<div style="width:32px;height:32px;border-radius:50%;background:#475569;border:3px solid #94a3b8;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.4)">🔧</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
});

const MUMBAI = [19.076, 72.8777];

function FitBounds({ positions }) {
    const map = useMap();
    useEffect(() => {
        if (positions.length === 0) return;
        const bounds = L.latLngBounds(positions.map(p => [p.latitude, p.longitude]));
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }, [positions, map]);
    return null;
}

function formatAge(secondsAgo) {
    if (secondsAgo < 90)  return `${secondsAgo}s ago`;
    if (secondsAgo < 3600) return `${Math.round(secondsAgo / 60)}m ago`;
    return `${Math.round(secondsAgo / 3600)}h ago`;
}

/**
 * TechnicianLiveMap — Admin fleet monitoring map.
 * Shows ALL logged-in technicians regardless of job status.
 * Idle = grey dot, On-job = blue icon.
 * Refreshes every 60s automatically.
 */
export default function TechnicianLiveMap({ activeTechnicians = [] }) {
    const [allLocations, setAllLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(null);

    // Job-specific real-time positions (for on-job technicians via Supabase Realtime)
    const [livePositions, setLivePositions] = useState({});
    const channelsRef = useRef([]);

    // Fetch all online technicians from fleet-locations API
    const fetchLocations = async () => {
        try {
            const res = await fetch('/api/admin/fleet-locations');
            const data = await res.json();
            if (data.success) {
                setAllLocations(data.data || []);
                setLastRefresh(new Date());
            }
        } catch (e) {
            console.error('Fleet locations fetch failed:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocations();
        const interval = setInterval(fetchLocations, 60_000); // auto-refresh every 60s
        return () => clearInterval(interval);
    }, []);

    // Also subscribe to real-time Supabase broadcasts for in-progress jobs
    // (higher frequency updates for active tracking)
    useEffect(() => {
        channelsRef.current.forEach(ch => supabase.removeChannel(ch));
        channelsRef.current = [];

        if (!activeTechnicians || activeTechnicians.length === 0) return;

        activeTechnicians.forEach(tech => {
            if (!tech.job_id) return;
            const ch = supabase.channel(`tracking:job_${tech.job_id}`);
            ch.on('broadcast', { event: 'location_update' }, ({ payload }) => {
                if (!payload?.latitude || !payload?.longitude) return;
                setLivePositions(prev => ({
                    ...prev,
                    [tech.technician_id || tech.job_id]: {
                        lat: payload.latitude,
                        lng: payload.longitude,
                    }
                }));
            }).subscribe();
            channelsRef.current.push(ch);
        });

        return () => channelsRef.current.forEach(ch => supabase.removeChannel(ch));
    }, [activeTechnicians]);

    // Merge: use real-time position if available, otherwise use last-known from DB
    const mergedLocations = allLocations.map(loc => {
        const rt = livePositions[loc.technician_id];
        return {
            ...loc,
            latitude: rt?.lat ?? loc.latitude,
            longitude: rt?.lng ?? loc.longitude,
            isRealtime: !!rt,
        };
    });

    const onJob  = mergedLocations.filter(l => l.is_on_job);
    const idle   = mergedLocations.filter(l => !l.is_on_job);
    const online = mergedLocations.length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Status badges */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', color: '#38bdf8', fontWeight: 700, fontSize: 13 }}>
                    🔵 {online} Online now
                </div>
                <div style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', fontWeight: 700, fontSize: 13 }}>
                    🟢 {onJob.length} On a job
                </div>
                <div style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.25)', color: '#94a3b8', fontWeight: 700, fontSize: 13 }}>
                    ⚪ {idle.length} Idle
                </div>
                {lastRefresh && (
                    <div style={{ fontSize: 11, color: '#475569', marginLeft: 'auto' }}>
                        Last refresh: {lastRefresh.toLocaleTimeString()}
                        <button onClick={fetchLocations} style={{ marginLeft: 8, fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                            ↻ Refresh
                        </button>
                    </div>
                )}
            </div>

            {/* Map */}
            <div style={{ height: 480, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
                <MapContainer center={MUMBAI} zoom={12} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://carto.com/">Carto</a>'
                    />
                    {mergedLocations.length > 0 && <FitBounds positions={mergedLocations} />}

                    {mergedLocations.map(loc => (
                        <Marker
                            key={loc.technician_id}
                            position={[loc.latitude, loc.longitude]}
                            icon={loc.is_on_job ? onJobIcon : idleIcon}
                        >
                            <Popup>
                                <div style={{ minWidth: 160 }}>
                                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                                        🔧 {loc.name}
                                    </div>
                                    <div style={{
                                        display: 'inline-block', padding: '2px 8px', borderRadius: 12,
                                        background: loc.is_on_job ? '#dcfce7' : '#f1f5f9',
                                        color: loc.is_on_job ? '#16a34a' : '#64748b',
                                        fontSize: 11, fontWeight: 700, marginBottom: 6
                                    }}>
                                        {loc.is_on_job ? '🟢 ON JOB' : '⚪ IDLE'}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                        📍 Last seen: {formatAge(loc.seconds_ago)}
                                        {loc.isRealtime && <span style={{ color: '#10b981', marginLeft: 4 }}>● Live</span>}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            {/* No one online */}
            {!loading && online === 0 && (
                <div style={{ textAlign: 'center', padding: 32, color: '#475569', fontSize: 14 }}>
                    No technicians have opened the app in the last 15 minutes.
                </div>
            )}

            {/* Technician roster */}
            {online > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
                    {mergedLocations.map(loc => (
                        <div key={loc.technician_id} style={{
                            padding: '10px 12px', borderRadius: 10,
                            background: 'rgba(255,255,255,0.03)',
                            border: `1px solid ${loc.is_on_job ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.07)'}`,
                            display: 'flex', alignItems: 'center', gap: 10
                        }}>
                            <div style={{
                                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                                backgroundColor: loc.is_on_job ? '#10b981' : '#475569',
                                boxShadow: loc.is_on_job ? '0 0 0 3px rgba(16,185,129,0.2)' : 'none',
                                animation: loc.is_on_job ? 'pulse 2s infinite' : 'none',
                            }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, color: '#e2e8f0' }}>
                                    {loc.name}
                                </div>
                                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                    {loc.is_on_job ? '🟢 On a job' : '⚪ Idle'} · {formatAge(loc.seconds_ago)}
                                </div>
                            </div>
                            {loc.isRealtime && (
                                <div style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>● LIVE</div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
