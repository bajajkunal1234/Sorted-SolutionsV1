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

function FitBounds({ positions, trigger }) {
    const map = useMap();
    const hasFitRef = useRef(false);
    const prevTriggerRef = useRef(trigger);

    useEffect(() => {
        if (positions.length === 0) return;
        
        // Fit bounds if it is the first time, OR if the trigger was incremented
        const shouldFit = !hasFitRef.current || trigger !== prevTriggerRef.current;
        
        if (shouldFit) {
            const bounds = L.latLngBounds(positions.map(p => [p.latitude, p.longitude]));
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
                hasFitRef.current = true;
                prevTriggerRef.current = trigger;
            }
        }
    }, [positions, map, trigger]);
    return null;
}

function MapController({ panTo }) {
    const map = useMap();
    useEffect(() => {
        if (panTo) {
            map.setView(panTo, 16, { animate: true });
        }
    }, [panTo, map]);
    return null;
}

const groupInteractionsBySession = (interactions) => {
    if (!interactions || interactions.length === 0) return [];

    // 1. Sort chronologically (oldest first) to construct sessions sequentially
    const sorted = [...interactions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const sessionsList = [];
    let currentSession = null;

    sorted.forEach(item => {
        const isLoginEvent = item.type === 'technician-login' || item.type === 'technician-login-otp';
        const itemSessionToken = item.metadata?.session_token;

        // Determine if we should start a new session:
        // - No session bucket has been created yet
        // - Encountered an explicit login event
        // - The item has a session token that is different from our current session token
        const shouldStartNew = !currentSession || isLoginEvent || (itemSessionToken && currentSession.token && itemSessionToken !== currentSession.token);

        if (shouldStartNew) {
            const sessionIp = item.metadata?.ip || item.metadata?.ip_address || (isLoginEvent ? item.metadata?.ip : null);
            currentSession = {
                token: itemSessionToken || `session_${item.timestamp}_${Math.random().toString(36).substring(2, 7)}`,
                startTime: item.timestamp,
                endTime: item.timestamp,
                ip: sessionIp,
                activities: []
            };
            sessionsList.push(currentSession);
        }

        currentSession.activities.push(item);
        
        // Update session boundaries
        if (new Date(item.timestamp) < new Date(currentSession.startTime)) {
            currentSession.startTime = item.timestamp;
        }
        if (new Date(item.timestamp) > new Date(currentSession.endTime)) {
            currentSession.endTime = item.timestamp;
        }
        if (!currentSession.ip && item.metadata?.ip) {
            currentSession.ip = item.metadata.ip;
        }
    });

    // 2. Within each session, sort activities descending (newest activity first)
    // 3. Sort session list descending (newest session first)
    return sessionsList.map(sess => {
        sess.activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return sess;
    }).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
};

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
export default function TechnicianLiveMap({ activeTechnicians = [], activeJobs, height = 480, showRoster = true, isDashboard = false }) {
    const [allLocations, setAllLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(null);
    const [localActiveJobs, setLocalActiveJobs] = useState([]);

    const [selectedTechForTimeline, setSelectedTechForTimeline] = useState(null);
    const [timelineData, setTimelineData] = useState([]);
    const [timelineLoading, setTimelineLoading] = useState(false);
    const [mapPanTarget, setMapPanTarget] = useState(null);

    const [addressCache, setAddressCache] = useState({});
    const [mapType, setMapType] = useState('google-roadmap'); // 'google-roadmap', 'google-hybrid', 'voyager'
    const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);

    // Helper to get or trigger reverse geocoding
    const fetchAddressForCoords = async (lat, lng) => {
        if (lat === null || lat === undefined || lng === null || lng === undefined) return;
        const cacheKey = `${parseFloat(lat).toFixed(5)},${parseFloat(lng).toFixed(5)}`;
        if (addressCache[cacheKey]) return;

        // Set state to resolving to avoid duplicate concurrent calls
        setAddressCache(prev => ({ ...prev, [cacheKey]: 'Resolving address...' }));

        try {
            const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
            const data = await res.json();
            if (data.success && data.formatted) {
                setAddressCache(prev => ({ ...prev, [cacheKey]: data.formatted }));
            } else {
                setAddressCache(prev => ({ ...prev, [cacheKey]: 'Address unavailable' }));
            }
        } catch (e) {
            console.error('Failed to reverse geocode:', e);
            setAddressCache(prev => ({ ...prev, [cacheKey]: 'Error resolving address' }));
        }
    };

    const handleRemoteLogout = async (technicianId, technicianName) => {
        if (!window.confirm(`Are you sure you want to remotely log off ${technicianName}?`)) return;
        try {
            const res = await fetch('/api/admin/technicians', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: technicianId, action: 'remote-logout' })
            });
            const data = await res.json();
            if (data.success) {
                alert(`✅ Remotely logged out ${technicianName}!`);
                fetchLocations();
                if (selectedTechForTimeline && selectedTechForTimeline.id === technicianId) {
                    setSelectedTechForTimeline(null);
                }
            } else {
                alert('Error: ' + data.error);
            }
        } catch (e) {
            console.error('Remote logout failed:', e);
            alert('Failed to remote logoff technician: ' + e.message);
        }
    };

    // Fetch timeline interactions for the selected technician
    useEffect(() => {
        if (!selectedTechForTimeline) {
            setTimelineData([]);
            return;
        }
        const loadTimeline = async () => {
            setTimelineLoading(true);
            try {
                const res = await fetch(`/api/admin/technician-timeline?technicianId=${selectedTechForTimeline.id}`);
                const data = await res.json();
                if (data.success) {
                    setTimelineData(data.data || []);
                }
            } catch (e) {
                console.error('Failed to load timeline:', e);
            } finally {
                setTimelineLoading(false);
            }
        };
        loadTimeline();
    }, [selectedTechForTimeline]);

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

    // Auto-resolve addresses for merged live locations
    useEffect(() => {
        mergedLocations.forEach(loc => {
            if (loc.latitude && loc.longitude) {
                const cacheKey = `${parseFloat(loc.latitude).toFixed(5)},${parseFloat(loc.longitude).toFixed(5)}`;
                if (!addressCache[cacheKey]) {
                    fetchAddressForCoords(loc.latitude, loc.longitude);
                }
            }
        });
    }, [allLocations, livePositions]);

    // Auto-resolve addresses for timeline data activities
    useEffect(() => {
        timelineData.forEach(act => {
            if (act.metadata?.latitude && act.metadata?.longitude) {
                const lat = act.metadata.latitude;
                const lng = act.metadata.longitude;
                const cacheKey = `${parseFloat(lat).toFixed(5)},${parseFloat(lng).toFixed(5)}`;
                if (!addressCache[cacheKey]) {
                    fetchAddressForCoords(lat, lng);
                }
            }
        });
    }, [timelineData]);

    const activeTechsList = mergedLocations.filter(l => l.is_online && l.seconds_ago <= 900);
    const offlineTechsList = mergedLocations.filter(l => !l.is_online || l.seconds_ago > 900);
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
            {!isDashboard && redAlertCount > 0 && (
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
            <div style={{ position: 'relative', height: height, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
                {/* Map Type Switcher Floating Overlay */}
                <div style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(8px)',
                    padding: 4,
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}>
                    <button
                        onClick={() => setFitBoundsTrigger(prev => prev + 1)}
                        style={{
                            padding: '4px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 6,
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            color: '#fff',
                            transition: 'all 0.2s',
                        }}
                        title="Center map on all technicians"
                    >
                        🎯 Center Map
                    </button>
                    <div style={{ width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center' }} />
                    <button
                        onClick={() => setMapType('google-roadmap')}
                        style={{
                            padding: '4px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 6,
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: mapType === 'google-roadmap' ? '#6366f1' : 'transparent',
                            color: '#fff',
                            transition: 'all 0.2s'
                        }}
                    >
                        🗺️ Google Map
                    </button>
                    <button
                        onClick={() => setMapType('google-hybrid')}
                        style={{
                            padding: '4px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 6,
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: mapType === 'google-hybrid' ? '#6366f1' : 'transparent',
                            color: '#fff',
                            transition: 'all 0.2s'
                        }}
                    >
                        🛰️ Satellite
                    </button>
                    <button
                        onClick={() => setMapType('voyager')}
                        style={{
                            padding: '4px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 6,
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: mapType === 'voyager' ? '#6366f1' : 'transparent',
                            color: '#fff',
                            transition: 'all 0.2s'
                        }}
                    >
                        🎨 Classic
                    </button>
                </div>

                <MapContainer center={MUMBAI} zoom={12} style={{ height: '100%', width: '100%' }}>
                    {mapType === 'google-roadmap' && (
                        <TileLayer
                            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                            attribution='&copy; <a href="https://google.com/maps">Google Maps</a>'
                        />
                    )}
                    {mapType === 'google-hybrid' && (
                        <TileLayer
                            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                            attribution='&copy; <a href="https://google.com/maps">Google Maps</a>'
                        />
                    )}
                    {mapType === 'voyager' && (
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://carto.com/">Carto</a>'
                        />
                    )}
                    {mergedLocations.length > 0 && <FitBounds positions={mergedLocations} trigger={fitBoundsTrigger} />}
                    <MapController panTo={mapPanTarget} />

                    {mergedLocations.map(loc => {
                        const isOffline = !loc.is_online || loc.seconds_ago > 900;
                        const isTrulyOnline = loc.is_online && loc.seconds_ago <= 900;
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
                                                background: isTrulyOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                                                color: isTrulyOnline ? '#10b981' : '#94a3b8',
                                                fontSize: 10, fontWeight: 700
                                            }}>
                                                {isTrulyOnline ? 'ONLINE' : 'OFFLINE'}
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

                                        {loc.is_mocked && (
                                            <div style={{
                                                color: '#ffffff', backgroundColor: '#ef4444',
                                                padding: '4px 8px', borderRadius: 6, fontSize: 10,
                                                fontWeight: 800, textTransform: 'uppercase',
                                                marginBottom: 6, textAlign: 'center',
                                                animation: 'pulse 1.5s infinite'
                                            }}>
                                                🚨 FAKE GPS DETECTED!
                                            </div>
                                        )}

                                        {!isDashboard && loc.seconds_ago > 1800 && (
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
                                            {loc.battery_level !== null && loc.battery_level !== undefined && loc.battery_level >= 0 && (
                                                <div>🔋 Battery: <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{loc.battery_level}%</span></div>
                                            )}
                                            {loc.connectivity_status && (
                                                <div>📶 Connection: <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{loc.connectivity_status}</span></div>
                                            )}
                                            {loc.ip_address && (
                                                <div style={{ fontSize: 10, color: '#64748b' }}>🌐 IP: {loc.ip_address}</div>
                                            )}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                                {loc.tracking_source === 'native_service' || loc.tracking_source === 'native' ? (
                                                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontWeight: 700 }}>📱 NATIVE</span>
                                                ) : (
                                                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(148,163,184,0.1)', color: '#94a3b8', fontWeight: 700 }}>🌐 WEB</span>
                                                )}
                                                {loc.isRealtime && <span style={{ color: '#10b981', fontWeight: 700, fontSize: 10 }}>● LIVE</span>}
                                            </div>
                                            {(() => {
                                                const cacheKey = `${parseFloat(loc.latitude).toFixed(5)},${parseFloat(loc.longitude).toFixed(5)}`;
                                                const addr = addressCache[cacheKey];
                                                if (addr) {
                                                    return (
                                                        <div style={{ 
                                                            fontSize: 10, 
                                                            color: '#e2e8f0', 
                                                            marginTop: 6, 
                                                            padding: '6px 8px', 
                                                            backgroundColor: 'rgba(255,255,255,0.05)', 
                                                            borderRadius: 6,
                                                            border: '1px solid rgba(255,255,255,0.05)',
                                                            lineHeight: '1.4',
                                                            wordBreak: 'break-word'
                                                        }}>
                                                            🏠 {addr}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>

                                        <button
                                            onClick={() => setSelectedTechForTimeline({ id: loc.technician_id, name: loc.name })}
                                            style={{
                                                width: '100%',
                                                padding: '6px 8px',
                                                backgroundColor: '#6366f1',
                                                border: 'none',
                                                borderRadius: 6,
                                                color: '#fff',
                                                fontWeight: 700,
                                                fontSize: 10,
                                                cursor: 'pointer',
                                                marginTop: 8,
                                                textAlign: 'center'
                                            }}
                                        >
                                            📅 View Session Timeline
                                        </button>
                                        <button
                                            onClick={() => handleRemoteLogout(loc.technician_id, loc.name)}
                                            style={{
                                                width: '100%',
                                                padding: '6px 8px',
                                                backgroundColor: '#dc2626',
                                                border: 'none',
                                                borderRadius: 6,
                                                color: '#fff',
                                                fontWeight: 700,
                                                fontSize: 10,
                                                cursor: 'pointer',
                                                marginTop: 6,
                                                textAlign: 'center'
                                            }}
                                        >
                                            📴 Remotely Log Out
                                        </button>
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
                        const isOffline = !loc.is_online || loc.seconds_ago > 900;
                        const isTrulyOnline = loc.is_online && loc.seconds_ago <= 900;
                        const isRedAlert = !isDashboard && loc.seconds_ago > 1800;
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
                                        {loc.is_mocked && (
                                            <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 4, backgroundColor: '#ef4444', color: '#ffffff', fontWeight: 700, animation: 'pulse 1.5s infinite' }}>🚨 MOCK GPS</span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#ffffff', display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4, fontWeight: '500' }}>
                                        <div>
                                            {isTrulyOnline ? '🟢 Online' : '⚪ Offline'} · {loc.location_precision === 'precise' ? 'Precise' : 'Approx'}
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', color: '#e2e8f0' }}>
                                            {loc.battery_level !== null && loc.battery_level !== undefined && loc.battery_level >= 0 && (
                                                <span>🔋 {loc.battery_level}%</span>
                                            )}
                                            {loc.connectivity_status && (
                                                <span>📶 {loc.connectivity_status}</span>
                                            )}
                                            {loc.ip_address && (
                                                <span style={{ opacity: 0.9 }}>🌐 {loc.ip_address}</span>
                                            )}
                                        </div>
                                        <div style={{ color: '#ffffff' }}>
                                            Status: {loc.is_on_job ? 'On job' : 'Idle'} · {formatAge(loc.seconds_ago)}
                                        </div>
                                        {(() => {
                                            const cacheKey = `${parseFloat(loc.latitude).toFixed(5)},${parseFloat(loc.longitude).toFixed(5)}`;
                                            const addr = addressCache[cacheKey];
                                            if (addr) {
                                                return (
                                                    <div style={{ color: '#e2e8f0', fontSize: 11, marginTop: 4, display: 'flex', gap: 4, fontStyle: 'italic', wordBreak: 'break-word', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 4 }}>
                                                        <span>🏠</span>
                                                        <span>{addr}</span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
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
                                    <button
                                        onClick={() => setSelectedTechForTimeline({ id: loc.technician_id, name: loc.name })}
                                        style={{
                                            padding: '2px 6px',
                                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                            border: '1px solid rgba(99, 102, 241, 0.25)',
                                            borderRadius: 6,
                                            color: '#818cf8',
                                            fontSize: 9,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            marginTop: 2
                                        }}
                                    >
                                        📅 TIMELINE
                                    </button>
                                    <button
                                        onClick={() => handleRemoteLogout(loc.technician_id, loc.name)}
                                        style={{
                                            padding: '2px 6px',
                                            backgroundColor: 'rgba(220, 38, 38, 0.1)',
                                            border: '1px solid rgba(220, 38, 38, 0.25)',
                                            borderRadius: 6,
                                            color: '#ef4444',
                                            fontSize: 9,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            marginTop: 4
                                        }}
                                    >
                                        📴 LOG OUT
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Custom Animations and Global Style */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            ` }} />

            {/* Timeline Overlay/Panel */}
            {selectedTechForTimeline && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    width: '450px',
                    maxWidth: '100%',
                    height: '100vh',
                    backgroundColor: '#0f172a',
                    borderLeft: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    <style dangerouslySetInnerHTML={{ __html: `
                        @keyframes slideIn {
                            from { transform: translateX(100%); }
                            to { transform: translateX(0); }
                        }
                        .timeline-scroll::-webkit-scrollbar {
                            width: 6px;
                        }
                        .timeline-scroll::-webkit-scrollbar-track {
                            background: transparent;
                        }
                        .timeline-scroll::-webkit-scrollbar-thumb {
                            background: rgba(255,255,255,0.1);
                            border-radius: 3px;
                        }
                        .timeline-scroll::-webkit-scrollbar-thumb:hover {
                            background: rgba(255,255,255,0.2);
                        }
                    ` }} />

                    {/* Header */}
                    {(() => {
                        return (
                            <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                                        Activity Timeline
                                    </h3>
                                    <span style={{ fontSize: 13, color: '#94a3b8' }}>{selectedTechForTimeline.name}</span>
                                    <button
                                        onClick={() => handleRemoteLogout(selectedTechForTimeline.id, selectedTechForTimeline.name)}
                                        style={{
                                            display: 'block',
                                            marginTop: 8,
                                            padding: '4px 10px',
                                            backgroundColor: '#dc2626',
                                            border: 'none',
                                            borderRadius: 6,
                                            color: '#fff',
                                            fontWeight: 700,
                                            fontSize: 11,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        📴 Remotely Log Out
                                    </button>
                                </div>
                                <button
                                    onClick={() => setSelectedTechForTimeline(null)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#94a3b8',
                                        cursor: 'pointer',
                                        fontSize: 20,
                                        padding: 4,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        );
                    })()}

                    {/* Content */}
                    <div className="timeline-scroll" style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                        {timelineLoading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
                                <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                <span style={{ fontSize: 13, color: '#64748b' }}>Loading activities...</span>
                            </div>
                        ) : timelineData.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40, color: '#64748b', fontSize: 13 }}>
                                No activity logs recorded for this technician.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                {groupInteractionsBySession(timelineData).map((session, sIdx) => (
                                    <div key={session.token} style={{
                                        backgroundColor: 'rgba(255,255,255,0.02)',
                                        borderRadius: 12,
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        padding: 16
                                    }}>
                                        {/* Session Header */}
                                        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 10, marginBottom: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, backgroundColor: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>
                                                    SESSION
                                                </span>
                                                <span style={{ fontSize: 11, color: '#64748b' }}>
                                                    {new Date(session.startTime).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>
                                                ⏰ Started: {new Date(session.startTime).toLocaleTimeString()}
                                            </div>
                                            {session.ip && (
                                                <div style={{ marginTop: 2, fontSize: 11, color: '#64748b' }}>
                                                    🌐 IP Address: <span style={{ color: '#cbd5e1' }}>{session.ip}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Session Activities List */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderLeft: '2px solid rgba(255,255,255,0.05)', marginLeft: 8, paddingLeft: 16 }}>
                                            {session.activities.map((act, aIdx) => (
                                                <div key={act.id || aIdx} style={{ position: 'relative' }}>
                                                    {/* Dot indicator */}
                                                    <div style={{
                                                        position: 'absolute',
                                                        left: -22,
                                                        top: 4,
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: '50%',
                                                        backgroundColor: act.type.includes('login') ? '#10b981' : (act.type.includes('job') ? '#38bdf8' : '#64748b'),
                                                        border: '2px solid #0f172a'
                                                    }} />
                                                    
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                        <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                                                            {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
                                                            {act.category || 'general'}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: 13, color: '#e2e8f0', marginTop: 2 }}>
                                                        {act.description}
                                                    </div>
                                                    
                                                    {/* Map Location Actions */}
                                                    {act.metadata?.latitude && act.metadata?.longitude && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                                                            <button
                                                                onClick={() => setMapPanTarget([act.metadata.latitude, act.metadata.longitude])}
                                                                style={{
                                                                    background: 'rgba(56,189,248,0.1)',
                                                                    border: '1px solid rgba(56,189,248,0.25)',
                                                                    borderRadius: 6,
                                                                    color: '#38bdf8',
                                                                    padding: '2px 8px',
                                                                    fontSize: 11,
                                                                    cursor: 'pointer',
                                                                    fontWeight: 600,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 4
                                                                }}
                                                            >
                                                                📍 Show on Map
                                                            </button>
                                                            {act.metadata.locality && (
                                                                <span style={{ fontSize: 11, color: '#64748b' }}>
                                                                    near {act.metadata.locality}
                                                                </span>
                                                            )}
                                                            {(() => {
                                                                const lat = act.metadata.latitude;
                                                                const lng = act.metadata.longitude;
                                                                const cacheKey = `${parseFloat(lat).toFixed(5)},${parseFloat(lng).toFixed(5)}`;
                                                                const addr = addressCache[cacheKey];
                                                                if (addr) {
                                                                    return (
                                                                        <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', display: 'block', width: '100%', marginTop: 2 }}>
                                                                            🏠 {addr}
                                                                        </span>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
