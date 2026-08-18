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

// Helper to create thin, small color-coded map pin icons (timeline style)
function createThinPinIcon(color, strokeColor = '#ffffff') {
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
}

// Helper to create small, thin color-coded map pin icons for suppliers (significantly smaller than customer markers)
function createSmallThinPinIcon(color, strokeColor = '#ffffff') {
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

// Helper to get consistent distinct colors for technicians (darker shades as requested)
function getTechColor(name) {
    const clean = String(name).toLowerCase();
    if (clean.includes('vinod') || clean.includes('gupta') || clean.includes('vg')) {
        return '#d97706'; // Dark yellow / orange
    }
    if (clean.includes('kunal') || clean.includes('bajaj') || clean.includes('kb')) {
        return '#047857'; // Dark green
    }
    // Dynamic color coding for other technicians based on name hashing
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
        hash = clean.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
        '#b91c1c', // dark red
        '#1d4ed8', // dark blue
        '#6d28d9', // dark purple
        '#a21caf', // dark magenta
        '#0369a1', // dark sky blue
        '#0f766e', // dark teal
        '#4d7c0f', // dark lime green
        '#c2410c'  // dark orange-red
    ];
    return colors[Math.abs(hash) % colors.length];
}

// Helper to format duration in hours and minutes
const formatDuration = (totalMins) => {
    if (!totalMins) return '0 mins';
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hrs > 0) {
        return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins > 0 ? `${mins} min${mins > 1 ? 's' : ''}` : ''}`.trim();
    }
    return `${mins} min${mins > 1 ? 's' : ''}`;
};

export default function JobsMapView({ jobs, onUpdateJob, onJobClick }) {
    const [technicians, setTechnicians] = useState([]);
    const [fleetLocations, setFleetLocations] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loadingTechs, setLoadingTechs] = useState(false);
    
    // Technician timeline tracking overlay states
    const [selectedTechTimeline, setSelectedTechTimeline] = useState(null);
    const [showIndicators, setShowIndicators] = useState(false);
    
    // Proximity distances loading state
    const [distances, setDistances] = useState({});
    const [loadingDistances, setLoadingDistances] = useState(false);
    const [activeJobId, setActiveJobId] = useState(null);
    const [expandedJobId, setExpandedJobId] = useState(null);

    // Active routing layer
    const [activeRoute, setActiveRoute] = useState(null);

    // Marker styling and layer visibility configurations
    const [custMarkerType, setCustMarkerType] = useState('thin');
    const [techMarkerType, setTechMarkerType] = useState('wrench');
    const [supplierMarkerType, setSupplierMarkerType] = useState('thin');
    const [mapViewType, setMapViewType] = useState('roadmap');
    const [autoExpandSingleJob, setAutoExpandSingleJob] = useState(true);
    const [enableRoutePathHighlight, setEnableRoutePathHighlight] = useState(true);
    const [showCustomersLayer, setShowCustomersLayer] = useState(true);
    const [showTechniciansLayer, setShowTechniciansLayer] = useState(true);
    const [showSuppliersLayer, setShowSuppliersLayer] = useState(true);

    const handleViewTypeChange = (type) => {
        setMapViewType(type);
        localStorage.setItem('mapViewType', type);
    };

    // Load configurations from DB with localStorage fallback
    useEffect(() => {
        const loadConfigs = async () => {
            try {
                const res = await fetch('/api/admin/website-settings?key=map_settings&t=' + Date.now());
                const result = await res.json();
                if (result.success && result.data && result.data.value) {
                    const val = result.data.value;
                    if (val.custMarkerType) setCustMarkerType(val.custMarkerType);
                    if (val.techMarkerType) setTechMarkerType(val.techMarkerType);
                    if (val.supplierMarkerType) setSupplierMarkerType(val.supplierMarkerType);
                    if (val.mapViewType) setMapViewType(val.mapViewType);
                    if (val.autoExpandSingleJob !== undefined) setAutoExpandSingleJob(val.autoExpandSingleJob !== false);
                    if (val.enableRoutePathHighlight !== undefined) setEnableRoutePathHighlight(val.enableRoutePathHighlight !== false);
                    if (val.showCustomersLayer !== undefined) setShowCustomersLayer(val.showCustomersLayer !== false);
                    if (val.showTechniciansLayer !== undefined) setShowTechniciansLayer(val.showTechniciansLayer !== false);
                    if (val.showSuppliersLayer !== undefined) setShowSuppliersLayer(val.showSuppliersLayer !== false);
                    return;
                }
            } catch (err) {
                console.error('Failed to load map settings from database, falling back to local storage:', err);
            }

            // Fallback to local storage
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
        };
        loadConfigs();
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
    const getCustomerIcon = (job, groupJobs = []) => {
        const name = job?.customer?.name || job?.customer_name || 'Customer';
        const img = job?.customer?.accountImage;
        const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
        const avatar = generateInitialsAvatar(name);

        if (custMarkerType === 'thin') {
            let color = '#3b82f6'; // Default blue (active & assigned)
            
            if (groupJobs.length > 0) {
                const allClosed = groupJobs.every(j => j.status === 'closed' || j.status === 'cancelled');
                const anyUnassignedActive = groupJobs.some(j => 
                    (j.status !== 'closed' && j.status !== 'cancelled') && 
                    (!j.technician_id || j.status === 'new_job_request' || j.status === 'booking_request')
                );
                
                if (allClosed) {
                    color = '#10b981'; // Green
                } else if (anyUnassignedActive) {
                    color = '#ef4444'; // Red
                }
            } else if (job) {
                const status = job.status;
                const isClosedOrCancelled = status === 'closed' || status === 'cancelled';
                const isUnassigned = !job.technician_id || status === 'new_job_request' || status === 'booking_request';
                
                if (isClosedOrCancelled) {
                    color = '#10b981';
                } else if (isUnassigned) {
                    color = '#ef4444';
                }
            }
            return createThinPinIcon(color);
        }

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
        const techColor = getTechColor(name);

        if (techMarkerType === 'pin') {
            const htmlContent = `<div style="position: relative; width: 34px; height: 42px;">
                <svg width="34" height="42" viewBox="0 0 34 42" fill="none" style="position: absolute; top:0; left:0; width:100%; height:100%;">
                  <path d="M17 0C7.6 0 0 7.6 0 17C0 29.7 17 42 17 42C17 42 34 29.7 34 17C34 7.6 26.4 0 17 0Z" fill="${techColor}"/>
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
                border: 2px solid #ffffff;
                background-color: ${techColor};
                color: #ffffff;
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

        // Default 'wrench' (now custom standing man silhouette badge) circle icon
        return L.divIcon({
            html: `<div style="position: relative; width: 24px; height: 28px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
                <svg width="24" height="28" viewBox="0 0 24 28" fill="none" style="display: block; width: 100%; height: 100%;">
                    <!-- Oval base -->
                    <ellipse cx="12" cy="24" rx="8" ry="3" fill="#facc15" stroke="#1e293b" stroke-width="2" />
                    <!-- Body -->
                    <path d="M 10.5 9 H 13.5 C 14 9, 14.5 9.5, 14.5 10 L 14.5 11.5 H 15.5 C 16 11.5, 16.5 12, 16.5 12.5 L 16.5 17.5 C 16.5 18, 16 18.5, 15.5 18.5 C 15 18.5, 14.5 18, 14.5 17.5 L 14.5 12.5 H 13.5 L 13.5 24 H 12.5 L 12.5 16 H 11.5 L 11.5 24 H 10.5 L 10.5 12.5 H 9.5 L 9.5 17.5 C 9.5 18, 9 18.5, 8.5 18.5 C 8 18.5, 7.5 18, 7.5 17.5 L 7.5 12.5 C 7.5 12, 8 11.5, 8.5 11.5 H 9.5 L 9.5 10 C 9.5 9.5, 10 9, 10.5 9 Z" fill="${techColor}" stroke="#1e293b" stroke-width="2" stroke-linejoin="round" />
                    <!-- Head -->
                    <circle cx="12" cy="5.5" r="3.5" fill="${techColor}" stroke="#1e293b" stroke-width="2" />
                </svg>
            </div>`,
            className: 'custom-tech-marker-wrench',
            iconSize: [24, 28],
            iconAnchor: [12, 28],
            popupAnchor: [0, -28]
        });
    };

    // Helper to build supplier markers dynamically based on selected style option
    const getSupplierIcon = (supplier) => {
        const name = supplier.name || 'Supplier';
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
            const htmlContent = `<div style="
                width: 10px;
                height: 10px;
                border-radius: 50%;
                border: 1.5px solid #ffffff;
                background-color: #15803d;
                box-shadow: 0 1px 4px rgba(0,0,0,0.4);
            "></div>`;

            return L.divIcon({
                html: htmlContent,
                className: 'custom-supplier-marker-compact',
                iconSize: [10, 10],
                iconAnchor: [5, 5],
                popupAnchor: [5, 0]
            });
        }

        // Default 'circle' initials avatar
        const htmlContent = `<div style="
            width: 26px;
            height: 26px;
            border-radius: 50%;
            border: 2px solid #ffffff;
            background-color: #15803d;
            color: #ffffff;
            font-size: 10px;
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
            iconSize: [26, 26],
            iconAnchor: [13, 13],
            popupAnchor: [13, 0]
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

    // Fetch and snap today's timeline for a technician
    const handleShowTodayTimeline = async (techId, techName) => {
        if (selectedTechTimeline && selectedTechTimeline.techId === techId) {
            // Toggle off if already showing this technician
            setSelectedTechTimeline(null);
            return;
        }

        // Set loading state
        setSelectedTechTimeline({ techId, loading: true });

        try {
            const todayStr = new Date(Date.now() + (3600000 * 5.5)).toISOString().split('T')[0]; // IST today
            const res = await fetch(`/api/admin/technician-location-history?technicianId=${techId}&date=${todayStr}`);
            const payload = await res.json();
            
            if (payload.success && payload.data) {
                const { routePath = [], stops = [] } = payload.data;
                
                let snapped = [];
                if (routePath.length > 1) {
                    try {
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
                        const osrmRes = await fetch(url);
                        const data = await osrmRes.json();
                        
                        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                            const coords = data.routes[0].geometry.coordinates;
                            snapped = coords.map(c => [c[1], c[0]]);
                        }
                    } catch (err) {
                        console.error("OSRM snapping failed in Admin map timeline view:", err);
                    }
                }

                if (snapped.length === 0) {
                    snapped = routePath.map(p => [p.lat, p.lng]);
                }

                // Calculate direction arrows along the path
                const arrows = [];
                if (routePath.length >= 2) {
                    let lastArrowPt = routePath[0];
                    for (let i = 1; i < routePath.length; i++) {
                        const pt1 = routePath[i - 1];
                        const pt2 = routePath[i];
                        const dist = getHaversineDistance(lastArrowPt.lat, lastArrowPt.lng, pt2.lat, pt2.lng) * 1000; // in meters
                        if (dist >= 60) {
                            const dLng = (pt2.lng - pt1.lng) * Math.PI / 180;
                            const lat1Rad = pt1.lat * Math.PI / 180;
                            const lat2Rad = pt2.lat * Math.PI / 180;
                            const y = Math.sin(dLng) * Math.cos(lat2Rad);
                            const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
                            let angle = Math.atan2(y, x) * 180 / Math.PI;
                            angle = (angle + 360) % 360;

                            const formattedTime = new Date(pt2.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            arrows.push({
                                id: `arrow-${techId}-${i}`,
                                position: [pt2.lat, pt2.lng],
                                angle: angle,
                                time: formattedTime
                            });
                            lastArrowPt = pt2;
                        }
                    }
                }

                setSelectedTechTimeline({
                    techId,
                    techName,
                    routePath,
                    stops,
                    snappedPath: snapped,
                    arrows,
                    loading: false
                });
            } else {
                setSelectedTechTimeline(null);
                alert("No location history found for this technician today.");
            }
        } catch (err) {
            console.error("Failed to load technician timeline on Admin map:", err);
            setSelectedTechTimeline(null);
            alert("Error loading timeline history.");
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
                .dark-map-tiles {
                    filter: grayscale(100%) invert(90%) brightness(95%) contrast(100%) !important;
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
                    className={mapViewType === 'dark' ? 'dark-map-tiles' : ''}
                    url={
                        mapViewType === 'satellite' ? "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" :
                        mapViewType === 'hybrid' ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" :
                        mapViewType === 'terrain' ? "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}" :
                        "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                    }
                    attribution='&copy; Google Maps'
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
                            icon={getCustomerIcon(representativeJob, propertyJobs)}
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
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onJobClick?.(job);
                                                                }}
                                                                style={{ 
                                                                    fontSize: '12px', 
                                                                    fontWeight: 800, 
                                                                    color: '#38bdf8', 
                                                                    background: 'none', 
                                                                    border: 'none', 
                                                                    padding: 0, 
                                                                    cursor: 'pointer',
                                                                    textDecoration: 'underline',
                                                                    textAlign: 'left'
                                                                }}
                                                                title="Open Job Details"
                                                            >
                                                                {job.job_number}
                                                            </button>
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
                                <div style={{ fontSize: '12px', color: '#cbd5e1', minWidth: '160px' }}>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 700, color: '#eab308' }}>{tech.name}</h4>
                                    <div><strong>Status:</strong> {loc.is_on_job ? 'On Job 🔧' : 'Available 🟢'}</div>
                                    {loc.battery_level !== undefined && <div><strong>Battery:</strong> {loc.battery_level}%</div>}
                                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                                        Last seen: {new Date(loc.last_seen).toLocaleTimeString()}
                                    </div>
                                    <div style={{ marginTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                                        <button
                                            onClick={() => handleShowTodayTimeline(tech.id, tech.name)}
                                            disabled={selectedTechTimeline?.techId === tech.id && selectedTechTimeline.loading}
                                            style={{
                                                width: '100%',
                                                padding: '5px 8px',
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                borderRadius: '4px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                backgroundColor: selectedTechTimeline?.techId === tech.id ? '#ef4444' : '#38bdf8',
                                                color: selectedTechTimeline?.techId === tech.id ? '#ffffff' : '#0f172a',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '4px',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {selectedTechTimeline?.techId === tech.id && selectedTechTimeline.loading ? (
                                                <>⌛ Loading...</>
                                            ) : selectedTechTimeline?.techId === tech.id ? (
                                                <>❌ Hide Today's Timeline</>
                                            ) : (
                                                <>🗺️ Show Today's Timeline</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Selected Technician Timeline Layer */}
                {selectedTechTimeline && !selectedTechTimeline.loading && (
                    <>
                        {/* 1. Snapped Path Polyline */}
                        {selectedTechTimeline.snappedPath && selectedTechTimeline.snappedPath.length > 1 && (
                            <>
                                <Polyline
                                    positions={selectedTechTimeline.snappedPath}
                                    pathOptions={{ color: 'rgba(14, 165, 233, 0.3)', weight: 8, lineCap: 'round' }}
                                />
                                <Polyline
                                    positions={selectedTechTimeline.snappedPath}
                                    pathOptions={{ color: '#0ea5e9', weight: 4, lineCap: 'round', dashArray: '1, 8' }}
                                />
                            </>
                        )}

                        {/* 2. Direction Arrows */}
                        {selectedTechTimeline.arrows && selectedTechTimeline.arrows.map(arrow => {
                            const arrowIconObj = new L.DivIcon({
                                className: 'custom-arrow-icon',
                                html: `<div style="transform: rotate(${arrow.angle}deg); font-size: 8px; color: #ffffff; width: 10px; height: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; cursor: pointer; text-shadow: 0px 0px 2px rgba(0,0,0,0.85); background: transparent; border: none;">▲</div>`,
                                iconSize: [10, 10],
                                iconAnchor: [5, 5]
                            });
                            return (
                                <Marker key={arrow.id} position={arrow.position} icon={arrowIconObj}>
                                    <Tooltip direction="top" offset={[0, -5]}>
                                        <span>Passed at: {arrow.time}</span>
                                    </Tooltip>
                                </Marker>
                            );
                        })}

                        {/* 3. Stops/Halts */}
                        {selectedTechTimeline.stops && selectedTechTimeline.stops.map((stop, i) => {
                            const stopIconObj = new L.DivIcon({
                                className: '',
                                html: `<div style="position: relative; width: 20px; height: 28px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.45));">
                                    <svg width="20" height="28" viewBox="0 0 20 28" fill="none" style="display: block; width: 100%; height: 100%;">
                                        <path d="M10 1C5.03 1 1 5.03 1 10c0 6.75 9 17 9 17s9-10.25 9-17c0-4.97-4.03-9-9-9z" fill="#64748b" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
                                    </svg>
                                </div>`,
                                iconSize: [20, 28],
                                iconAnchor: [10, 28],
                                popupAnchor: [0, -28]
                            });
                            return (
                                <Marker key={`stop-${selectedTechTimeline.techId}-${i}`} position={[stop.lat, stop.lng]} icon={stopIconObj}>
                                    <Popup>
                                        <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                                            <strong>Parking Stop #{i + 1}</strong><br />
                                            Duration: {formatDuration(stop.durationMinutes)}<br />
                                            Arrival: {new Date(stop.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}<br />
                                            Departure: {new Date(stop.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </>
                )}
            </MapContainer>

            {/* ── Selected Technician Timeline HUD Indicator ── */}
            {selectedTechTimeline && !selectedTechTimeline.loading && (
                <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    zIndex: 1000,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    backdropFilter: 'blur(8px)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '12px',
                    color: '#f8fafc'
                }}>
                    <div>
                        <span>Showing Timeline for <strong>{selectedTechTimeline.techName}</strong> (Today)</span>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                            🛣️ {selectedTechTimeline.routePath?.length || 0} pings | 🅿️ {selectedTechTimeline.stops?.length || 0} stops
                        </div>
                    </div>
                    <button
                        onClick={() => setSelectedTechTimeline(null)}
                        style={{
                            padding: '4px 8px',
                            backgroundColor: '#ef4444',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#ffffff',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '11px'
                        }}
                    >
                        Clear
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
                            <strong style={{ color: '#38bdf8', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Customers / Properties</strong>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '10px', height: '14px', backgroundColor: '#3b82f6', clipPath: 'polygon(50% 0%, 100% 35%, 100% 70%, 50% 100%, 0% 70%, 0% 35%)' }}></div>
                                    <span>Blue: Active / Assigned Job</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '10px', height: '14px', backgroundColor: '#ef4444', clipPath: 'polygon(50% 0%, 100% 35%, 100% 70%, 50% 100%, 0% 70%, 0% 35%)' }}></div>
                                    <span>Red: Active / Unassigned (Action Needed)</span>
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

                        {/* Technicians */}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                            <strong style={{ color: '#eab308', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Technician Live Location</strong>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '12px' }}>🧍</span>
                                    <span>Vinod Gupta (Dark Yellow/Orange Man)</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '12px' }}>🧍</span>
                                    <span>Kunal Bajaj (Dark Green Man)</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '12px' }}>🧍</span>
                                    <span>Other Techs (Custom Color Man on Yellow Base)</span>
                                </div>
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
        </div>
    );
}
