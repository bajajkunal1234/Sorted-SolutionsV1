'use client'

import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { User, Briefcase, Calendar, Loader2, Phone } from 'lucide-react';
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
    const [loadingTechs, setLoadingTechs] = useState(false);
    
    // Proximity distances loading state
    const [distances, setDistances] = useState({});
    const [loadingDistances, setLoadingDistances] = useState(false);
    const [activeJobId, setActiveJobId] = useState(null);
    const [expandedJobId, setExpandedJobId] = useState(null);

    // Marker styling customization states
    const [custMarkerType, setCustMarkerType] = useState('circle'); // 'circle' | 'pin' | 'compact'
    const [techMarkerType, setTechMarkerType] = useState('wrench'); // 'wrench' | 'pin' | 'avatar'

    // Fetch technicians and fleet locations on mount
    const fetchTechData = async () => {
        setLoadingTechs(true);
        try {
            const [techRes, fleetRes] = await Promise.all([
                techniciansAPI.getAll(),
                fetch('/api/admin/fleet-locations').then(res => res.json())
            ]);
            
            setTechnicians(techRes || []);
            if (fleetRes?.success) {
                setFleetLocations(fleetRes.data || []);
            }
        } catch (err) {
            console.error('Failed to load technician live coordinates:', err);
        } finally {
            setLoadingTechs(false);
        }
    };

    useEffect(() => {
        fetchTechData();
        const timer = setInterval(fetchTechData, 45000);
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
                     <svg width="34" height="42" viewBox="0 0 34 42" fill="none" style="position: absolute; top:0; left:0;">
                       <path d="M17 0C7.6 0 0 7.6 0 17C0 29.7 17 42 17 42C17 42 34 29.7 34 17C34 7.6 26.4 0 17 0Z" fill="#3b82f6"/>
                     </svg>
                     <div style="position: absolute; top: 4px; left: 7px; width: 20px; height: 20px; border-radius: 50%; overflow: hidden; border: 1px solid #fff;">
                       <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;" />
                     </div>
                   </div>`
                : `<div style="position: relative; width: 34px; height: 42px;">
                     <svg width="34" height="42" viewBox="0 0 34 42" fill="none" style="position: absolute; top:0; left:0;">
                       <path d="M17 0C7.6 0 0 7.6 0 17C0 29.7 17 42 17 42C17 42 34 29.7 34 17C34 7.6 26.4 0 17 0Z" fill="#3b82f6"/>
                     </svg>
                     <div style="position: absolute; top: 4px; left: 7px; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 8px; font-weight: 700; background-color: ${avatar.backgroundColor || '#1d4ed8'};">
                       ${initials}
                     </div>
                   </div>`;

            return L.divIcon({
                html: htmlContent,
                className: 'custom-customer-marker-pin',
                iconSize: [34, 42],
                iconAnchor: [17, 42],
                popupAnchor: [0, -42]
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
                popupAnchor: [0, -7]
            });
        }

        // Default 'circle' icon
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
            popupAnchor: [0, -17]
        });
    };

    // Helper to build technician markers dynamically based on selected style option
    const getTechIcon = (tech) => {
        const name = tech?.name || 'Technician';
        const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

        if (techMarkerType === 'pin') {
            const htmlContent = `<div style="position: relative; width: 34px; height: 42px;">
                <svg width="34" height="42" viewBox="0 0 34 42" fill="none" style="position: absolute; top:0; left:0;">
                  <path d="M17 0C7.6 0 0 7.6 0 17C0 29.7 17 42 17 42C17 42 34 29.7 34 17C34 7.6 26.4 0 17 0Z" fill="#eab308"/>
                </svg>
                <div style="position: absolute; top: 6px; left: 9px; font-size: 11px;">🔧</div>
              </div>`;

            return L.divIcon({
                html: htmlContent,
                className: 'custom-tech-marker-pin',
                iconSize: [34, 42],
                iconAnchor: [17, 42],
                popupAnchor: [0, -42]
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
                popupAnchor: [0, -16]
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
            popupAnchor: [0, -16]
        });
    };

    // Calculate real-road google distances for nearest 5 technicians
    const handleCalculateDistances = async (lat, lng, jobId) => {
        setActiveJobId(jobId);
        setLoadingDistances(true);
        setDistances({});

        const candidates = technicians
            .filter(t => t.is_active !== false)
            .map(tech => {
                const liveLoc = fleetLocations.find(l => l.technician_id === tech.id);
                if (!liveLoc || !liveLoc.latitude || !liveLoc.longitude) {
                    return { ...tech, straightDist: Infinity };
                }
                const dist = getHaversineDistance(
                    lat, lng,
                    liveLoc.latitude, liveLoc.longitude
                );
                return { 
                    ...tech, 
                    straightDist: dist, 
                    coords: `${liveLoc.latitude},${liveLoc.longitude}`,
                    isOnline: liveLoc.is_online
                };
            });

        // Filter and sort candidates
        candidates.sort((a, b) => a.straightDist - b.straightDist);
        const closestCandidates = candidates.slice(0, 5).filter(t => t.straightDist !== Infinity);

        const googleResults = {};
        await Promise.all(closestCandidates.map(async (tech) => {
            try {
                const res = await fetch(`/api/admin/google-distance?origin=${tech.coords}&destination=${lat},${lng}`);
                const data = await res.json();
                if (data.success) {
                    googleResults[tech.id] = {
                        distance: data.distance,
                        duration: data.duration,
                        isOnline: tech.isOnline
                    };
                }
            } catch (err) {
                console.error('Google Matrix computation failed:', err);
            }
        }));

        setDistances(googleResults);
        setLoadingDistances(false);
    };

    // Group jobs by property coordinates
    const propertiesGroup = useMemo(() => {
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
    }, [jobs]);

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

            {/* Custom Marker Option Dropdowns */}
            <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                backgroundColor: 'rgba(30, 41, 59, 0.85)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '10px 12px',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                width: '170px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Marker Styles</div>
                
                {/* Customer dropdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600 }}>Customers:</label>
                    <select
                        value={custMarkerType}
                        onChange={(e) => setCustMarkerType(e.target.value)}
                        style={{
                            padding: '4px 6px',
                            borderRadius: '5px',
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            color: '#f8fafc',
                            fontSize: '11px',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="circle">Photo/Initials Circle</option>
                        <option value="pin">Standard Map Pin</option>
                        <option value="compact">Compact Dot</option>
                    </select>
                </div>

                {/* Tech dropdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600 }}>Technicians:</label>
                    <select
                        value={techMarkerType}
                        onChange={(e) => setTechMarkerType(e.target.value)}
                        style={{
                            padding: '4px 6px',
                            borderRadius: '5px',
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            color: '#f8fafc',
                            fontSize: '11px',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="wrench">Wrench Circle</option>
                        <option value="pin">Standard Map Pin</option>
                        <option value="avatar">Tech Initials Circle</option>
                    </select>
                </div>
            </div>

            {/* Map Container */}
            <MapContainer
                center={[19.117, 72.905]} // Default Mumbai area
                zoom={12}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                    attribution='&copy; Google Maps'
                />

                <MapCenterController groups={propertiesGroup} />

                {/* Customer Properties Markers */}
                {propertiesGroup.map(group => {
                    const { lat, lng, customerName, jobs: propertyJobs } = group;
                    const representativeJob = propertyJobs[0];

                    return (
                        <Marker
                            key={group.id}
                            position={[lat, lng]}
                            icon={getCustomerIcon(representativeJob)}
                            eventHandlers={{
                                click: () => {
                                    if (propertyJobs.length === 1) {
                                        setExpandedJobId(representativeJob.id);
                                        handleCalculateDistances(lat, lng, representativeJob.id);
                                    } else {
                                        setExpandedJobId(null);
                                    }
                                }
                            }}
                        >
                            <Tooltip direction="top" offset={[0, -18]}>
                                <div>
                                    <span style={{ fontWeight: 600 }}>{customerName}</span> ({propertyJobs.length} {propertyJobs.length === 1 ? 'job' : 'jobs'})
                                </div>
                            </Tooltip>

                            <Popup maxWidth={320}>
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
                                                                        {Object.keys(distances).length > 0 && activeJobId === job.id ? (
                                                                            technicians
                                                                                .filter(t => distances[t.id])
                                                                                .map(t => {
                                                                                    const distInfo = distances[t.id];
                                                                                    const isCurrent = job.technician_id === t.id;
                                                                                    return (
                                                                                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                                                <span style={{ fontSize: '10px', fontWeight: 700, color: '#f8fafc' }}>{t.name}</span>
                                                                                                <span style={{ fontSize: '8px', color: '#38bdf8', fontWeight: 600 }}>🚗 {distInfo.distance} ({distInfo.duration})</span>
                                                                                            </div>
                                                                                            <button
                                                                                                onClick={() => handleAssign(job, t)}
                                                                                                disabled={isCurrent}
                                                                                                style={{
                                                                                                    padding: '2px 6px',
                                                                                                    fontSize: '9px',
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
                                                                                No technicians with active live location nearby.
                                                                            </div>
                                                                        )}

                                                                        {/* Other tech dropdown fallback */}
                                                                        <div style={{ marginTop: '4px' }}>
                                                                            <select
                                                                                onChange={(e) => {
                                                                                    const val = e.target.value;
                                                                                    if (!val) return;
                                                                                    const t = technicians.find(tech => tech.id === val);
                                                                                    if (t) handleAssign(job, t);
                                                                                    e.target.value = '';
                                                                                }}
                                                                                style={{
                                                                                    width: '100%',
                                                                                    padding: '4px',
                                                                                    borderRadius: '3px',
                                                                                    backgroundColor: '#0f172a',
                                                                                    border: '1px solid #334155',
                                                                                    color: '#f8fafc',
                                                                                    fontSize: '10px',
                                                                                    cursor: 'pointer',
                                                                                    outline: 'none'
                                                                                }}
                                                                            >
                                                                                <option value="">— Reassign to other tech —</option>
                                                                                {technicians
                                                                                    .filter(t => t.is_active !== false && t.id !== job.technician_id)
                                                                                    .map(t => (
                                                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                                                    ))
                                                                                }
                                                                            </select>
                                                                        </div>
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

                {/* Technician Live Location Markers */}
                {fleetLocations.map(loc => {
                    const tech = technicians.find(t => t.id === loc.technician_id);
                    if (!tech || tech.is_active === false) return null;

                    return (
                        <Marker
                            key={loc.technician_id}
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
