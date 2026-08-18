'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, Navigation, Map as MapIcon, Compass, Volume2, VolumeX, ArrowLeft, Flag, XCircle } from 'lucide-react';
import { apiCall } from '@/lib/offlineSync';
import { registerPlugin } from '@capacitor/core';

const GPSBridgePlugin = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web'
    ? registerPlugin('GPSBridgePlugin')
    : null;

// Merge default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper to calculate distance between coordinates (Haversine formula) in meters
const getDistanceBetweenCoords = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // meters
};

// Helper to create thin, small color-coded map pin icons (timeline style)
const createThinPinIcon = (color, strokeColor = '#ffffff') => {
    return L.divIcon({
        className: 'custom-thin-pin',
        html: `<div style="position: relative; width: 20px; height: 28px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.45));">
            <svg width="20" height="28" viewBox="0 0 20 28" fill="none" style="display: block; width: 100%; height: 100%;">
                <path d="M10 1C5.03 1 1 5.03 1 10c0 6.75 9 17 9 17s9-10.25 9-17c0-4.97-4.03-9-9-9z" fill="${color}" stroke="${strokeColor}" stroke-width="1.8" stroke-linejoin="round"/>
            </svg>
        </div>`,
        iconSize: [20, 28],
        iconAnchor: [10, 28],
        popupAnchor: [0, -28]
    });
};

// Helper to create small, thin color-coded map pin icons for suppliers (significantly smaller than customer markers)
const createSmallThinPinIcon = (color, strokeColor = '#ffffff') => {
    return L.divIcon({
        className: 'custom-small-thin-pin',
        html: `<div style="position: relative; width: 14px; height: 20px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 1.5px 3px rgba(0,0,0,0.45));">
            <svg width="14" height="20" viewBox="0 0 20 28" fill="none" style="display: block; width: 100%; height: 100%;">
                <path d="M10 1C5.03 1 1 5.03 1 10c0 6.75 9 17 9 17s9-10.25 9-17c0-4.97-4.03-9-9-9z" fill="${color}" stroke="${strokeColor}" stroke-width="2.2" stroke-linejoin="round"/>
            </svg>
        </div>`,
        iconSize: [14, 20],
        iconAnchor: [7, 20],
        popupAnchor: [0, -20]
    });
};

// Helper: Format turn instruction text from OSRM step
function formatStep(step) {
    const dir = step.maneuver?.modifier;
    const street = step.name && step.name !== '' ? ` onto ${step.name}` : '';
    const type = step.maneuver?.type;
    
    if (type === 'depart') return `🚀 Head out${street}`;
    if (type === 'arrive') return `📍 Arrive at destination`;
    
    const dirWords = {
        left: 'turn left',
        'slight left': 'slight left turn',
        'sharp left': 'sharp left turn',
        right: 'turn right',
        'slight right': 'slight right turn',
        'sharp right': 'sharp right turn',
        straight: 'go straight',
        uturn: 'make a U-turn'
    };
    const action = dirWords[dir] || 'continue';
    return `${action.charAt(0).toUpperCase() + action.slice(1)}${street}`;
}

// Helper: Get turn symbol icons
const getDirectionArrow = (modifier) => {
    const icons = {
        left: '↰', 'slight left': '↖', 'sharp left': '↙',
        right: '↱', 'slight right': '↗', 'sharp right': '↘',
        straight: '↑', uturn: '↺',
    };
    return icons[modifier] || '→';
};

// Map center and bounds auto-controller
function MapCenterController({ myLocation, jobsGroup, active }) {
    const map = useMap();
    const centeredRef = useRef(false);

    useEffect(() => {
        if (active) return; // Let navigation follower center instead

        if (centeredRef.current) return;

        if (myLocation) {
            map.setView([myLocation.lat, myLocation.lng], 13);
            centeredRef.current = true;
        } else if (jobsGroup && jobsGroup.length > 0) {
            const bounds = L.latLngBounds(jobsGroup.map(g => [g.lat, g.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
            centeredRef.current = true;
        }
    }, [myLocation, jobsGroup, map, active]);

    return null;
}

// Follow live location when in navigation mode
function MapFollowController({ myLocation, active }) {
    const map = useMap();

    useEffect(() => {
        if (active && myLocation) {
            map.setView([myLocation.lat, myLocation.lng], 17, { animate: true });
        }
    }, [myLocation, active, map]);

    return null;
}

// Watch navigation bounds controller
function MapInteractionController({ activeRoute, active }) {
    const map = useMap();
    useEffect(() => {
        if (active) return; // Lock to navigation follower zoom level 17
        if (activeRoute && activeRoute.length > 1) {
            map.fitBounds(L.latLngBounds(activeRoute), { padding: [40, 40] });
        }
    }, [activeRoute, map, active]);
    return null;
}

// Dynamic recenter map trigger controller
function RecenterController({ trigger, myLocation, onDone }) {
    const map = useMap();
    useEffect(() => {
        if (trigger && myLocation) {
            map.setView([myLocation.lat, myLocation.lng], 16, { animate: true });
            onDone();
        }
    }, [trigger, myLocation, map, onDone]);
    return null;
}

export default function TechnicianJobsMapView({ jobs = [], onJobClick }) {
    // Configurations state
    const [custMarkerType, setCustMarkerType] = useState('thin');
    const [supplierMarkerType, setSupplierMarkerType] = useState('thin');
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
    const [showIndicators, setShowIndicators] = useState(false);

    // Routing path state
    const [activeRoute, setActiveRoute] = useState(null);
    const [routeInfo, setRouteInfo] = useState(null);
    const [loadingRoute, setLoadingRoute] = useState(false);
    
    // Active navigation states
    const [navigationActive, setNavigationActive] = useState(false);
    const [navSteps, setNavSteps] = useState([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [voiceMuted, setVoiceMuted] = useState(false);
    const [activeDestCoords, setActiveDestCoords] = useState(null);

    const handleViewTypeChange = (type) => {
        setMapViewType(type);
        localStorage.setItem('techMapViewType', type);
    };

    const [recenterTrigger, setRecenterTrigger] = useState(0);
    const [refreshingGps, setRefreshingGps] = useState(false);

    const handleRecenterClick = async () => {
        setRefreshingGps(true);

        // 1. Native app bridge path
        if (GPSBridgePlugin) {
            try {
                const pos = await GPSBridgePlugin.getCurrentLocation();
                if (pos && pos.latitude && pos.longitude) {
                    const newLoc = { lat: pos.latitude, lng: pos.longitude };
                    setMyLocation(newLoc);
                    setRecenterTrigger(prev => prev + 1);
                    setRefreshingGps(false);
                    return;
                }
            } catch (err) {
                console.warn('Native GPS refresh failed, falling back to Web API:', err);
            }
        }

        // 2. Web browser fallback path
        if (typeof window !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setMyLocation(newLoc);
                    setRecenterTrigger(prev => prev + 1);
                    setRefreshingGps(false);
                },
                (err) => {
                    console.error('Manual GPS refresh failed:', err);
                    if (myLocation) {
                        setRecenterTrigger(prev => prev + 1);
                    } else {
                        alert("GPS Error: Could not retrieve high-accuracy location. Please check phone settings.");
                    }
                    setRefreshingGps(false);
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        } else {
            setRefreshingGps(false);
        }
    };

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
                    const savedView = localStorage.getItem('techMapViewType');
                    if (savedView) {
                        setMapViewType(savedView);
                    } else if (val.mapViewType) {
                        setMapViewType(val.mapViewType);
                    }
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

    // Watch real-time location via standard browser GPS API & native GPSBridgePlugin
    useEffect(() => {
        const fetchNativeLocation = async () => {
            if (GPSBridgePlugin) {
                try {
                    const pos = await GPSBridgePlugin.getCurrentLocation();
                    if (pos && pos.latitude && pos.longitude) {
                        setMyLocation({ lat: pos.latitude, lng: pos.longitude });
                    }
                } catch (e) {
                    console.warn('Native GPS fetch failed:', e);
                }
            }
        };

        fetchNativeLocation();

        // Native bridge polling fallback
        let nativeInterval;
        if (GPSBridgePlugin) {
            nativeInterval = setInterval(fetchNativeLocation, 10000);
        }

        // Web API watcher
        let watchId;
        if (typeof window !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                (err) => console.error('Initial geolocator error:', err),
                { enableHighAccuracy: true, timeout: 8000 }
            );

            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                (err) => console.error('Watch position error:', err),
                { enableHighAccuracy: true }
            );
        }

        return () => {
            if (nativeInterval) clearInterval(nativeInterval);
            if (watchId && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
        };
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

    // Helper: TTS Text-to-speech directions
    const speakInstruction = (text) => {
        if (voiceMuted) return;
        try {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel(); // Mute ongoing speeches
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 0.95;
                window.speechSynthesis.speak(utterance);
            }
        } catch (e) {
            console.error('Speech synthesis failed:', e);
        }
    };

    // Geolocation advancement observer
    useEffect(() => {
        if (!navigationActive || !myLocation || navSteps.length === 0 || currentStepIndex >= navSteps.length - 1) return;
        
        const nextStep = navSteps[currentStepIndex + 1];
        if (nextStep && nextStep.location) {
            const dist = getDistanceBetweenCoords(
                myLocation.lat, myLocation.lng,
                nextStep.location[0], nextStep.location[1]
            );

            // Auto-advance if within 30 meters of next coordinate node
            if (dist < 30) {
                const nextIdx = currentStepIndex + 1;
                setCurrentStepIndex(nextIdx);
                speakInstruction(navSteps[nextIdx].instruction);
            }
        }
    }, [myLocation, navigationActive, navSteps, currentStepIndex]);

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

    // Group jobs by property coordinates (filter other markers if navigating)
    const groupedJobs = {};
    if (showCustomersLayer) {
        jobs.forEach(job => {
            const coords = getJobCoordinates(job);
            if (!coords) return;
            // When navigation is active, only render the active destination pin to keep map clean
            if (navigationActive && activeDestCoords) {
                const distDest = getDistanceBetweenCoords(coords.lat, coords.lng, activeDestCoords.lat, activeDestCoords.lng);
                if (distDest > 5) return; // Hide pins further than 5m
            }
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

    // Filter suppliers (filter if navigating)
    const allGeocodedSuppliers = suppliers.map(s => ({
        ...s,
        coords: getSupplierCoordinates(s)
    })).filter(s => s.coords !== null);

    const geocodedSuppliers = showSuppliersLayer 
        ? (navigationActive && activeDestCoords
            ? allGeocodedSuppliers.filter(s => getDistanceBetweenCoords(s.coords.lat, s.coords.lng, activeDestCoords.lat, activeDestCoords.lng) < 5)
            : allGeocodedSuppliers)
        : [];

    // Helper: Customer marker icons creator
    const getCustomerIcon = (group) => {
        const primaryJob = group.jobs[0];
        const name = primaryJob.customerName || 'Customer';
        const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

        if (custMarkerType === 'thin') {
            let color = '#3b82f6'; // default blue
            const groupJobs = group.jobs || [];
            
            const allClosed = groupJobs.every(j => j.status === 'closed' || j.status === 'cancelled' || j.status === 'completed');
            const anyInProgress = groupJobs.some(j => j.status === 'in_progress' || j.status === 'arrived' || j.status === 'on_way');
            
            if (allClosed) {
                color = '#10b981'; // Green
            } else if (anyInProgress) {
                color = '#eab308'; // Yellow for in progress / active on site
            }
            return createThinPinIcon(color);
        }

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

        if (supplierMarkerType === 'thin') {
            return createSmallThinPinIcon('#15803d'); // Dark green and small size
        }

        if (supplierMarkerType === 'pin') {
            const htmlContent = `<div style="position: relative; width: 26px; height: 32px;">
                <svg width="26" height="32" viewBox="0 0 34 42" fill="none" style="position: absolute; top:0; left:0; width:100%; height:100%;">
                  <path d="M17 0C7.6 0 0 7.6 0 17C0 29.7 17 42 17 42C17 42 34 29.7 34 17C34 7.6 26.4 0 17 0Z" fill="#15803d"/>
                  <text x="17" y="23" fill="#ffffff" font-size="11" font-family="system-ui, sans-serif" font-weight="900" text-anchor="middle">
                    ${initials}
                  </text>
                </svg>
              </div>`;

            return L.divIcon({
                html: htmlContent,
                className: 'custom-supplier-marker-pin',
                iconSize: [26, 32],
                iconAnchor: [13, 32],
                popupAnchor: [13, -16]
            });
        }

        if (supplierMarkerType === 'compact') {
            const htmlContent = `<div style="width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid #ffffff; background-color: #15803d; box-shadow: 0 1px 4px rgba(0,0,0,0.4);"></div>`;
            return L.divIcon({
                html: htmlContent,
                className: 'custom-supplier-marker-compact',
                iconSize: [10, 10],
                iconAnchor: [5, 5],
                popupAnchor: [5, 0]
            });
        }

        const htmlContent = `<div style="width: 26px; height: 26px; border-radius: 50%; border: 2px solid #ffffff; background-color: #15803d; color: #ffffff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
            ${initials}
        </div>`;

        return L.divIcon({
            html: htmlContent,
            className: 'custom-supplier-marker-circle',
            iconSize: [26, 26],
            iconAnchor: [13, 13],
            popupAnchor: [13, 0]
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
        setNavSteps([]);
        setActiveDestCoords({ lat: destLat, lng: destLng });
        
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${myLocation.lng},${myLocation.lat};${destLng},${destLat}?steps=true&geometries=geojson&overview=full`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.code === 'Ok' && data.routes.length > 0) {
                const route = data.routes[0];
                setActiveRoute(route.geometry.coordinates.map(([lng, lat]) => [lat, lng]));
                setRouteInfo({
                    distance: route.distance,
                    duration: route.duration
                });
                
                // Parse turn by turn steps
                const parsedSteps = route.legs[0]?.steps?.map(s => ({
                    instruction: formatStep(s),
                    distance: s.distance,
                    modifier: s.maneuver?.modifier || 'straight',
                    location: [s.maneuver.location[1], s.maneuver.location[0]]
                })) || [];
                setNavSteps(parsedSteps);
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
        <div style={{ height: '540px', width: '100%', position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-primary)', zIndex: 0 }}>
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

            {/* ── ACTIVE TURN-BY-TURN HUD (TOP DISPLAY) ── */}
            {navigationActive && navSteps.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    right: '16px',
                    backgroundColor: 'rgba(15, 23, 42, 0.92)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '16px',
                    zIndex: 1000,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                        {/* Large Arrow Icon */}
                        <div style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '12px',
                            backgroundColor: '#10b981',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '22px',
                            fontWeight: 'bold',
                            boxShadow: '0 4px 10px rgba(16,185,129,0.3)',
                            flexShrink: 0
                        }}>
                            {getDirectionArrow(navSteps[currentStepIndex]?.modifier)}
                        </div>
                        {/* Instruction text info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc', lineHeight: '1.3' }}>
                                {navSteps[currentStepIndex]?.instruction}
                            </div>
                            {navSteps[currentStepIndex]?.distance > 0 && (
                                <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 700, marginTop: '2px' }}>
                                    in {navSteps[currentStepIndex].distance >= 1000 
                                        ? `${(navSteps[currentStepIndex].distance / 1000).toFixed(1)} km` 
                                        : `${Math.round(navSteps[currentStepIndex].distance)} meters`}
                                </div>
                            )}
                        </div>
                    </div>
                    {/* TTS Voice controller toggler */}
                    <button
                        onClick={() => setVoiceMuted(!voiceMuted)}
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: 'none',
                            padding: '10px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            color: voiceMuted ? '#ef4444' : '#38bdf8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}
                        title={voiceMuted ? "Unmute Voice Guide" : "Mute Voice Guide"}
                    >
                        {voiceMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                </div>
            )}

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

                <MapCenterController myLocation={myLocation} jobsGroup={propertiesGroup} active={navigationActive} />
                <MapFollowController myLocation={myLocation} active={navigationActive} />
                <MapInteractionController activeRoute={activeRoute} active={navigationActive} />
                <RecenterController trigger={recenterTrigger} myLocation={myLocation} onDone={() => setRecenterTrigger(0)} />

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
                                                    {routeInfo ? (
                                                        <button 
                                                            onClick={() => {
                                                                setNavigationActive(true);
                                                                setCurrentStepIndex(0);
                                                                speakInstruction("Starting navigation. " + (navSteps[0]?.instruction || "Head towards your destination."));
                                                            }}
                                                            style={{ flex: 1, padding: '5px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}
                                                        >
                                                            🚀 Start
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={() => calculateRoute(group.lat, group.lng)}
                                                            style={{ flex: 1, padding: '5px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}
                                                        >
                                                            🗺️ Show Route
                                                        </button>
                                                    )}
                                                    <a 
                                                        href={`https://www.google.com/maps/dir/?api=1&origin=${myLocation.lat},${myLocation.lng}&destination=${group.lat},${group.lng}&travelmode=driving`}
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        style={{ flex: 1, padding: '5px', backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '4px', textDecoration: 'none', textAlign: 'center', fontSize: '10px', fontWeight: 'bold', display: 'block' }}
                                                    >
                                                        📲 Google Maps
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
                                                    {routeInfo ? (
                                                        <button 
                                                            onClick={() => {
                                                                setNavigationActive(true);
                                                                setCurrentStepIndex(0);
                                                                speakInstruction("Starting navigation. " + (navSteps[0]?.instruction || "Head towards your destination."));
                                                            }}
                                                            style={{ flex: 1, padding: '5px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}
                                                        >
                                                            🚀 Start
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={() => calculateRoute(lat, lng)}
                                                            style={{ flex: 1, padding: '5px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}
                                                        >
                                                            🗺️ Show Route
                                                        </button>
                                                    )}
                                                    <a 
                                                        href={`https://www.google.com/maps/dir/?api=1&origin=${myLocation.lat},${myLocation.lng}&destination=${lat},${lng}&travelmode=driving`}
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        style={{ flex: 1, padding: '5px', backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '4px', textDecoration: 'none', textAlign: 'center', fontSize: '10px', fontWeight: 'bold', display: 'block' }}
                                                    >
                                                        📲 Google Maps
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

            {/* ── NAVIGATION BOTTOM PANEL (STATS & DISMISS) ── */}
            {navigationActive && routeInfo && (
                <div style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '16px',
                    right: '16px',
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '16px',
                    zIndex: 1000,
                    boxShadow: '0 -4px 25px rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '20px', fontWeight: 900, color: '#10b981' }}>
                                {Math.round(routeInfo.duration / 60)} min
                            </span>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                ({((routeInfo.distance) / 1000).toFixed(1)} km)
                            </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px', fontWeight: 500 }}>
                            Arriving at {new Date(Date.now() + routeInfo.duration * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            setNavigationActive(false);
                            setActiveRoute(null);
                            setRouteInfo(null);
                            setNavSteps([]);
                            setActiveDestCoords(null);
                            if (typeof window !== 'undefined' && window.speechSynthesis) {
                                window.speechSynthesis.cancel();
                            }
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '10px 18px',
                            backgroundColor: '#ef4444',
                            color: '#ffffff',
                            fontWeight: 'bold',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 10px rgba(239,68,68,0.2)'
                        }}
                    >
                        <XCircle size={16} /> Exit
                    </button>
                </div>
            )}
            {/* ── Marker Indicators Floating Dropdown ── */}
            <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                fontFamily: 'inherit'
            }}>
                <button
                    onClick={() => setShowIndicators(prev => !prev)}
                    style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                        transition: 'all 0.15s',
                        outline: 'none'
                    }}
                    type="button"
                >
                    📍 Marker Indicators <span style={{ transition: 'transform 0.2s', transform: showIndicators ? 'rotate(180deg)' : 'rotate(0deg)', fontSize: '10px' }}>▼</span>
                </button>

                {showIndicators && (
                    <div style={{
                        marginTop: '6px',
                        width: '240px',
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '10px',
                        padding: '12px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        color: '#cbd5e1',
                        fontSize: '11px',
                        lineHeight: '1.4'
                    }}>
                        {/* Customers */}
                        <div>
                            <strong style={{ color: '#38bdf8', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Customer Jobs</strong>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '10px', height: '14px', backgroundColor: '#3b82f6', clipPath: 'polygon(50% 0%, 100% 35%, 100% 70%, 50% 100%, 0% 70%, 0% 35%)' }}></div>
                                    <span>Blue: Scheduled Job</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '10px', height: '14px', backgroundColor: '#eab308', clipPath: 'polygon(50% 0%, 100% 35%, 100% 70%, 50% 100%, 0% 70%, 0% 35%)' }}></div>
                                    <span>Yellow: Active / In Progress / On-Way</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '10px', height: '14px', backgroundColor: '#10b981', clipPath: 'polygon(50% 0%, 100% 35%, 100% 70%, 50% 100%, 0% 70%, 0% 35%)' }}></div>
                                    <span>Green: Completed / Closed</span>
                                </div>
                            </div>
                        </div>

                        {/* Suppliers */}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                            <strong style={{ color: '#15803d', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Suppliers</strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '8px', height: '11px', backgroundColor: '#15803d', clipPath: 'polygon(50% 0%, 100% 35%, 100% 70%, 50% 100%, 0% 70%, 0% 35%)' }}></div>
                                <span>Dark Green: Spares Supplier Store (Small)</span>
                            </div>
                        </div>

                        {/* Self Location */}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                            <strong style={{ color: '#ea580c', fontSize: '12px', display: 'block', marginBottom: '6px' }}>My Location</strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffedd5', border: '2px solid #ea580c' }}></div>
                                <span>Me (Pulsing GPS badge)</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Personal Map Base Layer Selector (Floating Right) ── */}
            <div style={{
                position: 'absolute',
                top: '100px',
                right: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                zIndex: 1000,
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(8px)',
                padding: '6px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
            }}>
                {[
                    { id: 'roadmap', label: '🗺️', title: 'Roadmap' },
                    { id: 'satellite', label: '🛰️', title: 'Satellite' },
                    { id: 'hybrid', label: '🌓', title: 'Hybrid' },
                    { id: 'dark', label: '🌙', title: 'Dark Mode' }
                ].map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => handleViewTypeChange(opt.id)}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            backgroundColor: mapViewType === opt.id ? '#3b82f6' : 'transparent',
                            border: 'none',
                            color: '#ffffff',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            outline: 'none'
                        }}
                        title={opt.title}
                        type="button"
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* ── Recenter on Me Button ── */}
            <button
                onClick={handleRecenterClick}
                disabled={refreshingGps}
                style={{
                    position: 'absolute',
                    top: '280px',
                    right: '12px',
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: refreshingGps ? '#eab308' : '#38bdf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    zIndex: 1000,
                    transition: 'all 0.2s ease'
                }}
                title="Recenter on my location"
                type="button"
            >
                {refreshingGps ? (
                    <Loader2 className="animate-spin" size={18} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                    <Compass size={18} />
                )}
            </button>
        </div>
    );
}
