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
    className: 'custom-arrow-icon',
    html: `<div style="transform: rotate(${angle}deg); font-size: 8px; color: #ffffff; width: 10px; height: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; cursor: pointer; text-shadow: 0px 0px 2px rgba(0,0,0,0.85); background: transparent; border: none;">▲</div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5]
});

function getClosestSnappedPoint(pt, snappedPath) {
    if (!snappedPath || snappedPath.length === 0) return [pt.lat, pt.lng];
    let closest = snappedPath[0];
    let minDist = getDistance(pt.lat, pt.lng, closest[0], closest[1]);
    
    for (const sPt of snappedPath) {
        const dist = getDistance(pt.lat, pt.lng, sPt[0], sPt[1]);
        if (dist < minDist) {
            minDist = dist;
            closest = sPt;
        }
    }
    return closest; // [lat, lng]
}

const createPinIcon = (color, strokeColor = '#ffffff') => new L.DivIcon({
    className: '',
    html: `<div style="position: relative; width: 20px; height: 28px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.45));">
        <svg width="20" height="28" viewBox="0 0 20 28" fill="none" style="display: block; width: 100%; height: 100%;">
            <path d="M10 1C5.03 1 1 5.03 1 10c0 6.75 9 17 9 17s9-10.25 9-17c0-4.97-4.03-9-9-9z" fill="${color}" stroke="${strokeColor}" stroke-width="1.8" stroke-linejoin="round"/>
        </svg>
    </div>`,
    iconSize: [20, 28],
    iconAnchor: [10, 28],
    popupAnchor: [0, -28]
});

const startIcon = createPinIcon('#ffffff', '#0f172a');
const endIcon = createPinIcon('#0f172a', '#ffffff');
const stopIcon = (index) => createPinIcon('#64748b', '#ffffff');

const getJobIcon = (jobNumber, status) => {
    const isClosedOrCancelled = status === 'closed' || status === 'cancelled';
    if (isClosedOrCancelled) {
        return createPinIcon('#10b981', '#ffffff');
    } else {
        return createPinIcon('#eab308', '#ffffff');
    }
};

const getSupplierIcon = (name) => createPinIcon('#f97316', '#ffffff');

const serviceCenterIcon = new L.DivIcon({
    className: '',
    html: `<div style="position: relative; width: 26px; height: 34px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.45));">
        <svg width="26" height="34" viewBox="0 0 24 32" fill="none" style="display: block; width: 100%; height: 100%; position: absolute; top: 0; left: 0;">
            <path d="M12 1.5C6.75 1.5 2.5 5.75 2.5 11c0 7.5 9.5 19 9.5 19s9.5-11.5 9.5-19c0-5.25-4.25-9.5-9.5-9.5z" fill="#4f46e5" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
        </svg>
        <div style="position: absolute; top: 3.5px; left: 3.5px; width: 19px; height: 19px; border-radius: 50%; overflow: hidden; background: #ffffff;">
            <img src="/logo-dark.jpg" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>
    </div>`,
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -34]
});const getMovingIcon = (angle, isHalted) => new L.DivIcon({
    className: '',
    html: `<div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; z-index: 9999 !important;">
        <!-- Pulsing beacon background under the arrow if halted -->
        ${isHalted ? `<div style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background: rgba(250, 204, 21, 0.45); animation: beacon-pulse 1.2s infinite;"></div>` : ''}
        <!-- Rotating Yellow Navigation Arrow -->
        <div style="transform: rotate(${angle}deg); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.6)); transition: transform 0.2s ease; ${isHalted ? 'animation: halt-blink 1s ease-in-out infinite;' : ''}">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="display: block; width: 100%; height: 100%;">
                <path d="M12 2L2 22l10-6 10 6L12 2z" fill="#facc15" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
            </svg>
        </div>
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
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
            if (dist >= 60) {
                const angle = getBearing(pt1.lat, pt1.lng, pt2.lat, pt2.lng);
                const formattedTime = new Date(pt2.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                const snappedPosition = snappedPath.length > 0 ? getClosestSnappedPoint(pt2, snappedPath) : [pt2.lat, pt2.lng];
                
                result.push({
                    id: `arrow-${i}`,
                    position: snappedPosition,
                    angle: angle,
                    time: formattedTime
                });
                lastArrowPt = pt2;
            }
        }
        return result;
    }, [routePath, snappedPath]);

    const currentStop = useMemo(() => {
        if (!playbackPosition || !stops || stops.length === 0) return null;
        const playTime = new Date(playbackPosition.time).getTime();
        return stops.find(s => {
            const arr = new Date(s.arrivalTime).getTime();
            const dep = new Date(s.departureTime).getTime();
            return playTime >= arr && playTime <= dep;
        });
    }, [playbackPosition, stops]);

    const playbackHeading = useMemo(() => {
        if (!playbackPosition || !routePath || routePath.length < 2) return 0;
        const idx = routePath.findIndex(p => p.time === playbackPosition.time);
        if (idx >= 0 && idx < routePath.length - 1) {
            return getBearing(routePath[idx].lat, routePath[idx].lng, routePath[idx+1].lat, routePath[idx+1].lng);
        } else if (idx > 0) {
            return getBearing(routePath[idx-1].lat, routePath[idx-1].lng, routePath[idx].lat, routePath[idx].lng);
        }
        return 0;
    }, [playbackPosition, routePath]);

    const isHalted = !!currentStop;

    const movingIcon = useMemo(() => {
        return getMovingIcon(playbackHeading, isHalted);
    }, [playbackHeading, isHalted]);

    useEffect(() => {
        const cachedType = localStorage.getItem('mapViewType');
        if (cachedType) {
            if (cachedType === 'satellite' || cachedType === 'hybrid') {
                setMapType('google-hybrid');
            } else if (cachedType === 'dark') {
                setMapType('google-dark');
            } else if (cachedType === 'voyager') {
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
            <style>{`
                .custom-arrow-icon {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                }
                .dark-map-tiles {
                    filter: grayscale(100%) invert(90%) brightness(95%) contrast(100%) !important;
                }
                @keyframes beacon-pulse {
                    0% { transform: scale(0.8); opacity: 0.8; }
                    50% { transform: scale(1.4); opacity: 0.3; }
                    100% { transform: scale(2.0); opacity: 0; }
                }
                @keyframes halt-blink {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(0.93); }
                }
            `}</style>
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
                    onClick={() => {
                        setMapType('google-roadmap');
                        localStorage.setItem('mapViewType', 'roadmap');
                    }}
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
                    onClick={() => {
                        setMapType('google-hybrid');
                        localStorage.setItem('mapViewType', 'satellite');
                    }}
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
                    onClick={() => {
                        setMapType('google-dark');
                        localStorage.setItem('mapViewType', 'dark');
                    }}
                    style={{
                        padding: '3px 6px',
                        fontSize: '9px',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: mapType === 'google-dark' ? 'var(--color-primary, #3b82f6)' : 'transparent',
                        color: '#fff',
                        transition: 'all 0.2s'
                    }}
                >
                    🌑 Dark
                </button>
                <button
                    onClick={() => {
                        setMapType('voyager');
                        localStorage.setItem('mapViewType', 'voyager');
                    }}
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
                {mapType === 'google-dark' && (
                    <TileLayer
                        className="dark-map-tiles"
                        url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
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
                        weight={6}
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
                        <Marker key={`job-${job.id}-${i}`} position={[lat, lng]} icon={getJobIcon(job.jobNumber, job.status)}>
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
                        <Marker key={`supplier-${supplier.id}-${i}`} position={[coords.lat, coords.lng]} icon={getSupplierIcon(supplier.name)}>
                            <Popup>
                                <strong>🏬 Supplier: {supplier.name}</strong><br />
                                Type: {supplier.groupName || 'Spare Parts Supplier'}<br />
                                Address: {supplier.properties?.[0]?.address || 'No address details'}
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Service Center Marker */}
                <Marker position={[19.1530932, 72.8847337]} icon={serviceCenterIcon}>
                    <Popup>
                        <strong>🏢 Sorted Solutions Service Center</strong><br />
                        Orchard Mall, Royal Palms, Goregaon East, Mumbai
                    </Popup>
                </Marker>

                {/* Playback Pulsing Dot */}
                {playbackPosition && (
                    <Marker position={[playbackPosition.lat, playbackPosition.lng]} icon={movingIcon} zIndexOffset={1000} />
                )}

                <FitBounds path={routePath} />
                <MapPanController panTo={panTo} />
            </MapContainer>
        </div>
    );
}
