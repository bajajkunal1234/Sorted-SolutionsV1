'use client'

import { useState } from 'react';
import { Search, Plus, Trash2, Edit2, Save, X, Globe, Tag, FileText, Code } from 'lucide-react';

function SEOSettings() {
    const [metaTags, setMetaTags] = useState({
        homepage: {
            title: 'Sorted Solutions - Home Appliance Repair Services in Mumbai',
            description: 'Professional repair services for AC, Washing Machine, Refrigerator, Microwave & more. Same-day service across Mumbai. Book online now!',
            keywords: 'appliance repair mumbai, ac repair, washing machine repair, refrigerator repair, home service',
            ogTitle: 'Sorted Solutions - Expert Home Appliance Repair',
            ogDescription: 'Get your appliances fixed by certified technicians. Same-day service available.',
            ogImage: '/og-image-homepage.jpg'
        },
        servicePages: {
            titleTemplate: '{Service} Repair in {Location} | Sorted Solutions',
            descriptionTemplate: 'Professional {service} repair services in {location}. Certified technicians, genuine parts, 30-day warranty. Book now!',
            keywordsTemplate: '{service} repair {location}, {service} service, {service} technician'
        }
    });

    const [schemaMarkup, setSchemaMarkup] = useState({
        organization: {
            name: 'Sorted Solutions',
            url: 'https://www.sortedsolutions.in',
            logo: 'https://www.sortedsolutions.in/logo.png',
            contactPoint: {
                telephone: '+91-XXXXXXXXXX',
                contactType: 'customer service',
                areaServed: 'IN',
                availableLanguage: ['English', 'Hindi', 'Marathi']
            },
            sameAs: [
                'https://www.facebook.com/sortedsolutions',
                'https://www.instagram.com/sortedsolutions',
                'https://twitter.com/sortedsolutions'
            ]
        },
        localBusiness: {
            name: 'Sorted Solutions',
            address: {
                streetAddress: 'A138 Orchard Mall, Royal Palms',
                addressLocality: 'Goregaon East',
                addressRegion: 'Mumbai',
                postalCode: '400063',
                addressCountry: 'IN'
            },
            geo: {
                latitude: '19.1663',
                longitude: '72.8526'
            },
            priceRange: '₹₹',
            openingHours: 'Mo-Su 08:00-20:00'
        }
    });

    const [seoKeywords, setSeoKeywords] = useState([
        'AC repair Mumbai',
        'Washing machine repair',
        'Refrigerator service',
        'Microwave repair near me',
        'Home appliance repair',
        'Same day repair service',
        'Certified technician',
        'Appliance maintenance'
    ]);

    const [newKeyword, setNewKeyword] = useState('');
    const [editingSection, setEditingSection] = useState(null);

    const handleAddKeyword = () => {
        if (newKeyword.trim()) {
            setSeoKeywords([...seoKeywords, newKeyword.trim()]);
            setNewKeyword('');
        }
    };

    const handleRemoveKeyword = (index) => {
        setSeoKeywords(seoKeywords.filter((_, i) => i !== index));
    };

    const handleSaveAll = () => {
        // TODO: Save to backend
        alert('SEO settings saved successfully!');
    };

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                    SEO Settings
                </h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                    Manage meta tags, schema markup, and SEO keywords for better search engine visibility
                </p>
            </div>

            {/* Homepage Meta Tags */}
            <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#3b82f615',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Globe size={20} style={{ color: '#3b82f6' }} />
                    </div>
                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                        Homepage Meta Tags
                    </h4>
                </div>

                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Page Title *
                        </label>
                        <input
                            type="text"
                            value={metaTags.homepage.title}
                            onChange={(e) => setMetaTags({
                                ...metaTags,
                                homepage: { ...metaTags.homepage, title: e.target.value }
                            })}
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-sm)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)'
                            }}
                        />
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', margin: 'var(--spacing-xs) 0 0 0' }}>
                            {metaTags.homepage.title.length}/60 characters (optimal: 50-60)
                        </p>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Meta Description *
                        </label>
                        <textarea
                            value={metaTags.homepage.description}
                            onChange={(e) => setMetaTags({
                                ...metaTags,
                                homepage: { ...metaTags.homepage, description: e.target.value }
                            })}
                            rows={3}
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-sm)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)',
                                resize: 'vertical'
                            }}
                        />
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', margin: 'var(--spacing-xs) 0 0 0' }}>
                            {metaTags.homepage.description.length}/160 characters (optimal: 150-160)
                        </p>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Meta Keywords
                        </label>
                        <input
                            type="text"
                            value={metaTags.homepage.keywords}
                            onChange={(e) => setMetaTags({
                                ...metaTags,
                                homepage: { ...metaTags.homepage, keywords: e.target.value }
                            })}
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-sm)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Open Graph Title
                        </label>
                        <input
                            type="text"
                            value={metaTags.homepage.ogTitle}
                            onChange={(e) => setMetaTags({
                                ...metaTags,
                                homepage: { ...metaTags.homepage, ogTitle: e.target.value }
                            })}
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-sm)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Open Graph Description
                        </label>
                        <textarea
                            value={metaTags.homepage.ogDescription}
                            onChange={(e) => setMetaTags({
                                ...metaTags,
                                homepage: { ...metaTags.homepage, ogDescription: e.target.value }
                            })}
                            rows={2}
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-sm)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Open Graph Image URL
                        </label>
                        <input
                            type="text"
                            value={metaTags.homepage.ogImage}
                            onChange={(e) => setMetaTags({
                                ...metaTags,
                                homepage: { ...metaTags.homepage, ogImage: e.target.value }
                            })}
                            placeholder="/og-image-homepage.jpg"
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-sm)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)'
                            }}
                        />
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', margin: 'var(--spacing-xs) 0 0 0' }}>
                            Recommended: 1200x630px
                        </p>
                    </div>
                </div>
            </div>

            {/* Service Pages Templates */}
            <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#10b98115',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <FileText size={20} style={{ color: '#10b981' }} />
                    </div>
                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                        Service Pages Templates
                    </h4>
                </div>

                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                    Use placeholders: {'{Service}'}, {'{service}'}, {'{Location}'}, {'{location}'}
                </p>

                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Title Template
                        </label>
                        <input
                            type="text"
                            value={metaTags.servicePages.titleTemplate}
                            onChange={(e) => setMetaTags({
                                ...metaTags,
                                servicePages: { ...metaTags.servicePages, titleTemplate: e.target.value }
                            })}
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-sm)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)',
                                fontFamily: 'monospace'
                            }}
                        />
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', margin: 'var(--spacing-xs) 0 0 0', fontStyle: 'italic' }}>
                            Example: AC Repair in Andheri | Sorted Solutions
                        </p>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Description Template
                        </label>
                        <textarea
                            value={metaTags.servicePages.descriptionTemplate}
                            onChange={(e) => setMetaTags({
                                ...metaTags,
                                servicePages: { ...metaTags.servicePages, descriptionTemplate: e.target.value }
                            })}
                            rows={2}
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-sm)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)',
                                fontFamily: 'monospace',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Keywords Template
                        </label>
                        <input
                            type="text"
                            value={metaTags.servicePages.keywordsTemplate}
                            onChange={(e) => setMetaTags({
                                ...metaTags,
                                servicePages: { ...metaTags.servicePages, keywordsTemplate: e.target.value }
                            })}
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-sm)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)',
                                fontFamily: 'monospace'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Schema Markup */}
            <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#f59e0b15',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Code size={20} style={{ color: '#f59e0b' }} />
                    </div>
                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                        Schema Markup (JSON-LD)
                    </h4>
                </div>

                <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
                    {/* Organization Schema */}
                    <div>
                        <h5 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                            Organization Schema
                        </h5>
                        <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                        Organization Name
                                    </label>
                                    <input
                                        type="text"
                                        value={schemaMarkup.organization.name}
                                        onChange={(e) => setSchemaMarkup({
                                            ...schemaMarkup,
                                            organization: { ...schemaMarkup.organization, name: e.target.value }
                                        })}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--spacing-xs)',
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: 'var(--font-size-sm)'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                        Website URL
                                    </label>
                                    <input
                                        type="text"
                                        value={schemaMarkup.organization.url}
                                        onChange={(e) => setSchemaMarkup({
                                            ...schemaMarkup,
                                            organization: { ...schemaMarkup.organization, url: e.target.value }
                                        })}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--spacing-xs)',
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: 'var(--font-size-sm)'
                                        }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                    Contact Phone
                                </label>
                                <input
                                    type="text"
                                    value={schemaMarkup.organization.contactPoint.telephone}
                                    onChange={(e) => setSchemaMarkup({
                                        ...schemaMarkup,
                                        organization: {
                                            ...schemaMarkup.organization,
                                            contactPoint: { ...schemaMarkup.organization.contactPoint, telephone: e.target.value }
                                        }
                                    })}
                                    style={{
                                        width: '100%',
                                        padding: 'var(--spacing-xs)',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: 'var(--font-size-sm)'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Local Business Schema */}
                    <div>
                        <h5 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                            Local Business Schema
                        </h5>
                        <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                        Street Address
                                    </label>
                                    <input
                                        type="text"
                                        value={schemaMarkup.localBusiness.address.streetAddress}
                                        onChange={(e) => setSchemaMarkup({
                                            ...schemaMarkup,
                                            localBusiness: {
                                                ...schemaMarkup.localBusiness,
                                                address: { ...schemaMarkup.localBusiness.address, streetAddress: e.target.value }
                                            }
                                        })}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--spacing-xs)',
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: 'var(--font-size-sm)'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                        Locality
                                    </label>
                                    <input
                                        type="text"
                                        value={schemaMarkup.localBusiness.address.addressLocality}
                                        onChange={(e) => setSchemaMarkup({
                                            ...schemaMarkup,
                                            localBusiness: {
                                                ...schemaMarkup.localBusiness,
                                                address: { ...schemaMarkup.localBusiness.address, addressLocality: e.target.value }
                                            }
                                        })}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--spacing-xs)',
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: 'var(--font-size-sm)'
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                        Latitude
                                    </label>
                                    <input
                                        type="text"
                                        value={schemaMarkup.localBusiness.geo.latitude}
                                        onChange={(e) => setSchemaMarkup({
                                            ...schemaMarkup,
                                            localBusiness: {
                                                ...schemaMarkup.localBusiness,
                                                geo: { ...schemaMarkup.localBusiness.geo, latitude: e.target.value }
                                            }
                                        })}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--spacing-xs)',
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: 'var(--font-size-sm)'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                        Longitude
                                    </label>
                                    <input
                                        type="text"
                                        value={schemaMarkup.localBusiness.geo.longitude}
                                        onChange={(e) => setSchemaMarkup({
                                            ...schemaMarkup,
                                            localBusiness: {
                                                ...schemaMarkup.localBusiness,
                                                geo: { ...schemaMarkup.localBusiness.geo, longitude: e.target.value }
                                            }
                                        })}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--spacing-xs)',
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: 'var(--font-size-sm)'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SEO Keywords */}
            <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#ec489915',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Tag size={20} style={{ color: '#ec4899' }} />
                    </div>
                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                        Target SEO Keywords ({seoKeywords.length})
                    </h4>
                </div>

                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                    <input
                        type="text"
                        placeholder="Add new keyword..."
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                        style={{
                            flex: 1,
                            padding: 'var(--spacing-sm)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--font-size-sm)'
                        }}
                    />
                    <button
                        onClick={handleAddKeyword}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px' }}
                    >
                        <Plus size={16} />
                        Add
                    </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)' }}>
                    {seoKeywords.map((keyword, index) => (
                        <div
                            key={index}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-xs)',
                                padding: '6px 12px',
                                backgroundColor: '#ec489910',
                                border: '1px solid #ec489930',
                                borderRadius: '16px',
                                fontSize: 'var(--font-size-sm)'
                            }}
                        >
                            <span>{keyword}</span>
                            <button
                                onClick={() => handleRemoveKeyword(index)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#ec4899',
                                    cursor: 'pointer',
                                    padding: '0',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={handleSaveAll}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', padding: '10px 24px' }}
                >
                    <Save size={18} />
                    Save All SEO Settings
                </button>
            </div>
        </div>
    );
}

export default SEOSettings;





