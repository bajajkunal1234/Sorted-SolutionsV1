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

// Faded grey/dark pin for offline/last-known location
const offlineIcon = new L.DivIcon({
    className: '',
    html: `<div style="width:32px;height:32px;border-radius:50%;background:#334155;border:3px solid #64748b;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.4);opacity:0.65">💤</div>`,
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
export default function TechnicianLiveMap({ activeTechnicians = [], activeJobs, height = 480, showRoster = true }) {
    const [allLocations, setAllLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(null);
    const [localActiveJobs, setLocalActiveJobs] = useState([]);

    // Job-specific real-time positions (for on-job technicians via Supabase Realtime)
    const [livePositions, setLivePositions] = useState({});
    const channelsRef = useRef([]);

    // Fetch all online technicians from fleet-locations API
    const fetchLocations = async () => {
        try {
            // Auto-fetch active jobs locally if not supplied as props
            if (!activeJobs && activeTechnicians.length === 0) {
                const jobRes = await fetch('/api/admin/jobs?status=in-progress&limit=50').catch(() => null);
                if (jobRes) {
                    const jobData = await jobRes.json();
                    setLocalActiveJobs(jobData.jobs || jobData.data || []);
                }
            }

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
    }, [activeJobs, activeTechnicians]);

    const trackingList = activeTechnicians.length > 0 
        ? activeTechnicians 
        : (activeJobs || localActiveJobs);

    // Also subscribe to real-time Supabase broadcasts for in-progress jobs
    // (higher frequency updates for active tracking)
    useEffect(() => {
        channelsRef.current.forEach(ch => supabase.removeChannel(ch));
        channelsRef.current = [];

        if (!trackingList || trackingList.length === 0) return;

        trackingList.forEach(tech => {
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
    }, [trackingList]);

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

    const activeTechsList = mergedLocations.filter(l => l.seconds_ago <= 900);
    const offlineTechsList = mergedLocations.filter(l => l.seconds_ago > 900);
    const onJobCount = activeTechsList.filter(l => l.is_on_job).length;
    const idleCount = activeTechsList.filter(l => !l.is_on_job).length;
    const onlineCount = activeTechsList.length;
    const offlineCount = offlineTechsList.length;

    const redAlertTechs = mergedLocations.filter(loc => loc.seconds_ago > 1800);
    const redAlertCount = redAlertTechs.length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Status badges */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', color: '#38bdf8', fontWeight: 700, fontSize: 13 }}>
                    🟢 {onlineCount} Online now
                </div>
                <div style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', fontWeight: 700, fontSize: 13 }}>
                    💼 {onJobCount} On a job
                </div>
                <div style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.25)', color: '#94a3b8', fontWeight: 700, fontSize: 13 }}>
                    ⚪ {idleCount} Idle
                </div>
                <div style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontWeight: 700, fontSize: 13 }}>
                    💤 {offlineCount} Offline (Last Known)
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

            {/* Red Alert Banner */}
            {redAlertCount > 0 && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#ef4444',
                    fontWeight: 600,
                    fontSize: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                        <span>🚨 RED ALERT:</span>
                        <span>{redAlertCount} {redAlertCount === 1 ? 'technician has' : 'technicians have'} not sent location pings for over 30 minutes!</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(239, 68, 68, 0.85)', paddingLeft: 22 }}>
                        Unresponsive: {redAlertTechs.map(t => `${t.name} (${formatAge(t.seconds_ago)})`).join(', ')}
                    </div>
                </div>
            )}

            {/* Map */}
            <div style={{ height: height, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
                <MapContainer center={MUMBAI} zoom={12} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://carto.com/">Carto</a>'
                    />
                    {mergedLocations.length > 0 && <FitBounds positions={mergedLocations} />}

                    {mergedLocations.map(loc => {
                        const isOffline = loc.seconds_ago > 900;
                        let markerIcon = idleIcon;
                        if (isOffline) {
                            markerIcon = offlineIcon;
                        } else if (loc.is_on_job) {
                            markerIcon = onJobIcon;
                        }

                        return (
                            <Marker
                                key={loc.technician_id}
                                position={[loc.latitude, loc.longitude]}
                                icon={markerIcon}
                            >
                                <Popup>
                                    <div style={{ minWidth: 160 }}>
                                        <div style={{ fontWeight: 700, marginBottom: 4 }}>
                                            🔧 {loc.name}
                                        </div>
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: 12,
                                                background: loc.is_online ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                                                color: loc.is_online ? '#10b981' : '#94a3b8',
                                                fontSize: 10, fontWeight: 700
                                            }}>
                                                {loc.is_online ? 'ONLINE' : 'OFFLINE'}
                                            </span>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: 12,
                                                background: loc.location_precision === 'precise' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                color: loc.location_precision === 'precise' ? '#38bdf8' : '#f59e0b',
                                                fontSize: 10, fontWeight: 700
                                            }}>
                                                {loc.location_precision === 'precise' ? 'PRECISE' : 'APPROX'}
                                            </span>
                                            {loc.is_on_job && (
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: 12,
                                                    background: 'rgba(59, 130, 246, 0.15)',
                                                    color: '#3b82f6',
                                                    fontSize: 10, fontWeight: 700
                                                }}>
                                                    ON JOB
                                                </span>
                                            )}
                                        </div>

                                        {loc.seconds_ago > 1800 && (
                                            <div style={{
                                                color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)',
                                                padding: '4px 8px', borderRadius: 6, fontSize: 11,
                                                fontWeight: 700, border: '1px solid rgba(239,68,68,0.2)',
                                                marginBottom: 6
                                            }}>
                                                ⚠️ ALERT: No ping for &gt; 30m!
                                            </div>
                                        )}

                                        <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                                            <div>📍 Last seen: {formatAge(loc.seconds_ago)}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {loc.tracking_source === 'native_service' ? (
                                                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontWeight: 700 }}>📱 NATIVE</span>
                                                ) : (
                                                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(148,163,184,0.1)', color: '#94a3b8', fontWeight: 700 }}>🌐 WEB</span>
                                                )}
                                                {loc.isRealtime && <span style={{ color: '#10b981', fontWeight: 700, fontSize: 10 }}>● LIVE</span>}
                                            </div>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>
            </div>

            {/* No one has any location */}
            {!loading && mergedLocations.length === 0 && (
                <div style={{ textAlign: 'center', padding: 32, color: '#475569', fontSize: 14 }}>
                    No technician locations have been recorded yet.
                </div>
            )}

            {/* Technician roster */}
            {showRoster && mergedLocations.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
                    {mergedLocations.map(loc => {
                        const isOffline = loc.seconds_ago > 900;
                        const isRedAlert = loc.seconds_ago > 1800;
                        return (
                            <div key={loc.technician_id} style={{
                                padding: '10px 12px', borderRadius: 10,
                                background: isRedAlert ? 'rgba(239, 68, 68, 0.05)' : (isOffline ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)'),
                                border: `1px solid ${isRedAlert ? '#ef4444' : (isOffline ? 'rgba(255,255,255,0.03)' : (loc.is_on_job ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.07)'))}`,
                                display: 'flex', alignItems: 'center', gap: 10,
                                opacity: isOffline ? 0.6 : 1
                            }}>
                                <div style={{
                                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                                    backgroundColor: isRedAlert ? '#ef4444' : (isOffline ? '#64748b' : (loc.is_on_job ? '#10b981' : '#475569')),
                                    boxShadow: isRedAlert ? '0 0 0 3px rgba(239, 68, 68, 0.2)' : ((!isOffline && loc.is_on_job) ? '0 0 0 3px rgba(16,185,129,0.2)' : 'none'),
                                    animation: isRedAlert ? 'pulse 2s infinite' : ((!isOffline && loc.is_on_job) ? 'pulse 2s infinite' : 'none'),
                                }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, color: isRedAlert ? '#fca5a5' : (isOffline ? '#94a3b8' : '#e2e8f0'), display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {loc.name}
                                        {isRedAlert && (
                                            <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 4, backgroundColor: '#ef4444', color: '#ffffff', fontWeight: 700 }}>🚨 LATE</span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#64748b', display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                                        <div>
                                            {loc.is_online ? '🟢 Online' : '⚪ Offline'} · {loc.location_precision === 'precise' ? 'Precise' : 'Approx'}
                                        </div>
                                        <div>
                                            Status: {loc.is_on_job ? 'On job' : 'Idle'} · {formatAge(loc.seconds_ago)}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                                    {loc.tracking_source === 'native_service' || loc.tracking_source === 'native' ? (
                                        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontWeight: 700 }}>📱 NATIVE</span>
                                    ) : (
                                        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(148,163,184,0.1)', color: '#94a3b8', fontWeight: 700 }}>🌐 WEB</span>
                                    )}
                                    {loc.isRealtime && (
                                        <div style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>● LIVE</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
