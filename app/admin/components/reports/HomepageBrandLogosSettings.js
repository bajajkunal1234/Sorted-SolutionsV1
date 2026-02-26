'use client';

import { useState, useEffect } from 'react';
import { Save, AlertCircle, Loader2 } from 'lucide-react';

export default function HomepageBrandLogosSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Configuration state
    const [config, setConfig] = useState({
        title: 'Brands We Serve',
        subtitle: 'Trusted by leading appliance manufacturers',
        selectedBrandIds: null // null = all brands, [] = none (hidden), [ids] = specific
    });

    // Available global brands
    const [availableBrands, setAvailableBrands] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch available brands from Global Library
            const brandsRes = await fetch('/api/settings/brand-logos');
            const brandsData = await brandsRes.json();
            if (brandsData.success) {
                setAvailableBrands(brandsData.data || []);
            }

            // 2. Fetch current homepage brand configuration
            const configRes = await fetch('/api/settings/section-configs?id=homepage-brand-logos');
            if (configRes.ok) {
                const configData = await configRes.json();
                if (configData.success && configData.data?.config) {
                    setConfig({
                        title: configData.data.config.title || 'Brands We Serve',
                        subtitle: configData.data.config.subtitle || '',
                        selectedBrandIds: configData.data.config.selectedBrandIds || null
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching homepage brand logos settings:', error);
            setMessage({ type: 'error', text: 'Failed to load configuration.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('/api/settings/section-configs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: 'homepage-brand-logos',
                    config: config
                })
            });

            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: 'Brand Logos configuration saved successfully!' });
                setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            } else {
                throw new Error(data.message || 'Failed to save');
            }
        } catch (error) {
            console.error('Error saving:', error);
            setMessage({ type: 'error', text: error.message || 'Failed to save configuration.' });
        } finally {
            setSaving(false);
        }
    };

    const toggleBrandSelection = (brandId) => {
        // If currently null (all selected), start with all selected minus this one
        if (config.selectedBrandIds === null) {
            const allIds = availableBrands.map(b => b.id);
            setConfig({ ...config, selectedBrandIds: allIds.filter(id => id !== brandId) });
            return;
        }

        // Toggle logic for array
        const isSelected = config.selectedBrandIds.includes(brandId);
        let newSelection;

        if (isSelected) {
            newSelection = config.selectedBrandIds.filter(id => id !== brandId);
        } else {
            newSelection = [...config.selectedBrandIds, brandId];
        }

        setConfig({ ...config, selectedBrandIds: newSelection });
    };

    const selectAll = () => setConfig({ ...config, selectedBrandIds: null });
    const deselectAll = () => setConfig({ ...config, selectedBrandIds: [] });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    const isAllSelected = config.selectedBrandIds === null;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium text-gray-900">Homepage Brand Logos Section</h3>
                    <p className="text-sm text-gray-500">Configure the auto-scrolling marquee of brands shown on the homepage.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                </button>
            </div>

            {message.text && (
                <div className={`p-4 rounded-md flex items-center gap-2 ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    <AlertCircle className="w-5 h-5" />
                    <span>{message.text}</span>
                </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                {/* Titles Configuration */}
                <div className="space-y-4">
                    <h4 className="text-base font-medium text-gray-900 border-b pb-2">Section Titles</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Section Title
                            </label>
                            <input
                                type="text"
                                value={config.title}
                                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., Brands We Serve"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Section Subtitle
                            </label>
                            <input
                                type="text"
                                value={config.subtitle}
                                onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., Trusted by leading appliance manufacturers"
                            />
                        </div>
                    </div>
                </div>

                {/* Brands Selection */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                        <h4 className="text-base font-medium text-gray-900">Select Brands to Display</h4>
                        <div className="flex gap-2">
                            <button
                                onClick={selectAll}
                                className={`text-sm px-3 py-1 rounded-md border ${isAllSelected ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                            >
                                Select All (Show All)
                            </button>
                            <button
                                onClick={deselectAll}
                                className={`text-sm px-3 py-1 rounded-md border ${!isAllSelected && config.selectedBrandIds?.length === 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                            >
                                Clear All (Hide Section)
                            </button>
                        </div>
                    </div>

                    <p className="text-sm text-gray-500 mb-4">
                        Select which logos from your Global Brand Library should scroll on the homepage. If "Select All" is active, any new brands added to the library will automatically appear here.
                    </p>

                    {availableBrands.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                            No brands found in the Global Library. Please add logos there first.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {availableBrands.map(brand => {
                                const isSelected = isAllSelected || (config.selectedBrandIds && config.selectedBrandIds.includes(brand.id));

                                return (
                                    <div
                                        key={brand.id}
                                        onClick={() => toggleBrandSelection(brand.id)}
                                        className={`relative border rounded-lg p-2 cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50 opacity-60'}`}
                                    >
                                        <div className="aspect-[3/2] flex items-center justify-center p-2 mb-2 bg-white rounded border border-gray-100">
                                            {brand.logo_url ? (
                                                <img
                                                    src={brand.logo_url}
                                                    alt={brand.name}
                                                    className="max-w-full max-h-full object-contain"
                                                />
                                            ) : (
                                                <span className="text-xs font-semibold text-gray-400">{brand.name}</span>
                                            )}
                                        </div>
                                        <p className="text-xs font-medium text-center truncate text-gray-700">{brand.name}</p>

                                        {/* Checkmark overlay */}
                                        {isSelected && (
                                            <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-0.5 shadow-sm">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
