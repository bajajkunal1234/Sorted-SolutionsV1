'use client';

import { useState, useEffect } from 'react';
import { Save, AlertCircle, Loader2, Plus, Trash2, ArrowUp, ArrowDown, Image as ImageIcon } from 'lucide-react';

export default function CustomerAppSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Configuration state for customer app banners
    const [config, setConfig] = useState({
        banners: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const configRes = await fetch('/api/settings/section-configs?id=customer-app-banners');
            if (configRes.ok) {
                const configData = await configRes.json();
                if (configData.success && configData.data?.config) {
                    setConfig({
                        banners: configData.data.config.banners || []
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching customer app banners settings:', error);
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
                    id: 'customer-app-banners',
                    config: config
                })
            });

            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: 'Customer App Banners saved successfully!' });
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

    const addBanner = () => {
        setConfig({
            ...config,
            banners: [
                ...config.banners,
                { id: Date.now().toString(), title: 'New Banner', imageUrl: '', targetUrl: '', active: true }
            ]
        });
    };

    const removeBanner = (idToRemove) => {
        setConfig({
            ...config,
            banners: config.banners.filter(b => b.id !== idToRemove)
        });
    };

    const updateBanner = (id, field, value) => {
        setConfig({
            ...config,
            banners: config.banners.map(b => b.id === id ? { ...b, [field]: value } : b)
        });
    };

    const moveBanner = (index, direction) => {
        if ((direction === -1 && index === 0) || (direction === 1 && index === config.banners.length - 1)) return;
        
        const newBanners = [...config.banners];
        const temp = newBanners[index];
        newBanners[index] = newBanners[index + direction];
        newBanners[index + direction] = temp;
        
        setConfig({ ...config, banners: newBanners });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Customer App Banners</h3>
                    <p className="text-sm text-gray-500">Manage the promotional banners displayed on the customer app homepage.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                </button>
            </div>

            {message.text && (
                <div className={`p-4 rounded-md flex items-center gap-2 ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                    <AlertCircle className="w-5 h-5" />
                    <span>{message.text}</span>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                
                <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h4 className="text-base font-medium text-gray-900 dark:text-gray-100">Active Banners ({config.banners.length})</h4>
                    <button
                        onClick={addBanner}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add Banner
                    </button>
                </div>

                {config.banners.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                        <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm font-medium">No banners added yet.</p>
                        <p className="text-xs text-gray-400 mt-1">Click "Add Banner" to create your first app banner.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {config.banners.map((banner, index) => (
                            <div key={banner.id} className="relative flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg group hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                                
                                {/* Ordering Controls */}
                                <div className="flex flex-col gap-1 justify-center border-r border-gray-200 dark:border-gray-700 pr-3">
                                    <button 
                                        onClick={() => moveBanner(index, -1)}
                                        disabled={index === 0}
                                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                                        title="Move Up"
                                    >
                                        <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => moveBanner(index, 1)}
                                        disabled={index === config.banners.length - 1}
                                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                                        title="Move Down"
                                    >
                                        <ArrowDown className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Banner Details */}
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    
                                    {/* Image Preview Area */}
                                    <div className="md:col-span-1 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-900 relative aspect-[21/9]">
                                        {banner.imageUrl ? (
                                            <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                                <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                                                <span className="text-xs">No Image Provided</span>
                                            </div>
                                        )}
                                        
                                        {!banner.active && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px]">
                                                <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">INACTIVE</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Edit Fields */}
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Banner Title (Internal)</label>
                                            <input
                                                type="text"
                                                value={banner.title}
                                                onChange={(e) => updateBanner(banner.id, 'title', e.target.value)}
                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="e.g. 90-Minute Service Promo"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Image URL</label>
                                            <input
                                                type="text"
                                                value={banner.imageUrl}
                                                onChange={(e) => updateBanner(banner.id, 'imageUrl', e.target.value)}
                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="https://example.com/banner.png"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Target Link (Optional)</label>
                                            <input
                                                type="text"
                                                value={banner.targetUrl}
                                                onChange={(e) => updateBanner(banner.id, 'targetUrl', e.target.value)}
                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="e.g. /services/ac-repair"
                                            />
                                        </div>
                                        
                                        <div className="flex items-center justify-between pt-1">
                                            <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={banner.active}
                                                    onChange={(e) => updateBanner(banner.id, 'active', e.target.checked)}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
                                                />
                                                Show on App Homepage
                                            </label>
                                            
                                            <button
                                                onClick={() => removeBanner(banner.id)}
                                                className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
                                                title="Delete Banner"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
