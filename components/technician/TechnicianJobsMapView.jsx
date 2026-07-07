'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, Navigation, Map as MapIcon, Compass } from 'lucide-react';
import { apiCall } from '@/lib/offlineSync';

// Merge default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Map center and bounds auto-controller
function MapCenterController({ myLocation, jobsGroup }) {
    const map = useMap();
    const centeredRef = useRef(false);

    useEffect(() => {
        if (centeredRef.current) return;

        if (myLocation) {
            map.setView([myLocation.lat, myLocation.lng], 13);
            centeredRef.current = true;
        } else if (jobsGroup && jobsGroup.length > 0) {
            const bounds = L.latLngBounds(jobsGroup.map(g => [g.lat, g.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
            centeredRef.current = true;
        }
    }, [myLocation, jobsGroup, map]);

    return null;
}

// Watch navigation bounds controller
function MapInteractionController({ activeRoute }) {
    const map = useMap();
    useEffect(() => {
        if (activeRoute && activeRoute.length > 1) {
            map.fitBounds(L.latLngBounds(activeRoute), { padding: [40, 40] });
        }
    }, [activeRoute, map]);
    return null;
}

export default function TechnicianJobsMapView({ jobs = [], onJobClick }) {
    // Configurations state
    const [custMarkerType, setCustMarkerType] = useState('circle');
    const [supplierMarkerType, setSupplierMarkerType] = useState('pin');
    const [mapViewType, setMapViewType] = useState('roadmap');
    const [autoExpandSingleJob, setAutoExpandSingleJob] = useState(true);
    const [enableRoutePathHighlight, setEnableRoutePathHighlight] = useState(true);
    const [showCustomersLayer, setShowCustomersLayer] = useState(true);
    const [showSuppliersLayer, setShowSuppliersLayer] = useState(true);
    const [showSelfLayer, setShowSelfLayer] = useState(true);

    // Geolocation and supplier overlays state
    const [myLocation, setMyLocation] = useState(null);
    const [suppliers, setSuppliers] = useState([]);
    const [loadingConfigs, setLoadingConfigs] = useState(true);

    // Routing path state
    const [activeRoute, setActiveRoute] = useState(null);
    const [routeInfo, setRouteInfo] = useState(null);
    const [loadingRoute, setLoadingRoute] = useState(false);

    // Load configs from Supabase (with local cache fallback)
    useEffect(() => {
        const loadConfigs = async () => {
            try {
                const res = await fetch('/api/admin/website-settings?key=tech_map_settings&t=' + Date.now());
                const result = await res.json();
                if (result.success && result.data && result.data.value) {
                    const val = result.data.value;
                    if (val.custMarkerType) setCustMarkerType(val.custMarkerType);
                    if (val.supplierMarkerType) setSupplierMarkerType(val.supplierMarkerType);
                    if (val.mapViewType) setMapViewType(val.mapViewType);
                    if (val.autoExpandSingleJob !== undefined) setAutoExpandSingleJob(val.autoExpandSingleJob !== false);
                    if (val.enableRoutePathHighlight !== undefined) setEnableRoutePathHighlight(val.enableRoutePathHighlight !== false);
                    if (val.showCustomersLayer !== undefined) setShowCustomersLayer(val.showCustomersLayer !== false);
                    if (val.showSuppliersLayer !== undefined) setShowSuppliersLayer(val.showSuppliersLayer !== false);
                    if (val.showSelfLayer !== undefined) setShowSelfLayer(val.showSelfLayer !== false);
                }
            } catch (err) {
                console.error('Failed to load technician map settings:', err);
            } finally {
                setLoadingConfigs(false);
            }
        };
        loadConfigs();
    }, []);

    // Watch real-time location via standard browser GPS API
    useEffect(() => {
        if (typeof window !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                (err) => console.error('Initial geolocator error:', err),
                { enableHighAccuracy: true, timeout: 8000 }
            );

            const watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                (err) => console.error('Watch position error:', err),
                { enableHighAccuracy: true }
            );

            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, []);

    // Load active spare part suppliers
    useEffect(() => {
        apiCall('/api/admin/accounts?type=supplier')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setSuppliers(data.data || []);
                }
            })
            .catch(err => console.error('Failed to fetch suppliers:', err));
    }, []);

    // Helper: Parse job coordinates
    const getJobCoordinates = (job) => {
        if (!job) return null;
        if (job.location && (job.location.lat || job.location.latitude)) {
            return {
                lat: Number(job.location.lat || job.location.latitude),
                lng: Number(job.location.lng || job.location.longitude)
            };
        }
        if (job.lat && job.lng) return { lat: Number(job.lat), lng: Number(job.lng) };
        if (job.latitude && job.longitude) return { lat: Number(job.latitude), lng: Number(job.longitude) };
        const prop = job.property;
        if (prop) {
            if (prop.lat && prop.lng) return { lat: Number(prop.lat), lng: Number(prop.lng) };
            if (prop.latitude && prop.longitude) return { lat: Number(prop.latitude), lng: Number(prop.longitude) };
        }
        return null;
    };

    // Helper: Parse supplier coordinates
    const getSupplierCoordinates = (s) => {
        if (!s) return null;
        const props = s.properties;
        if (Array.isArray(props) && props.length > 0) {
            const first = props.find(p => p.lat || p.latitude);
            if (first) {
                return {
                    lat: Number(first.lat || first.latitude),
                    lng: Number(first.lng || first.longitude)
                };
            }
        }
        if (s.coordinates) {
            if (s.coordinates.lat && s.coordinates.lng) return { lat: Number(s.coordinates.lat), lng: Number(s.coordinates.lng) };
            if (s.coordinates.latitude && s.coordinates.longitude) return { lat: Number(s.coordinates.latitude), lng: Number(s.coordinates.longitude) };
        }
        if (s.lat && s.lng) return { lat: Number(s.lat), lng: Number(s.lng) };
        if (s.latitude && s.longitude) return { lat: Number(s.latitude), lng: Number(s.longitude) };
        return null;
    };

    // Group jobs by property coordinates
    const groupedJobs = {};
    if (showCustomersLayer) {
        jobs.forEach(job => {
            const coords = getJobCoordinates(job);
            if (!coords) return;
            const key = `${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;
            if (!groupedJobs[key]) {
                groupedJobs[key] = {
                    lat: coords.lat,
                    lng: coords.lng,
                    jobs: []
                };
            }
            groupedJobs[key].jobs.push(job);
        });
    }
    const propertiesGroup = Object.values(groupedJobs);

    // Filter suppliers
    const geocodedSuppliers = showSuppliersLayer ? suppliers.map(s => ({
        ...s,
        coords: getSupplierCoordinates(s)
    })).filter(s => s.coords !== null) : [];

    // Helper: Customer marker icons creator
    const getCustomerIcon = (group) => {
        const primaryJob = group.jobs[0];
        const name = primaryJob.customerName || 'Customer';
        const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

        if (custMarkerType === 'pin') {
            const htmlContent = `<div style="position: relative; width: 34px; height: 42px;">
                <svg width="34" height="42" viewBox="0 0 34 42" fill="none" style="position: absolute; top:0; left:0; width:100%; height:100%;">
                  <path d="M17 0C7.6 0 0 7.6 0 17C0 29.7 17 42 17 42C17 42 34 29.7 34 17C34 7.6 26.4 0 17 0Z" fill="#3b82f6"/>
                  <text x="17" y="23" fill="#ffffff" font-size="13" font-family="system-ui, sans-serif" font-weight="900" text-anchor="middle">
                    ${initials}
                  </text>
                </svg>
              </div>`;

            return L.divIcon({
                html: htmlContent,
                className: 'custom-customer-marker-pin',
                iconSize: [34, 42],
                iconAnchor: [17, 42],
                popupAnchor: [17, -21]
            });
        }

        if (custMarkerType === 'compact-pin') {
            const htmlContent = `<div style="position: relative; width: 28px; height: 36px;">
                <svg width="28" height="36" viewBox="0 0 34 42" fill="none" style="position: absolute; top:0; left:0; width:100%; height:100%;">
                  <path d="M17 0C7.6 0 0 7.6 0 17C0 29.7 17 42 17 42C17 42 34 29.7 34 17C34 7.6 26.4 0 17 0Z" fill="#3b82f6"/>
                  <text x="17" y="23" fill="#ffffff" font-size="12" font-family="system-ui, sans-serif" font-weight="900" text-anchor="middle">
                    ${initials}
                  </text>
                </svg>
              </div>`;

            return L.divIcon({
                html: htmlContent,
                className: 'custom-customer-marker-compact-pin',
                iconSize: [28, 36],
                iconAnchor: [14, 36],
                popupAnchor: [14, -18]
            });
        }

        if (custMarkerType === 'compact') {
            const htmlContent = `<div style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid #ffffff; background-color: #3b82f6; box-shadow: 0 1px 4px rgba(0,0,0,0.4);"></div>`;
            return L.divIcon({
                html: htmlContent,
                className: 'custom-customer-marker-compact',
                iconSize: [14, 14],
                iconAnchor: [7, 7],
                popupAnchor: [7, 0]
            });
        }

        // Circle avatar
        const htmlContent = `<div style="width: 34px; height: 34px; border-radius: 50%; border: 2px solid #3b82f6; background-color: #1e3a8a; color: #ffffff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
            ${initials}
        </div>`;

        return L.divIcon({
            html: htmlContent,
            className: 'custom-customer-marker-circle',
            iconSize: [34, 34],
            iconAnchor: [17, 17],
            popupAnchor: [17, 0]
        });
    };

    // Helper: Supplier marker icon creator
    const getSupplierIcon = (s) => {
        const name = s.name || 'Supplier';
        const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

        if (supplierMarkerType === 'pin') {
            const htmlContent = `<div style="position: relative; width: 34px; height: 42px;">
                <svg width="34" height="42" viewBox="0 0 34 42" fill="none" style="position: absolute; top:0; left:0; width:100%; height:100%;">
                  <path d="M17 0C7.6 0 0 7.6 0 17C0 29.7 17 42 17 42C17 42 34 29.7 34 17C34 7.6 26.4 0 17 0Z" fill="#22c55e"/>
                  <text x="17" y="23" fill="#ffffff" font-size="13" font-family="system-ui, sans-serif" font-weight="900" text-anchor="middle">
                    ${initials}
                  </text>
                </svg>
              </div>`;

            return L.divIcon({
                html: htmlContent,
                className: 'custom-supplier-marker-pin',
                iconSize: [34, 42],
                iconAnchor: [17, 42],
                popupAnchor: [17, -21]
            });
        }

        if (supplierMarkerType === 'compact') {
            const htmlContent = `<div style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid #ffffff; background-color: #22c55e; box-shadow: 0 1px 4px rgba(0,0,0,0.4);"></div>`;
            return L.divIcon({
                html: htmlContent,
                className: 'custom-supplier-marker-compact',
                iconSize: [14, 14],
                iconAnchor: [7, 7],
                popupAnchor: [7, 0]
            });
        }

        const htmlContent = `<div style="width: 34px; height: 34px; border-radius: 50%; border: 2px solid #22c55e; background-color: #14532d; color: #ffffff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
            ${initials}
        </div>`;

        return L.divIcon({
            html: htmlContent,
            className: 'custom-supplier-marker-circle',
            iconSize: [34, 34],
            iconAnchor: [17, 17],
            popupAnchor: [17, 0]
        });
    };

    // Helper: Pulsing self locator dot style
    const getSelfIcon = () => {
        return L.divIcon({
            html: `<div style="
                position: relative;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: 2px solid #ea580c;
                background-color: #ffedd5;
                color: #c2410c;
                font-size: 11px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 10px rgba(234, 88, 12, 0.4);
                font-weight: bold;
            ">
                ME
                <div style="
                    position: absolute;
                    top: -2px;
                    left: -2px;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: 2px solid #ea580c;
                    animation: LeafletPulse 2s infinite ease-out;
                    pointer-events: none;
                "></div>
            </div>`,
            className: 'custom-tech-marker-self',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [16, 0]
        });
    };

    // Calculate OSRM route from self location to property / supplier destination
    const calculateRoute = async (destLat, destLng) => {
        if (!myLocation) return;
        setLoadingRoute(true);
        setActiveRoute(null);
        setRouteInfo(null);
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${myLocation.lng},${myLocation.lat};${destLng},${destLat}?steps=false&geometries=geojson&overview=full`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.code === 'Ok' && data.routes.length > 0) {
                const route = data.routes[0];
                setActiveRoute(route.geometry.coordinates.map(([lng, lat]) => [lat, lng]));
                setRouteInfo({
                    distance: route.distance,
                    duration: route.duration
                });
            }
        } catch (err) {
            console.error('OSRM Route calculation failed:', err);
        } finally {
            setLoadingRoute(false);
        }
    };

    if (loadingConfigs) {
        return (
            <div style={{ height: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '8px' }}>
                <Loader2 className="animate-spin" size={24} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '13px' }}>Loading technician map preferences...</span>
            </div>
        );
    }

    return (
        <div style={{ height: '500px', width: '100%', position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-primary)', zIndex: 0 }}>
            {/* Inject CSS keyframe animation for marker pulse */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes LeafletPulse {
                    0% { transform: scale(1); opacity: 0.8; }
                    100% { transform: scale(2.2); opacity: 0; }
                }
                .leaflet-popup-content-wrapper, .leaflet-popup-tip {
                    background: #1e293b !important;
                    color: #f8fafc !important;
                    border: 1px solid rgba(255,255,255,0.08) !important;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
                    border-radius: 12px !important;
                }
                .leaflet-popup-content {
                    margin: 12px !important;
                }
                .leaflet-container a.leaflet-popup-close-button {
                    color: #94a3b8 !important;
                    padding: 8px 8px 0 0 !important;
                }
                .leaflet-container a.leaflet-popup-close-button:hover {
                    color: #f1f5f9 !important;
                }
                .dark-map-tiles {
                    filter: grayscale(100%) invert(90%) brightness(95%) contrast(100%) !important;
                }
            ` }} />

            {/* Calculate Route Overlay Loader */}
            {loadingRoute && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', fontSize: '13px', color: '#7dd3fc', gap: '8px', fontWeight: 600 }}>
                    <Loader2 className="animate-spin" size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Calculating driving route...
                </div>
            )}

            <MapContainer
                center={[19.117, 72.905]} // default center Mumbai
                zoom={12}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    key={mapViewType}
                    className={mapViewType === 'dark' ? 'dark-map-tiles' : ''}
                    url={
                        mapViewType === 'satellite' ? "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" :
                        mapViewType === 'hybrid' ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" :
                        mapViewType === 'terrain' ? "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}" :
                        "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                    }
                    attribution='&copy; Google Maps'
                />

                <MapCenterController myLocation={myLocation} jobsGroup={propertiesGroup} />
                <MapInteractionController activeRoute={activeRoute} />

                {/* Polyline Route Overlay */}
                {activeRoute && (
                    <>
                        <Polyline positions={activeRoute} pathOptions={{ color: 'rgba(59, 130, 246, 0.25)', weight: 9, lineCap: 'round' }} />
                        <Polyline positions={activeRoute} pathOptions={{ color: '#3b82f6', weight: 4, lineCap: 'round', dashArray: '1, 8' }} />
                    </>
                )}

                {/* Self Location GPS Pin */}
                {showSelfLayer && myLocation && (
                    <Marker position={[myLocation.lat, myLocation.lng]} icon={getSelfIcon()}>
                        <Tooltip direction="top" offset={[0, -12]}>
                            <span style={{ fontWeight: 600 }}>My Location</span>
                        </Tooltip>
                        <Popup>
                            <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800, color: '#ea580c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Compass size={14} /> My GPS Coordinates
                                </h4>
                                <div>Latitude: {myLocation.lat.toFixed(6)}</div>
                                <div>Longitude: {myLocation.lng.toFixed(6)}</div>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Customer Job Markers */}
                {propertiesGroup.map((group, idx) => {
                    const primaryJob = group.jobs[0];
                    return (
                        <Marker
                            key={`cust-${idx}-${custMarkerType}`}
                            position={[group.lat, group.lng]}
                            icon={getCustomerIcon(group)}
                        >
                            <Tooltip direction="top" offset={[0, -16]}>
                                <div>
                                    <span style={{ fontWeight: 600 }}>{primaryJob.customerName}</span> ({group.jobs.length} jobs)
                                </div>
                            </Tooltip>
                            <Popup>
                                <div style={{ fontSize: '12px', color: '#cbd5e1', minWidth: '220px', fontFamily: 'inherit' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 800, color: '#3b82f6' }}>
                                        📍 {primaryJob.customerName || 'Customer Property'}
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', marginBottom: '8px' }}>
                                        {group.jobs.map(job => (
                                            <div key={job.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', marginBottom: '6px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <strong style={{ color: '#fff' }}>Job #{job.job_number || job.id.slice(0, 6)}</strong>
                                                    <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '10px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase' }}>
                                                        {job.status ? job.status.replace(/[-_]/g, ' ') : 'OPEN'}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>{job.category || job.appliance || 'Service Job'}</div>
                                                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                                    <button 
                                                        onClick={() => onJobClick(job)}
                                                        style={{ flex: 1, padding: '4px 6px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}
                                                    >
                                                        🔧 Open Job
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Proximity calculations from GPS */}
                                    <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                                        {myLocation ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {routeInfo && (
                                                    <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                                                        🚗 Distance: {(routeInfo.distance / 1000).toFixed(1)} km ({Math.round(routeInfo.duration / 60)} min)
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button 
                                                        onClick={() => calculateRoute(group.lat, group.lng)}
                                                        style={{ flex: 1, padding: '5px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}
                                                    >
                                                        🗺️ Show Route
                                                    </button>
                                                    <a 
                                                        href={`https://www.google.com/maps/dir/?api=1&origin=${myLocation.lat},${myLocation.lng}&destination=${group.lat},${group.lng}&travelmode=driving`}
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        style={{ flex: 1, padding: '5px', backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '4px', textDecoration: 'none', textAlign: 'center', fontSize: '10px', fontWeight: 'bold', display: 'block' }}
                                                    >
                                                        🚀 Google Maps
                                                    </a>
                                                </div>
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '10px', color: '#94a3b8' }}>Waiting for GPS live location...</span>
                                        )}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Suppliers Overlay */}
                {geocodedSuppliers.map(s => {
                    const { lat, lng } = s.coords;
                    return (
                        <Marker
                            key={`supplier-${s.id}-${supplierMarkerType}`}
                            position={[lat, lng]}
                            icon={getSupplierIcon(s)}
                        >
                            <Tooltip direction="top" offset={[0, -16]}>
                                <div>
                                    <span style={{ fontWeight: 600 }}>{s.name}</span> (Supplier)
                                </div>
                            </Tooltip>
                            <Popup>
                                <div style={{ fontSize: '12px', color: '#cbd5e1', minWidth: '180px' }}>
                                    <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 800, color: '#22c55e' }}>{s.name}</h4>
                                    <div><strong>Contact:</strong> {s.contactPerson || 'N/A'}</div>
                                    <div><strong>Phone:</strong> {s.mobile || s.phone || 'N/A'}</div>
                                    {s.customerDescription && (
                                        <div style={{ marginTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '6px', color: '#94a3b8', fontSize: '11px', lineHeight: 1.3 }}>
                                            <strong>Supplies / Notes:</strong><br />
                                            {s.customerDescription}
                                        </div>
                                    )}

                                    {/* Proximity calculations from GPS for Suppliers */}
                                    <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px', marginTop: '8px' }}>
                                        {myLocation ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {routeInfo && (
                                                    <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                                                        🚗 Distance: {(routeInfo.distance / 1000).toFixed(1)} km ({Math.round(routeInfo.duration / 60)} min)
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button 
                                                        onClick={() => calculateRoute(lat, lng)}
                                                        style={{ flex: 1, padding: '5px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}
                                                    >
                                                        🗺️ Show Route
                                                    </button>
                                                    <a 
                                                        href={`https://www.google.com/maps/dir/?api=1&origin=${myLocation.lat},${myLocation.lng}&destination=${lat},${lng}&travelmode=driving`}
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        style={{ flex: 1, padding: '5px', backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '4px', textDecoration: 'none', textAlign: 'center', fontSize: '10px', fontWeight: 'bold', display: 'block' }}
                                                    >
                                                        🚀 Google Maps
                                                    </a>
                                                </div>
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '10px', color: '#94a3b8' }}>Waiting for GPS live location...</span>
                                        )}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
