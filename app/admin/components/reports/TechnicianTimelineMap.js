'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Mathematical Helpers for Heading & Distance
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
}

function getBearing(lat1, lng1, lat2, lng2) {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    const brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
}

// Custom Icons
const arrowIcon = (angle) => new L.DivIcon({
    className: '',
    html: `<div style="transform: rotate(${angle - 90}deg); font-size: 16px; color: #1e40af; text-shadow: 0 0 3px #ffffff; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-weight: bold; cursor: pointer;">➤</div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
});

const startIcon = new L.DivIcon({
    className: '',
    html: `<div style="width:26px;height:26px;border-radius:50%;background:#10b981;border:2px solid #ffffff;color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;box-shadow:0 2px 5px rgba(0,0,0,0.3)">S</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
});

const endIcon = new L.DivIcon({
    className: '',
    html: `<div style="width:26px;height:26px;border-radius:50%;background:#ef4444;border:2px solid #ffffff;color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;box-shadow:0 2px 5px rgba(0,0,0,0.3)">E</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
});

const stopIcon = (index, duration) => new L.DivIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:#64748b;border:2px solid #ffffff;color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;box-shadow:0 2px 5px rgba(0,0,0,0.3)" title="Stopped for ${duration} mins">P${index}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
});

const jobIcon = (jobNumber) => new L.DivIcon({
    className: '',
    html: `<div style="width:30px;height:30px;border-radius:8px;background:#f59e0b;border:2px solid #ffffff;color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:bold;box-shadow:0 2px 5px rgba(0,0,0,0.3)">${jobNumber.split('-')[1] || 'J'}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
});

const playbackIcon = new L.DivIcon({
    className: '',
    html: `<div style="position:relative;width:20px;height:20px;border-radius:50%;background:#3b82f6;border:2px solid #ffffff;box-shadow:0 2px 5px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;top:-4px;left:-4px;width:24px;height:24px;border-radius:50%;background:#3b82f6;opacity:0.4;animation:ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite"></div>
        <div style="width:8px;height:8px;border-radius:50%;background:#ffffff;"></div>
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

const formatDuration = (totalMins) => {
    if (!totalMins) return '0 mins';
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hrs > 0) {
        return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins > 0 ? `${mins} min${mins > 1 ? 's' : ''}` : ''}`.trim();
    }
    return `${mins} min${mins > 1 ? 's' : ''}`;
};

const supplierIcon = (name) => new L.DivIcon({
    className: '',
    html: `<div style="width:30px;height:30px;border-radius:50%;background:#3b82f6;border:2px solid #ffffff;color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 5px rgba(0,0,0,0.3)" title="Supplier: ${name}">🏬</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
});

function getSupplierCoordinates(supplier) {
    if (!supplier) return null;
    const props = supplier.properties;
    if (Array.isArray(props) && props.length > 0) {
        const first = props.find(p => p.lat || p.latitude);
        if (first) {
            return {
                lat: Number(first.lat || first.latitude),
                lng: Number(first.lng || first.longitude)
            };
        }
    }
    return null;
}

const MUMBAI = [19.076, 72.8777];

// Fit bounds to route automatically
function FitBounds({ path }) {
    const map = useMap();
    const hasFitRef = useRef(false);

    useEffect(() => {
        if (!path || path.length === 0) return;
        const bounds = L.latLngBounds(path.map(p => [p.lat, p.lng]));
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
            hasFitRef.current = true;
        }
    }, [path, map]);
    return null;
}

// Controller to programmatically pan map view
function MapPanController({ panTo }) {
    const map = useMap();
    useEffect(() => {
        if (panTo) {
            map.setView([panTo.lat, panTo.lng], 16, { animate: true });
        }
    }, [panTo, map]);
    return null;
}

export default function TechnicianTimelineMap({ routePath = [], stops = [], jobsList = [], suppliersList = [], playbackPosition = null, panTo = null }) {
    const defaultCenter = routePath.length > 0 ? [routePath[0].lat, routePath[0].lng] : MUMBAI;
    const [mapType, setMapType] = useState('google-roadmap');
    const [snappedPath, setSnappedPath] = useState([]);

    const arrows = useMemo(() => {
        if (!routePath || routePath.length < 2) return [];
        const result = [];
        let lastArrowPt = routePath[0];
        
        for (let i = 1; i < routePath.length; i++) {
            const pt1 = routePath[i - 1];
            const pt2 = routePath[i];
            
            const dist = getDistance(lastArrowPt.lat, lastArrowPt.lng, pt2.lat, pt2.lng);
            if (dist >= 300) {
                const angle = getBearing(pt1.lat, pt1.lng, pt2.lat, pt2.lng);
                const formattedTime = new Date(pt2.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                result.push({
                    id: `arrow-${i}`,
                    position: [pt2.lat, pt2.lng],
                    angle: angle,
                    time: formattedTime
                });
                lastArrowPt = pt2;
            }
        }
        return result;
    }, [routePath]);

    useEffect(() => {
        const cachedType = localStorage.getItem('mapViewType');
        if (cachedType) {
            if (cachedType === 'satellite' || cachedType === 'hybrid') {
                setMapType('google-hybrid');
            } else if (cachedType === 'dark' || cachedType === 'voyager') {
                setMapType('voyager');
            } else {
                setMapType('google-roadmap');
            }
        }
    }, []);

    useEffect(() => {
        if (!routePath || routePath.length <= 1) {
            setSnappedPath(routePath.map(p => [p.lat, p.lng]));
            return;
        }

        async function fetchSnappedRoute() {
            try {
                // Downsample if coordinates are too numerous for OSRM URL boundaries
                let sampledPath = routePath;
                if (routePath.length > 90) {
                    const factor = Math.ceil(routePath.length / 90);
                    sampledPath = routePath.filter((_, idx) => idx % factor === 0);
                    if (sampledPath[sampledPath.length - 1] !== routePath[routePath.length - 1]) {
                        sampledPath.push(routePath[routePath.length - 1]);
                    }
                }

                const coordString = sampledPath.map(p => `${p.lng},${p.lat}`).join(';');
                const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;
                const res = await fetch(url);
                const data = await res.json();
                
                if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                    const coords = data.routes[0].geometry.coordinates;
                    const leafletCoords = coords.map(c => [c[1], c[0]]);
                    setSnappedPath(leafletCoords);
                } else {
                    setSnappedPath(routePath.map(p => [p.lat, p.lng]));
                }
            } catch (err) {
                console.error("OSRM Route snapping error:", err);
                setSnappedPath(routePath.map(p => [p.lat, p.lng]));
            }
        }

        fetchSnappedRoute();
    }, [routePath]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {/* Map Style Overlay controls */}
            <div style={{
                position: 'absolute',
                top: 10,
                right: 10,
                zIndex: 1000,
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(4px)',
                padding: '4px 6px',
                borderRadius: '6px',
                display: 'flex',
                gap: '4px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
                <button
                    onClick={() => setMapType('google-roadmap')}
                    style={{
                        padding: '3px 6px',
                        fontSize: '9px',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: mapType === 'google-roadmap' ? 'var(--color-primary, #3b82f6)' : 'transparent',
                        color: '#fff',
                        transition: 'all 0.2s'
                    }}
                >
                    🗺️ Map
                </button>
                <button
                    onClick={() => setMapType('google-hybrid')}
                    style={{
                        padding: '3px 6px',
                        fontSize: '9px',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: mapType === 'google-hybrid' ? 'var(--color-primary, #3b82f6)' : 'transparent',
                        color: '#fff',
                        transition: 'all 0.2s'
                    }}
                >
                    🛰️ Satellite
                </button>
                <button
                    onClick={() => setMapType('voyager')}
                    style={{
                        padding: '3px 6px',
                        fontSize: '9px',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: mapType === 'voyager' ? 'var(--color-primary, #3b82f6)' : 'transparent',
                        color: '#fff',
                        transition: 'all 0.2s'
                    }}
                >
                    🎨 Classic
                </button>
            </div>

            <MapContainer
                center={defaultCenter}
                zoom={12}
                style={{ width: '100%', height: '100%' }}
            >
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

                {/* Draw Route Path */}
                {snappedPath.length > 1 && (
                    <Polyline
                        positions={snappedPath}
                        color="var(--color-primary, #3b82f6)"
                        weight={4}
                        opacity={0.8}
                    />
                )}

                {/* Direction Arrows with Hover Timestamps */}
                {arrows.map(arrow => (
                    <Marker key={arrow.id} position={arrow.position} icon={arrowIcon(arrow.angle)}>
                        <Tooltip direction="top" offset={[0, -5]} opacity={1} permanent={false}>
                            <span>Passed at: {arrow.time}</span>
                        </Tooltip>
                    </Marker>
                ))}

                {/* Start Marker */}
                {routePath.length > 0 && (
                    <Marker position={[routePath[0].lat, routePath[0].lng]} icon={startIcon}>
                        <Popup>
                            <strong>Shift Start Location</strong><br />
                            Time: {new Date(routePath[0].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Popup>
                    </Marker>
                )}

                {/* End Marker */}
                {routePath.length > 1 && (
                    <Marker position={[routePath[routePath.length - 1].lat, routePath[routePath.length - 1].lng]} icon={endIcon}>
                        <Popup>
                            <strong>Shift End Location</strong><br />
                            Time: {new Date(routePath[routePath.length - 1].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Popup>
                    </Marker>
                )}

                {/* Stop/Idle Markers */}
                {stops.map((stop, i) => (
                    <Marker key={`stop-${i}`} position={[stop.lat, stop.lng]} icon={stopIcon(i + 1, stop.durationMinutes)}>
                        <Popup>
                            <strong>Parking Stop #{i + 1}</strong><br />
                            Duration: {formatDuration(stop.durationMinutes)}<br />
                            Arrival: {new Date(stop.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}<br />
                            Departure: {new Date(stop.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Popup>
                    </Marker>
                ))}

                {/* Job Marker Pins */}
                {jobsList.map((job, i) => {
                    const loc = job.propertyLocation;
                    if (!loc) return null;
                    const lat = loc.lat || loc.latitude;
                    const lng = loc.lng || loc.longitude;
                    if (!lat || !lng) return null;

                    return (
                        <Marker key={`job-${job.id}-${i}`} position={[lat, lng]} icon={jobIcon(job.jobNumber)}>
                            <Popup>
                                <strong>{job.jobNumber} ({job.category}) - <span style={{ textTransform: 'capitalize' }}>{job.status?.replace(/_/g, ' ')}</span></strong><br />
                                Customer: {job.customerName}<br />
                                Address: {job.address}
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Supplier Marker Pins */}
                {suppliersList.map((supplier, i) => {
                    const coords = getSupplierCoordinates(supplier);
                    if (!coords) return null;

                    return (
                        <Marker key={`supplier-${supplier.id}-${i}`} position={[coords.lat, coords.lng]} icon={supplierIcon(supplier.name)}>
                            <Popup>
                                <strong>🏬 Supplier: {supplier.name}</strong><br />
                                Type: {supplier.groupName || 'Spare Parts Supplier'}<br />
                                Address: {supplier.properties?.[0]?.address || 'No address details'}
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Playback Pulsing Dot */}
                {playbackPosition && (
                    <Marker position={[playbackPosition.lat, playbackPosition.lng]} icon={playbackIcon} />
                )}

                <FitBounds path={routePath} />
                <MapPanController panTo={panTo} />
            </MapContainer>
        </div>
    );
}
