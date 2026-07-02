'use client'

import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { User, Briefcase, Calendar, Loader2, Phone, Map } from 'lucide-react';
import { techniciansAPI } from '@/lib/adminAPI';
import { generateInitialsAvatar } from '@/lib/utils/accountHelpers';

// Robust helper to resolve coordinates from a job object or its linked property/customer properties
function getJobCoordinates(job) {
    if (!job) return null;

    // 1. Direct coordinates on job
    if (job.lat && job.lng) {
        return { lat: Number(job.lat), lng: Number(job.lng) };
    }
    if (job.latitude && job.longitude) {
        return { lat: Number(job.latitude), lng: Number(job.longitude) };
    }

    // 2. Direct coordinates on job.property
    const prop = job.property;
    if (prop) {
        if (prop.lat && prop.lng) {
            return { lat: Number(prop.lat), lng: Number(prop.lng) };
        }
        if (prop.latitude && prop.longitude) {
            return { lat: Number(prop.latitude), lng: Number(prop.longitude) };
        }
    }

    // 3. Match from customer's properties list
    const accountProps = job.customer?.properties;
    if (Array.isArray(accountProps) && accountProps.length > 0) {
        // Try matching by ID first
        const propId = prop?.id || job.property_id;
        if (propId) {
            const matchById = accountProps.find(p => String(p.id) === String(propId));
            if (matchById && (matchById.lat || matchById.latitude)) {
                return {
                    lat: Number(matchById.lat || matchById.latitude),
                    lng: Number(matchById.lng || matchById.longitude)
                };
            }
        }

        // Try matching by building name or address line similarity
        if (prop) {
            const matchByDetails = accountProps.find(p => 
                (p.building_name && prop.building_name && String(p.building_name).trim().toLowerCase() === String(prop.building_name).trim().toLowerCase()) ||
                (p.address && prop.address && String(p.address).trim().toLowerCase() === String(prop.address).trim().toLowerCase())
            );
            if (matchByDetails && (matchByDetails.lat || matchByDetails.latitude)) {
                return {
                    lat: Number(matchByDetails.lat || matchByDetails.latitude),
                    lng: Number(matchByDetails.lng || matchByDetails.longitude)
                };
            }
        }

        // Fallback: If only 1 property in customer account, use it
        if (accountProps.length === 1) {
            const first = accountProps[0];
            if (first.lat || first.latitude) {
                return {
                    lat: Number(first.lat || first.latitude),
                    lng: Number(first.lng || first.longitude)
                };
            }
        }
        
        // Fallback 2: Use the first property that has coordinates
        const firstWithCoords = accountProps.find(p => p.lat || p.latitude);
        if (firstWithCoords) {
            return {
                lat: Number(firstWithCoords.lat || firstWithCoords.latitude),
                lng: Number(firstWithCoords.lng || firstWithCoords.longitude)
            };
        }
    }

    return null;
}

// Helper to resolve coordinates for a Supplier from their properties list
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

// Helper to center the map when jobs change
function MapCenterController({ groups }) {
    const map = useMap();
    useEffect(() => {
        if (!groups || groups.length === 0) return;
        const validCoords = groups.map(g => [g.lat, g.lng]);

        if (validCoords.length > 0) {
            const bounds = L.latLngBounds(validCoords);
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        }
    }, [groups, map]);
    return null;
}

// Helper to auto-pan and zoom the map to fit active routing directions
function MapInteractionController({ activeRoute }) {
    const map = useMap();
    useEffect(() => {
        if (activeRoute?.coords && activeRoute.coords.length > 0) {
            const bounds = L.latLngBounds(activeRoute.coords);
            map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
        }
    }, [activeRoute, map]);
    return null;
}

// Haversine straight-line distance formula
function getHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export default function JobsMapView({ jobs, onUpdateJob }) {
    const [technicians, setTechnicians] = useState([]);
    const [fleetLocations, setFleetLocations] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loadingTechs, setLoadingTechs] = useState(false);
    
    // Proximity distances loading state
    const [distances, setDistances] = useState({});
    const [loadingDistances, setLoadingDistances] = useState(false);
    const [activeJobId, setActiveJobId] = useState(null);
    const [expandedJobId, setExpandedJobId] = useState(null);

    // Active routing layer
    const [activeRoute, setActiveRoute] = useState(null);

    // Marker styling and layer visibility configurations
    const [custMarkerType, setCustMarkerType] = useState('circle');
    const [techMarkerType, setTechMarkerType] = useState('wrench');
    const [supplierMarkerType, setSupplierMarkerType] = useState('pin');
    const [mapViewType, setMapViewType] = useState('roadmap');
    const [autoExpandSingleJob, setAutoExpandSingleJob] = useState(true);
    const [enableRoutePathHighlight, setEnableRoutePathHighlight] = useState(true);
    const [showCustomersLayer, setShowCustomersLayer] = useState(true);
    const [showTechniciansLayer, setShowTechniciansLayer] = useState(true);
    const [showSuppliersLayer, setShowSuppliersLayer] = useState(true);

    // Load configurations from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedCust = localStorage.getItem('custMarkerType');
            const savedTech = localStorage.getItem('techMarkerType');
            const savedSupplier = localStorage.getItem('supplierMarkerType');
            const savedView = localStorage.getItem('mapViewType');
            const savedAuto = localStorage.getItem('autoExpandSingleJob');
            const savedRoute = localStorage.getItem('enableRoutePathHighlight');
            const savedCustLayer = localStorage.getItem('showCustomersLayer');
            const savedTechLayer = localStorage.getItem('showTechniciansLayer');
            const savedSupplierLayer = localStorage.getItem('showSuppliersLayer');

            if (savedCust) setCustMarkerType(savedCust);
            if (savedTech) setTechMarkerType(savedTech);
            if (savedSupplier) setSupplierMarkerType(savedSupplier);
            if (savedView) setMapViewType(savedView);
            if (savedAuto !== null) setAutoExpandSingleJob(savedAuto !== 'false');
            if (savedRoute !== null) setEnableRoutePathHighlight(savedRoute !== 'false');
            if (savedCustLayer !== null) setShowCustomersLayer(savedCustLayer !== 'false');
            if (savedTechLayer !== null) setShowTechniciansLayer(savedTechLayer !== 'false');
            if (savedSupplierLayer !== null) setShowSuppliersLayer(savedSupplierLayer !== 'false');
        }
    }, []);

    // Fetch technicians, live locations, and suppliers on mount
    const fetchMapAccountsData = async () => {
        setLoadingTechs(true);
        try {
            const [techRes, fleetRes, supplierRes] = await Promise.all([
                techniciansAPI.getAll(),
                fetch('/api/admin/fleet-locations').then(res => res.json()),
                fetch('/api/admin/accounts?type=supplier').then(res => res.json())
            ]);
            
            setTechnicians(techRes || []);
            if (fleetRes?.success) {
                setFleetLocations(fleetRes.data || []);
            }
            if (supplierRes?.success) {
                setSuppliers(supplierRes.data || []);
            }
        } catch (err) {
            console.error('Failed to load map tracking accounts:', err);
        } finally {
            setLoadingTechs(false);
        }
    };

    useEffect(() => {
        fetchMapAccountsData();
        const timer = setInterval(fetchMapAccountsData, 45000);
        return () => clearInterval(timer);
    }, []);

    // Helper to build customer markers based on selected customization
    const getCustomerIcon = (job) => {
        const name = job.customer?.name || job.customer_name || 'Customer';
        const img = job.customer?.accountImage;
        const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
        const avatar = generateInitialsAvatar(name);

        if (custMarkerType === 'pin') {
            const htmlContent = img
                ? `<div style="position: relative; width: 34px; height: 42px;">
                     <svg width="34" height="42" viewBox="0 0 34 42" fill="none" style="position: absolute; top:0; left:0; width:100%; height:100%;">
                       <path d="M17 0C7.6 0 0 7.6 0 17C0 29.7 17 42 17 42C17 42 34 29.7 34 17C34 7.6 26.4 0 17 0Z" fill="#3b82f6"/>
                     </svg>
                     <div style="position: absolute; top: 5px; left: 5px; width: 24px; height: 24px; border-radius: 50%; overflow: hidden; border: 1.5px solid #fff;">
                       <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;" />
                     </div>
                   </div>`
                : `<div style="position: relative; width: 34px; height: 42px;">
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
                popupAnchor: [17, -21] // Side-anchored popup (opens to the right)
            });
        }

        if (custMarkerType === 'compact-pin') {
            const htmlContent = img
                ? `<div style="position: relative; width: 28px; height: 36px;">
                     <svg width="28" height="36" viewBox="0 0 34 42" fill="none" style="position: absolute; top:0; left:0; width:100%; height:100%;">
                       <path d="M17 0C7.6 0 0 7.6 0 17C0 29.7 17 42 17 42C17 42 34 29.7 34 17C34 7.6 26.4 0 17 0Z" fill="#3b82f6"/>
                     </svg>
                     <div style="position: absolute; top: 4px; left: 4px; width: 20px; height: 20px; border-radius: 50%; overflow: hidden; border: 1px solid #fff;">
                       <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;" />
                     </div>
                   </div>`
                : `<div style="position: relative; width: 28px; height: 36px;">
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
                popupAnchor: [14, -18] // Side-anchored popup (opens to the right)
            });
        }

        if (custMarkerType === 'compact') {
            const htmlContent = `<div style="
                width: 14px;
                height: 14px;
                border-radius: 50%;
                border: 2px solid #ffffff;
                background-color: #3b82f6;
                box-shadow: 0 1px 4px rgba(0,0,0,0.4);
            "></div>`;

            return L.divIcon({
                html: htmlContent,
                className: 'custom-customer-marker-compact',
                iconSize: [14, 14],
                iconAnchor: [7, 7],
                popupAnchor: [7, 0] // Side-anchored popup (opens to the right)
            });
        }

        // Default 'circle' initials avatar
        const htmlContent = img
            ? `<div style="
                width: 34px;
                height: 34px;
                border-radius: 50%;
                border: 2px solid #3b82f6;
                background-color: #1e3a8a;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                  <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;" />
              </div>`
            : `<div style="
                width: 34px;
                height: 34px;
                border-radius: 50%;
                border: 2px solid #3b82f6;
                background-color: ${avatar.backgroundColor || '#3b82f6'};
                color: ${avatar.textColor || '#ffffff'};
                font-size: 12px;
                font-weight: 700;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              ">
                  ${initials}
              </div>`;

        return L.divIcon({
            html: htmlContent,
            className: 'custom-customer-marker-circle',
            iconSize: [34, 34],
            iconAnchor: [17, 17],
            popupAnchor: [17, 0] // Side-anchored popup (opens to the right)
        });
    };

    // Helper to build technician markers dynamically based on selected style option
    const getTechIcon = (tech) => {
        const name = tech?.name || 'Technician';
        const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

        if (techMarkerType === 'pin') {
            const htmlContent = `<div style="position: relative; width: 34px; height: 42px;">
                <svg width="34" height="42" viewBox="0 0 34 42" fill="none" style="position: absolute; top:0; left:0; width:100%; height:100%;">
                  <path d="M17 0C7.6 0 0 7.6 0 17C0 29.7 17 42 17 42C17 42 34 29.7 34 17C34 7.6 26.4 0 17 0Z" fill="#ea580c"/>
                  <text x="17" y="23" fill="#ffffff" font-size="13" font-family="system-ui, sans-serif" font-weight="900" text-anchor="middle">
                    ${initials}
                  </text>
                </svg>
              </div>`;

            return L.divIcon({
                html: htmlContent,
                className: 'custom-tech-marker-pin',
                iconSize: [34, 42],
                iconAnchor: [17, 42],
                popupAnchor: [17, -21]
            });
        }

        if (techMarkerType === 'avatar') {
            const htmlContent = `<div style="
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: 2px solid #eab308;
                background-color: #fef08a;
                color: #854d0e;
                font-size: 11px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.35);
                font-weight: bold;
              ">${initials}</div>`;

            return L.divIcon({
                html: htmlContent,
                className: 'custom-tech-marker-avatar',
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [16, 0]
            });
        }

        // Default 'wrench' circle icon
        return L.divIcon({
            html: `<div style="
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: 2px solid #eab308;
                background-color: #fef08a;
                color: #854d0e;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.35);
                font-weight: bold;
            ">🔧</div>`,
            className: 'custom-tech-marker-wrench',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [16, 0]
        });
    };

    // Helper to build supplier markers dynamically based on selected style option
    const getSupplierIcon = (supplier) => {
        const name = supplier.name || 'Supplier';
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
            const htmlContent = `<div style="
                width: 14px;
                height: 14px;
                border-radius: 50%;
                border: 2px solid #ffffff;
                background-color: #22c55e;
                box-shadow: 0 1px 4px rgba(0,0,0,0.4);
            "></div>`;

            return L.divIcon({
                html: htmlContent,
                className: 'custom-supplier-marker-compact',
                iconSize: [14, 14],
                iconAnchor: [7, 7],
                popupAnchor: [7, 0]
            });
        }

        // Default 'circle' initials avatar
        const htmlContent = `<div style="
            width: 34px;
            height: 34px;
            border-radius: 50%;
            border: 2px solid #22c55e;
            background-color: #14532d;
            color: #ffffff;
            font-size: 12px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">
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

    // Calculate real-road google distances for nearest 5 active technicians
    const handleCalculateDistances = async (lat, lng, jobId) => {
        setActiveJobId(jobId);
        setLoadingDistances(true);
        setDistances({});

        const candidates = technicians
            .filter(t => t.is_active !== false) // Exclude inactive/fired test technicians
            .map(tech => {
                const liveLoc = fleetLocations.find(l => l.technician_id === tech.id);
                if (!liveLoc || !liveLoc.latitude || !liveLoc.longitude) {
                    return { 
                        ...tech, 
                        straightDist: Infinity, 
                        hasLocation: false 
                    };
                }
                const dist = getHaversineDistance(
                    lat, lng,
                    liveLoc.latitude, liveLoc.longitude
                );
                return { 
                    ...tech, 
                    straightDist: dist, 
                    coords: `${liveLoc.latitude},${liveLoc.longitude}`,
                    isOnline: liveLoc.is_online,
                    hasLocation: true
                };
            });

        // Filter and sort candidates
        const closestWithLocation = candidates
            .filter(c => c.hasLocation)
            .sort((a, b) => a.straightDist - b.straightDist)
            .slice(0, 5);

        const googleResults = {};
        await Promise.all(closestWithLocation.map(async (tech) => {
            try {
                const res = await fetch(`/api/admin/google-distance?origin=${tech.coords}&destination=${lat},${lng}`);
                const data = await res.json();
                if (data.success) {
                    googleResults[tech.id] = {
                        distance: data.distance,
                        duration: data.duration,
                        isOnline: tech.isOnline,
                        hasLocation: true
                    };
                }
            } catch (err) {
                console.error('Google Matrix computation failed:', err);
            }
        }));

        // Populate map for ALL active technicians (with coordinates or not)
        candidates.forEach(tech => {
            if (tech.hasLocation) {
                if (!googleResults[tech.id]) {
                    // Fallback to straight distance if Google route failed
                    googleResults[tech.id] = {
                        distance: `${tech.straightDist.toFixed(1)} km (straight)`,
                        duration: 'N/A',
                        isOnline: tech.isOnline,
                        hasLocation: true
                    };
                }
            } else {
                // Return offline entry
                googleResults[tech.id] = {
                    distance: 'No GPS Location',
                    duration: 'N/A',
                    isOnline: false,
                    hasLocation: false
                };
            }
        });

        setDistances(googleResults);
        setLoadingDistances(false);
    };

    // Dynamic routing calculator using OSRM to render polyline path
    const handleCalculateRoute = async (tech, job, lat, lng) => {
        const liveLoc = fleetLocations.find(l => l.technician_id === tech.id);
        if (!liveLoc || !liveLoc.latitude || !liveLoc.longitude) return;

        // If clicking the same tech route that is already displayed, toggle it off
        if (activeRoute && activeRoute.techId === tech.id && activeRoute.jobId === job.id) {
            setActiveRoute(null);
            return;
        }

        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${liveLoc.longitude},${liveLoc.latitude};${lng},${lat}?geometries=geojson&overview=full`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.code === 'Ok' && data.routes?.length > 0) {
                const routeData = data.routes[0];
                const coords = routeData.geometry.coordinates.map(([rlng, rlat]) => [rlat, rlng]);
                setActiveRoute({
                    coords,
                    techId: tech.id,
                    jobId: job.id
                });
            }
        } catch (err) {
            console.error('OSRM path drawing failed:', err);
        }
    };

    // Group jobs by property coordinates
    const propertiesGroup = useMemo(() => {
        if (!showCustomersLayer) return [];
        const groups = {};
        jobs.forEach(job => {
            const coords = getJobCoordinates(job);
            if (!coords) return;
            const propId = job.property_id || job.property?.id || `${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;
            if (!groups[propId]) {
                groups[propId] = {
                    id: propId,
                    lat: coords.lat,
                    lng: coords.lng,
                    property: job.property,
                    customer: job.customer,
                    customerName: job.customer_name || job.customer?.name || 'Customer',
                    jobs: []
                };
            }
            groups[propId].jobs.push(job);
        });
        return Object.values(groups);
    }, [jobs, showCustomersLayer]);

    // Group suppliers that have coordinates
    const geocodedSuppliers = useMemo(() => {
        if (!showSuppliersLayer) return [];
        return suppliers.map(s => {
            const coords = getSupplierCoordinates(s);
            if (!coords) return null;
            return { ...s, coords };
        }).filter(Boolean);
    }, [suppliers, showSuppliersLayer]);

    // Handle technician assignment from popup
    const handleAssign = async (job, tech) => {
        if (!onUpdateJob) return;
        const confirmChange = window.confirm(`Assign job ${job.job_number} to ${tech.name}?`);
        if (!confirmChange) return;

        await onUpdateJob({
            ...job,
            technician_id: tech.id,
            technician_name: tech.name,
            status: job.status === 'new_job_request' ? 'scheduled' : job.status
        });
    };

    return (
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            {/* Global dark styling overrides for Leaflet popups */}
            <style dangerouslySetInnerHTML={{ __html: `
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
            ` }} />

            {/* Map Container */}
            <MapContainer
                center={[19.117, 72.905]} // Default Mumbai area
                zoom={12}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                scrollWheelZoom={true}
            >
                {/* Dynamically Swap Google base map layers */}
                <TileLayer
                    key={mapViewType}
                    url={
                        mapViewType === 'satellite' ? "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" :
                        mapViewType === 'hybrid' ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" :
                        mapViewType === 'terrain' ? "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}" :
                        mapViewType === 'dark' ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" :
                        "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                    }
                    attribution={mapViewType === 'dark' ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' : '&copy; Google Maps'}
                />

                <MapCenterController groups={propertiesGroup} />
                <MapInteractionController activeRoute={activeRoute} />

                {/* Polyline Route Overlay */}
                {activeRoute?.coords && (
                    <>
                        <Polyline 
                            positions={activeRoute.coords} 
                            pathOptions={{ color: 'rgba(56, 189, 248, 0.3)', weight: 9, lineCap: 'round' }} 
                        />
                        <Polyline 
                            positions={activeRoute.coords} 
                            pathOptions={{ color: '#0ea5e9', weight: 4, lineCap: 'round', dashArray: '1, 8' }} 
                        />
                    </>
                )}

                {/* Customer Properties Markers */}
                {propertiesGroup.map(group => {
                    const { lat, lng, customerName, jobs: propertyJobs } = group;
                    const representativeJob = propertyJobs[0];

                    return (
                        <Marker
                            key={`${group.id}-${custMarkerType}`}
                            position={[lat, lng]}
                            icon={getCustomerIcon(representativeJob)}
                            eventHandlers={{
                                click: () => {
                                    if (autoExpandSingleJob && propertyJobs.length === 1) {
                                        setExpandedJobId(representativeJob.id);
                                        handleCalculateDistances(lat, lng, representativeJob.id);
                                    } else {
                                        setExpandedJobId(null);
                                    }
                                    setActiveRoute(null);
                                }
                            }}
                        >
                            <Tooltip direction="top" offset={[0, -18]}>
                                <div>
                                    <span style={{ fontWeight: 600 }}>{customerName}</span> ({propertyJobs.length} {propertyJobs.length === 1 ? 'job' : 'jobs'})
                                </div>
                            </Tooltip>

                            <Popup maxWidth={320} onClose={() => setActiveRoute(null)}>
                                <div style={{ minWidth: '270px', color: '#f8fafc', fontFamily: 'inherit', maxHeight: '340px', overflowY: 'auto' }}>
                                    {/* Property Header */}
                                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '8px' }}>
                                        <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8', margin: 0 }}>{customerName}</h4>
                                        {group.property && (
                                            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.3 }}>
                                                📍 {[group.property.flat_number, group.property.building_name, group.property.address].filter(Boolean).join(', ')}
                                            </p>
                                        )}
                                    </div>

                                    {/* Jobs List at Property */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {propertyJobs.map(job => {
                                            const isExpanded = expandedJobId === job.id;
                                            const isAssigned = !!job.technician_id;

                                            return (
                                                <div key={job.id} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                                    {/* Job Accordion Header */}
                                                    <div 
                                                        onClick={() => {
                                                            const nextVal = isExpanded ? null : job.id;
                                                            setExpandedJobId(nextVal);
                                                            setActiveRoute(null);
                                                            if (nextVal) {
                                                                handleCalculateDistances(lat, lng, job.id);
                                                            }
                                                        }}
                                                        style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: isExpanded ? 'rgba(56,189,248,0.12)' : 'transparent', transition: 'background-color 0.2s' }}
                                                    >
                                                        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '70%' }}>
                                                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc' }}>{job.job_number}</span>
                                                            <span style={{ fontSize: '10px', color: '#cbd5e1', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{job.category || job.appliance || 'Service Job'}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{
                                                                fontSize: '9px',
                                                                padding: '1px 5px',
                                                                borderRadius: '10px',
                                                                backgroundColor: isAssigned ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                                                color: isAssigned ? '#10b981' : '#ef4444',
                                                                fontWeight: 700,
                                                                textTransform: 'capitalize'
                                                            }}>{job.status.replace(/_/g, ' ')}</span>
                                                            <span style={{ fontSize: '9px', color: '#94a3b8' }}>{isExpanded ? '▼' : '▶'}</span>
                                                        </div>
                                                    </div>

                                                    {/* Expanded details */}
                                                    {isExpanded && (
                                                        <div style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(15,23,42,0.6)' }}>
                                                            <p style={{ fontSize: '11px', color: '#f1f5f9', margin: '0 0 8px 0', lineHeight: '1.4', fontWeight: 500 }}>
                                                                {job.description || 'No description provided.'}
                                                            </p>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px', color: '#94a3b8', marginBottom: '10px' }}>
                                                                <div>📅 Scheduled: <span style={{ color: '#cbd5e1' }}>{job.scheduled_date || job.dueDate || 'N/A'}</span></div>
                                                                <div>🔧 Current Tech: <strong style={{ color: isAssigned ? '#fbbf24' : '#ef4444' }}>{job.technician_name || 'Unassigned'}</strong></div>
                                                            </div>

                                                            {/* Proximity calculations */}
                                                            <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                                                                <h5 style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 6px 0', letterSpacing: '0.5px' }}>
                                                                    Assign Technician
                                                                </h5>

                                                                {loadingDistances && activeJobId === job.id ? (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#38bdf8', padding: '6px 0' }}>
                                                                        <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Calculating Google routes...
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                                        {activeJobId === job.id && Object.keys(distances).length > 0 ? (
                                                                            technicians
                                                                                .filter(t => t.is_active !== false) // ACTIVE ONLY dropdown list
                                                                                .map(t => ({
                                                                                    ...t,
                                                                                    distInfo: distances[t.id]
                                                                                }))
                                                                                .sort((a, b) => {
                                                                                    const aHas = a.distInfo?.hasLocation ? 1 : 0;
                                                                                    const bHas = b.distInfo?.hasLocation ? 1 : 0;
                                                                                    if (aHas !== bHas) return bHas - aHas;
                                                                                    // If both have location, sort by straight distance
                                                                                    if (aHas && bHas) {
                                                                                        return a.straightDist - b.straightDist;
                                                                                    }
                                                                                    return 0;
                                                                                })
                                                                                .map(t => {
                                                                                    const distInfo = t.distInfo;
                                                                                    const isCurrent = job.technician_id === t.id;
                                                                                    const isShowingRoute = activeRoute && activeRoute.techId === t.id && activeRoute.jobId === job.id;
                                                                                    const hasLoc = distInfo?.hasLocation;

                                                                                    return (
                                                                                        <div 
                                                                                            key={t.id} 
                                                                                            onClick={() => {
                                                                                                if (hasLoc && enableRoutePathHighlight) handleCalculateRoute(t, job, lat, lng);
                                                                                            }}
                                                                                            style={{ 
                                                                                                display: 'flex', 
                                                                                                alignItems: 'center', 
                                                                                                justifyContent: 'space-between', 
                                                                                                padding: '4px 6px', 
                                                                                                borderRadius: '4px', 
                                                                                                backgroundColor: isShowingRoute ? 'rgba(14, 165, 233, 0.15)' : 'rgba(255,255,255,0.03)', 
                                                                                                border: isShowingRoute ? '1px solid rgba(14, 165, 233, 0.4)' : '1px solid rgba(255,255,255,0.05)',
                                                                                                cursor: hasLoc && enableRoutePathHighlight ? 'pointer' : 'default',
                                                                                                transition: 'all 0.15s'
                                                                                            }}
                                                                                            title={hasLoc && enableRoutePathHighlight ? "Click to view driving route on map" : hasLoc ? "Routing calculations disabled" : "Live location unavailable"}
                                                                                        >
                                                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>{t.name}</span>
                                                                                                <span style={{ fontSize: '11px', color: hasLoc ? '#38bdf8' : '#94a3b8', fontWeight: 600 }}>
                                                                                                    {hasLoc ? `🚗 ${distInfo.distance} (${distInfo.duration})` : '🚗 Location Unavailable'} {isShowingRoute ? '🗺️' : ''}
                                                                                                </span>
                                                                                            </div>
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleAssign(job, t);
                                                                                                }}
                                                                                                disabled={isCurrent}
                                                                                                style={{
                                                                                                    padding: '3px 8px',
                                                                                                    fontSize: '11px',
                                                                                                    fontWeight: 800,
                                                                                                    borderRadius: '3px',
                                                                                                    border: 'none',
                                                                                                    cursor: isCurrent ? 'default' : 'pointer',
                                                                                                    backgroundColor: isCurrent ? 'rgba(16,185,129,0.15)' : '#38bdf8',
                                                                                                    color: isCurrent ? '#10b981' : '#0f172a'
                                                                                                }}
                                                                                            >
                                                                                                {isCurrent ? 'Current' : 'Assign'}
                                                                                            </button>
                                                                                        </div>
                                                                                    );
                                                                                })
                                                                        ) : (
                                                                            <div style={{ fontSize: '10px', color: '#94a3b8', padding: '4px 0' }}>
                                                                                No technicians available.
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Supplier Markers Overlay */}
                {geocodedSuppliers.map(supplier => {
                    const { lat, lng } = supplier.coords;

                    return (
                        <Marker
                            key={`${supplier.id}-${supplierMarkerType}`}
                            position={[lat, lng]}
                            icon={getSupplierIcon(supplier)}
                        >
                            <Tooltip direction="top" offset={[0, -16]}>
                                <div>
                                    <span style={{ fontWeight: 600 }}>{supplier.name}</span> (Supplier)
                                </div>
                            </Tooltip>

                            <Popup>
                                <div style={{ fontSize: '12px', color: '#cbd5e1', fontFamily: 'inherit', minWidth: '180px' }}>
                                    <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 800, color: '#22c55e' }}>{supplier.name}</h4>
                                    <div><strong>Contact:</strong> {supplier.contactPerson || 'N/A'}</div>
                                    <div><strong>Phone:</strong> {supplier.mobile || supplier.phone || 'N/A'}</div>
                                    {supplier.customerDescription && (
                                        <div style={{ marginTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '6px', color: '#94a3b8', fontSize: '11px', lineHeight: 1.3 }}>
                                            <strong>Supplies / Notes:</strong><br />
                                            {supplier.customerDescription}
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Technician Live Location Markers Overlay */}
                {showTechniciansLayer && fleetLocations.map(loc => {
                    const tech = technicians.find(t => t.id === loc.technician_id);
                    if (!tech || tech.is_active === false) return null; // Hide inactive/fired technicians from map

                    return (
                        <Marker
                            key={`${loc.technician_id}-${techMarkerType}`}
                            position={[loc.latitude, loc.longitude]}
                            icon={getTechIcon(tech)}
                        >
                            <Tooltip direction="top" offset={[0, -16]}>
                                <div>
                                    <span style={{ fontWeight: 600 }}>{tech.name}</span> (Technician)
                                </div>
                            </Tooltip>

                            <Popup>
                                <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 700, color: '#eab308' }}>{tech.name}</h4>
                                    <div><strong>Status:</strong> {loc.is_on_job ? 'On Job 🔧' : 'Available 🟢'}</div>
                                    {loc.battery_level !== undefined && <div><strong>Battery:</strong> {loc.battery_level}%</div>}
                                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                                        Last seen: {new Date(loc.last_seen).toLocaleTimeString()}
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
