'use client'

import { useState, useEffect } from 'react';
import { Save, Layers, MapPin, Eye, Settings, HelpCircle, ToggleLeft, ToggleRight } from 'lucide-react';

export default function MapSettingsTab() {
    // Default settings
    const [settings, setSettings] = useState({
        mapViewType: 'roadmap',
        custMarkerType: 'circle',
        techMarkerType: 'wrench',
        supplierMarkerType: 'pin',
        autoExpandSingleJob: true,
        enableRoutePathHighlight: true,
        showCustomersLayer: true,
        showTechniciansLayer: true,
        showSuppliersLayer: true
    });

    const [activeSubTab, setActiveSubTab] = useState('jobs-map');

    // Load settings from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const loaded = {
                mapViewType: localStorage.getItem('mapViewType') || 'roadmap',
                custMarkerType: localStorage.getItem('custMarkerType') || 'circle',
                techMarkerType: localStorage.getItem('techMarkerType') || 'wrench',
                supplierMarkerType: localStorage.getItem('supplierMarkerType') || 'pin',
                autoExpandSingleJob: localStorage.getItem('autoExpandSingleJob') !== 'false',
                enableRoutePathHighlight: localStorage.getItem('enableRoutePathHighlight') !== 'false',
                showCustomersLayer: localStorage.getItem('showCustomersLayer') !== 'false',
                showTechniciansLayer: localStorage.getItem('showTechniciansLayer') !== 'false',
                showSuppliersLayer: localStorage.getItem('showSuppliersLayer') !== 'false'
            };
            setSettings(loaded);
        }
    }, []);

    const handleChange = (key, value) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSave = () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('mapViewType', settings.mapViewType);
            localStorage.setItem('custMarkerType', settings.custMarkerType);
            localStorage.setItem('techMarkerType', settings.techMarkerType);
            localStorage.setItem('supplierMarkerType', settings.supplierMarkerType);
            localStorage.setItem('autoExpandSingleJob', String(settings.autoExpandSingleJob));
            localStorage.setItem('enableRoutePathHighlight', String(settings.enableRoutePathHighlight));
            localStorage.setItem('showCustomersLayer', String(settings.showCustomersLayer));
            localStorage.setItem('showTechniciansLayer', String(settings.showTechniciansLayer));
            localStorage.setItem('showSuppliersLayer', String(settings.showSuppliersLayer));
            
            alert('✅ Map settings saved successfully! They will apply immediately on the map views.');
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: '#f1f5f9', fontFamily: 'inherit' }}>
            {/* Header section */}
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>Map Configuration Settings</h2>
                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>Configure view types, marker styles, overlays and routing behaviors for map tabs</p>
                </div>
                <button
                    onClick={handleSave}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '14px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                    }}
                >
                    <Save size={16} /> Save Map Settings
                </button>
            </div>

            {/* Sub-tabs menu */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px', gap: '8px' }}>
                <button
                    onClick={() => setActiveSubTab('jobs-map')}
                    style={{
                        padding: '10px 16px',
                        fontSize: '14px',
                        fontWeight: 700,
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: activeSubTab === 'jobs-map' ? '#38bdf8' : '#94a3b8',
                        borderBottom: activeSubTab === 'jobs-map' ? '2px solid #38bdf8' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    Jobs Tab Map Settings
                </button>
            </div>

            {/* Grid Container */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', flex: 1, overflowY: 'auto', paddingBottom: '32px' }}>
                
                {/* Left column: Configurations */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Map Layers Toggles Card */}
                    <div style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Layers size={18} /> Active Map Overlay Layers
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Customers toggle */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>Show Customers Layer</span>
                                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Overlay customer property pins on the map</p>
                                </div>
                                <button 
                                    onClick={() => handleChange('showCustomersLayer', !settings.showCustomersLayer)}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: settings.showCustomersLayer ? '#10b981' : '#64748b' }}
                                >
                                    {settings.showCustomersLayer ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                                </button>
                            </div>

                            {/* Technicians toggle */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '14px' }}>
                                <div>
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>Show Technicians Layer</span>
                                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Overlay live tracking pins for active technicians</p>
                                </div>
                                <button 
                                    onClick={() => handleChange('showTechniciansLayer', !settings.showTechniciansLayer)}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: settings.showTechniciansLayer ? '#10b981' : '#64748b' }}
                                >
                                    {settings.showTechniciansLayer ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                                </button>
                            </div>

                            {/* Suppliers toggle */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '14px' }}>
                                <div>
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>Show Suppliers Layer</span>
                                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Overlay spare parts suppliers for route alignment checks</p>
                                </div>
                                <button 
                                    onClick={() => handleChange('showSuppliersLayer', !settings.showSuppliersLayer)}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: settings.showSuppliersLayer ? '#10b981' : '#64748b' }}
                                >
                                    {settings.showSuppliersLayer ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* View type & style settings */}
                    <div style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Settings size={18} /> Marker Styles & Layer Views
                        </h3>

                        {/* Map Layer View type */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1' }}>Google Maps Base Layer:</label>
                            <select
                                value={settings.mapViewType}
                                onChange={(e) => handleChange('mapViewType', e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    backgroundColor: '#0f172a',
                                    border: '1px solid #334155',
                                    color: '#f8fafc',
                                    fontSize: '13px',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="roadmap">Google Roadmap (Standard Map)</option>
                                <option value="satellite">Google Satellite (Imagery view)</option>
                                <option value="hybrid">Google Hybrid (Satellite + Road Labels)</option>
                                <option value="terrain">Google Terrain (Topography & Shading)</option>
                            </select>
                        </div>

                        {/* Customers marker dropdown */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1' }}>Customer Marker Design:</label>
                            <select
                                value={settings.custMarkerType}
                                onChange={(e) => handleChange('custMarkerType', e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    backgroundColor: '#0f172a',
                                    border: '1px solid #334155',
                                    color: '#f8fafc',
                                    fontSize: '13px',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="circle">Photo/Initials Circle (Standard)</option>
                                <option value="compact-pin">Compact Map Pin (Clean blue pin with initials)</option>
                                <option value="pin">Standard Map Pin (Larger blue pin with initials)</option>
                                <option value="compact">Compact Dot (Minimized marker dots)</option>
                            </select>
                        </div>

                        {/* Technicians marker dropdown */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1' }}>Technician Marker Design:</label>
                            <select
                                value={settings.techMarkerType}
                                onChange={(e) => handleChange('techMarkerType', e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    backgroundColor: '#0f172a',
                                    border: '1px solid #334155',
                                    color: '#f8fafc',
                                    fontSize: '13px',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="wrench">Wrench Circle (Standard yellow badge)</option>
                                <option value="pin">Standard Map Pin (Orange pin with initials)</option>
                                <option value="avatar">Tech Initials Circle (Initials only circle)</option>
                            </select>
                        </div>

                        {/* Suppliers marker dropdown */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1' }}>Supplier Marker Design:</label>
                            <select
                                value={settings.supplierMarkerType}
                                onChange={(e) => handleChange('supplierMarkerType', e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    backgroundColor: '#0f172a',
                                    border: '1px solid #334155',
                                    color: '#f8fafc',
                                    fontSize: '13px',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="pin">Standard Map Pin (Green pin with initials)</option>
                                <option value="circle">Initials Circle (Green circle badge)</option>
                                <option value="compact">Compact Dot (Minimized green dot)</option>
                            </select>
                        </div>
                    </div>

                    {/* Accordion behaviors card */}
                    <div style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MapPin size={18} /> Popup Accordion & Interactions
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Autoexpand toggle */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>Auto-Expand Single Jobs</span>
                                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Immediately open details and proximity routing when property has only 1 job</p>
                                </div>
                                <button 
                                    onClick={() => handleChange('autoExpandSingleJob', !settings.autoExpandSingleJob)}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: settings.autoExpandSingleJob ? '#10b981' : '#64748b' }}
                                >
                                    {settings.autoExpandSingleJob ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                                </button>
                            </div>

                            {/* OSRM Routing toggle */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '14px' }}>
                                <div>
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>Enable Polyline Routing Calculations</span>
                                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Calculate road route and render paths on map on technician clicks</p>
                                </div>
                                <button 
                                    onClick={() => handleChange('enableRoutePathHighlight', !settings.enableRoutePathHighlight)}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: settings.enableRoutePathHighlight ? '#10b981' : '#64748b' }}
                                >
                                    {settings.enableRoutePathHighlight ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right column: Explanatory Previews */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <HelpCircle size={16} color="#38bdf8" /> Map Legends & Colors
                        </h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', color: '#cbd5e1' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#3b82f6', border: '1.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '9px', color: '#fff' }}>C</div>
                                <div>
                                    <strong style={{ color: '#38bdf8' }}>Customers (Blue):</strong>
                                    <span style={{ display: 'block', color: '#94a3b8', fontSize: '10px' }}>Represents job properties. Stacked lists support multiple jobs per location.</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fef08a', border: '1.5px solid #eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>🔧</div>
                                <div>
                                    <strong style={{ color: '#eab308' }}>Technicians (Yellow/Orange):</strong>
                                    <span style={{ display: 'block', color: '#94a3b8', fontSize: '10px' }}>Represents technicians live locations. Used to calculate proximity routes.</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#22c55e', border: '1.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '9px', color: '#fff' }}>S</div>
                                <div>
                                    <strong style={{ color: '#22c55e' }}>Suppliers (Green):</strong>
                                    <span style={{ display: 'block', color: '#94a3b8', fontSize: '10px' }}>Represents parts vendor shops, allowing dispatch alignment to pick up parts on-route.</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.03)', border: '1px dashed rgba(56, 189, 248, 0.15)', borderRadius: '12px', padding: '20px', fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                        💡 <strong>Real-time Apply:</strong> Map configurations are fetched dynamically on map tab mount. Swapping between settings will apply the next time you open the <strong>Jobs Tab &gt; Map View</strong>.
                    </div>
                </div>

            </div>
        </div>
    );
}
