'use client'

import { useState, useEffect } from 'react';
import { FileText, Save, Eye, Clock, History, MapPin, Mail, Phone, Globe, ChevronDown, ChevronUp, RotateCcw, Plus, X } from 'lucide-react';

function StaticPagesSettings() {
    const [activeTab, setActiveTab] = useState('contact');
    const [showPreview, setShowPreview] = useState(false);
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const [pages, setPages] = useState({
        contact: {
            content: `<h1>Contact Us</h1>
<p>We're here to help! Reach out to us through any of the following channels:</p>

<h2>Head Office</h2>
<p>A138 Orchard Mall, Royal Palms<br>
Goregaon East, Mumbai - 400065</p>

<h2>Phone</h2>
<p>Customer Support: +91 XXXXXXXXXX<br>
Technical Support: +91 XXXXXXXXXX</p>

<h2>Email</h2>
<p>General Inquiries: info@sortedsolutions.in<br>
Support: support@sortedsolutions.in</p>

<h2>Business Hours</h2>
<p>Monday - Saturday: 9:00 AM - 7:00 PM<br>
Sunday: 10:00 AM - 5:00 PM</p>`,
            contactInfo: {
                headOffice: 'A138 Orchard Mall, Royal Palms, Goregaon East, Mumbai - 400065',
                phones: ['+91 XXXXXXXXXX', '+91 XXXXXXXXXX'],
                emails: ['info@sortedsolutions.in', 'support@sortedsolutions.in'],
                businessHours: 'Monday - Saturday: 9:00 AM - 7:00 PM, Sunday: 10:00 AM - 5:00 PM'
            },
            mapSettings: {
                embedUrl: 'https://www.google.com/maps/embed?pb=...',
                latitude: '19.1663',
                longitude: '72.8526',
                zoom: 15
            },
            formSettings: {
                enabled: true,
                recipientEmail: 'contact@sortedsolutions.in',
                successMessage: 'Thank you for contacting us! We will get back to you within 24 hours.',
                errorMessage: 'There was an error sending your message. Please try again or email us directly.'
            },
            published: true,
            lastSaved: null
        },
        terms: {
            content: `<h1>Terms & Conditions</h1>
<p><strong>Effective Date:</strong> January 1, 2024</p>
<p><strong>Last Updated:</strong> February 10, 2026</p>

<h2>1. Acceptance of Terms</h2>
<p>By accessing and using Sorted Solutions services, you accept and agree to be bound by these Terms & Conditions.</p>

<h2>2. Service Description</h2>
<p>Sorted Solutions provides appliance repair and maintenance services for residential and commercial customers.</p>

<h2>3. Booking and Cancellation</h2>
<p>Service bookings can be made through our website or mobile app. Cancellations must be made at least 2 hours before the scheduled appointment.</p>

<h2>4. Payment Terms</h2>
<p>Payment is due upon completion of service. We accept cash, credit/debit cards, and digital payments.</p>

<h2>5. Warranty and Liability</h2>
<p>We provide a 30-day warranty on all repairs. Our liability is limited to the cost of the service provided.</p>

<h2>6. Changes to Terms</h2>
<p>We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting.</p>`,
            effectiveDate: '2024-01-01',
            requireAcceptance: true,
            versions: [
                {
                    version: '1.0',
                    date: '2024-01-01T00:00:00',
                    notes: 'Initial version',
                    content: '<h1>Terms & Conditions</h1><p>Initial version...</p>'
                }
            ],
            published: true,
            lastSaved: null
        },
        privacy: {
            content: `<h1>Privacy Policy</h1>
<p><strong>Effective Date:</strong> January 1, 2024</p>
<p><strong>Last Updated:</strong> February 10, 2026</p>

<h2>1. Information We Collect</h2>
<p>We collect information you provide directly to us, including name, email, phone number, and address when you book our services.</p>

<h2>2. How We Use Your Information</h2>
<p>We use the information we collect to provide, maintain, and improve our services, process bookings, and communicate with you.</p>

<h2>3. Information Sharing</h2>
<p>We do not sell your personal information. We may share information with service providers who assist us in operating our business.</p>

<h2>4. Your Rights (GDPR)</h2>
<p>You have the right to access, correct, or delete your personal data. You may also object to processing or request data portability.</p>

<h2>5. Cookies</h2>
<p>We use cookies to improve your experience on our website. You can control cookie preferences through your browser settings.</p>

<h2>6. Data Security</h2>
<p>We implement appropriate security measures to protect your personal information from unauthorized access or disclosure.</p>

<h2>7. Contact Us</h2>
<p>For privacy concerns, contact us at privacy@sortedsolutions.in</p>`,
            effectiveDate: '2024-01-01',
            gdprCompliant: true,
            versions: [
                {
                    version: '1.0',
                    date: '2024-01-01T00:00:00',
                    notes: 'Initial GDPR-compliant version',
                    content: '<h1>Privacy Policy</h1><p>Initial version...</p>'
                }
            ],
            published: true,
            lastSaved: null
        },
        accessibility: {
            content: `<h1>Accessibility Statement</h1>
<p><strong>WCAG Compliance Level:</strong> AA</p>
<p><strong>Last Reviewed:</strong> February 10, 2026</p>

<h2>Our Commitment</h2>
<p>Sorted Solutions is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone.</p>

<h2>Accessibility Features</h2>
<ul>
  <li>Keyboard navigation support throughout the website</li>
  <li>Screen reader compatibility (tested with NVDA and JAWS)</li>
  <li>High contrast color schemes meeting WCAG AA standards</li>
  <li>Resizable text (up to 200% without loss of functionality)</li>
  <li>Alternative text for all images and icons</li>
  <li>Clear and consistent navigation structure</li>
  <li>Form labels and error messages for assistive technologies</li>
  <li>Skip navigation links for efficient browsing</li>
</ul>

<h2>Conformance Status</h2>
<p>We aim to conform to WCAG 2.1 Level AA standards. We regularly audit our website for accessibility issues.</p>

<h2>Feedback</h2>
<p>We welcome your feedback on the accessibility of our website. Please contact us at:</p>
<p>Email: accessibility@sortedsolutions.in<br>
Phone: +91 XXXXXXXXXX</p>

<h2>Technical Specifications</h2>
<p>Our website is designed to be compatible with the following assistive technologies:</p>
<ul>
  <li>Screen readers (NVDA, JAWS, VoiceOver)</li>
  <li>Speech recognition software</li>
  <li>Keyboard-only navigation</li>
  <li>Browser zoom and text resizing</li>
</ul>`,
            wcagLevel: 'AA',
            lastReviewed: '2026-02-10',
            accessibilityContact: {
                email: 'accessibility@sortedsolutions.in',
                phone: '+91 XXXXXXXXXX'
            },
            published: true,
            lastSaved: null
        }
    });

    // Auto-save every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            handleAutoSave();
        }, 30000);
        return () => clearInterval(interval);
    }, [pages]);

    const handleAutoSave = () => {
        setIsSaving(true);
        // Simulate save to localStorage or backend
        setTimeout(() => {
            setLastSaved(new Date());
            setIsSaving(false);
        }, 500);
    };

    const handleContentChange = (content) => {
        setPages({
            ...pages,
            [activeTab]: {
                ...pages[activeTab],
                content
            }
        });
    };

    const handleSaveDraft = () => {
        setIsSaving(true);
        setTimeout(() => {
            setLastSaved(new Date());
            setIsSaving(false);
            alert('Draft saved successfully!');
        }, 500);
    };

    const handlePublish = () => {
        setPages({
            ...pages,
            [activeTab]: {
                ...pages[activeTab],
                published: true,
                lastSaved: new Date()
            }
        });
        alert(`${getTabLabel(activeTab)} published successfully!`);
    };

    const handleCreateVersion = (notes) => {
        if (activeTab === 'terms' || activeTab === 'privacy') {
            const currentPage = pages[activeTab];
            const newVersion = {
                version: `${currentPage.versions.length + 1}.0`,
                date: new Date().toISOString(),
                notes: notes || 'Version update',
                content: currentPage.content
            };

            setPages({
                ...pages,
                [activeTab]: {
                    ...currentPage,
                    versions: [...currentPage.versions, newVersion].slice(-10) // Keep last 10 versions
                }
            });
            alert('New version created successfully!');
        }
    };

    const handleRestoreVersion = (version) => {
        if (confirm(`Are you sure you want to restore version ${version.version}? Current changes will be lost.`)) {
            setPages({
                ...pages,
                [activeTab]: {
                    ...pages[activeTab],
                    content: version.content
                }
            });
            setShowVersionHistory(false);
        }
    };

    const getTabLabel = (tab) => {
        const labels = {
            contact: 'Contact Us',
            terms: 'Terms & Conditions',
            privacy: 'Privacy Policy',
            accessibility: 'Accessibility Statement'
        };
        return labels[tab];
    };

    const getTabIcon = (tab) => {
        const icons = {
            contact: MapPin,
            terms: FileText,
            privacy: Globe,
            accessibility: Eye
        };
        return icons[tab];
    };

    const formatTimeAgo = (date) => {
        if (!date) return 'Never';
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        return `${Math.floor(seconds / 86400)} days ago`;
    };

    const insertHtmlTag = (tag) => {
        const textarea = document.querySelector(`textarea[data-tab="${activeTab}"]`);
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = pages[activeTab].content.substring(start, end);

        let newText = '';
        switch (tag) {
            case 'bold':
                newText = `<strong>${selectedText || 'bold text'}</strong>`;
                break;
            case 'italic':
                newText = `<em>${selectedText || 'italic text'}</em>`;
                break;
            case 'h2':
                newText = `<h2>${selectedText || 'Heading'}</h2>`;
                break;
            case 'h3':
                newText = `<h3>${selectedText || 'Subheading'}</h3>`;
                break;
            case 'link':
                newText = `<a href="https://example.com">${selectedText || 'link text'}</a>`;
                break;
            case 'ul':
                newText = `<ul>\n  <li>${selectedText || 'List item'}</li>\n</ul>`;
                break;
            case 'p':
                newText = `<p>${selectedText || 'Paragraph text'}</p>`;
                break;
        }

        const newContent =
            pages[activeTab].content.substring(0, start) +
            newText +
            pages[activeTab].content.substring(end);

        handleContentChange(newContent);
    };

    const renderContactSettings = () => (
        <div style={{ display: 'grid', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
            <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                    Contact Information
                </h4>
                <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Head Office Address
                        </label>
                        <input
                            type="text"
                            value={pages.contact.contactInfo.headOffice}
                            onChange={(e) => setPages({
                                ...pages,
                                contact: {
                                    ...pages.contact,
                                    contactInfo: { ...pages.contact.contactInfo, headOffice: e.target.value }
                                }
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
                </div>
            </div>

            <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                    Map Integration
                </h4>
                <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Google Maps Embed URL
                        </label>
                        <input
                            type="text"
                            value={pages.contact.mapSettings.embedUrl}
                            onChange={(e) => setPages({
                                ...pages,
                                contact: {
                                    ...pages.contact,
                                    mapSettings: { ...pages.contact.mapSettings, embedUrl: e.target.value }
                                }
                            })}
                            placeholder="https://www.google.com/maps/embed?pb=..."
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-sm)' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Latitude
                            </label>
                            <input
                                type="text"
                                value={pages.contact.mapSettings.latitude}
                                onChange={(e) => setPages({
                                    ...pages,
                                    contact: {
                                        ...pages.contact,
                                        mapSettings: { ...pages.contact.mapSettings, latitude: e.target.value }
                                    }
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
                                Longitude
                            </label>
                            <input
                                type="text"
                                value={pages.contact.mapSettings.longitude}
                                onChange={(e) => setPages({
                                    ...pages,
                                    contact: {
                                        ...pages.contact,
                                        mapSettings: { ...pages.contact.mapSettings, longitude: e.target.value }
                                    }
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
                                Zoom Level
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={pages.contact.mapSettings.zoom}
                                onChange={(e) => setPages({
                                    ...pages,
                                    contact: {
                                        ...pages.contact,
                                        mapSettings: { ...pages.contact.mapSettings, zoom: parseInt(e.target.value) }
                                    }
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
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                    Contact Form Settings
                </h4>
                <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={pages.contact.formSettings.enabled}
                            onChange={(e) => setPages({
                                ...pages,
                                contact: {
                                    ...pages.contact,
                                    formSettings: { ...pages.contact.formSettings, enabled: e.target.checked }
                                }
                            })}
                            style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ fontSize: 'var(--font-size-sm)' }}>Enable contact form on page</span>
                    </label>
                    {pages.contact.formSettings.enabled && (
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Form Submission Email
                            </label>
                            <input
                                type="email"
                                value={pages.contact.formSettings.recipientEmail}
                                onChange={(e) => setPages({
                                    ...pages,
                                    contact: {
                                        ...pages.contact,
                                        formSettings: { ...pages.contact.formSettings, recipientEmail: e.target.value }
                                    }
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
                    )}
                </div>
            </div>
        </div>
    );

    const renderVersionHistory = () => {
        const currentPage = pages[activeTab];
        if (!currentPage.versions) return null;

        return (
            <div className="card" style={{ padding: 'var(--spacing-lg)', marginTop: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                        Version History ({currentPage.versions.length})
                    </h4>
                    <button
                        onClick={() => {
                            const notes = prompt('Enter version notes:');
                            if (notes) handleCreateVersion(notes);
                        }}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                    >
                        <Plus size={14} />
                        Create Version
                    </button>
                </div>

                <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                    {currentPage.versions.slice().reverse().map((version, index) => (
                        <div
                            key={index}
                            style={{
                                padding: 'var(--spacing-md)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: index === 0 ? '#10b98110' : 'transparent'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                                        <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                                            v{version.version}
                                        </span>
                                        {index === 0 && (
                                            <span style={{
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontSize: '10px',
                                                fontWeight: 600,
                                                backgroundColor: '#10b98115',
                                                color: '#10b981'
                                            }}>
                                                CURRENT
                                            </span>
                                        )}
                                    </div>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: '0 0 var(--spacing-xs) 0' }}>
                                        {version.notes}
                                    </p>
                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', margin: 0 }}>
                                        {new Date(version.date).toLocaleString()}
                                    </p>
                                </div>
                                {index !== 0 && (
                                    <button
                                        onClick={() => handleRestoreVersion(version)}
                                        className="btn btn-secondary"
                                        style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                                    >
                                        <RotateCcw size={14} />
                                        Restore
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderAccessibilitySettings = () => (
        <div style={{ display: 'grid', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
            <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                    WCAG Compliance
                </h4>
                <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Compliance Level
                        </label>
                        <select
                            value={pages.accessibility.wcagLevel}
                            onChange={(e) => setPages({
                                ...pages,
                                accessibility: {
                                    ...pages.accessibility,
                                    wcagLevel: e.target.value
                                }
                            })}
                            style={{
                                width: '200px',
                                padding: 'var(--spacing-sm)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)'
                            }}
                        >
                            <option value="A">Level A</option>
                            <option value="AA">Level AA (Recommended)</option>
                            <option value="AAA">Level AAA</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Last Reviewed Date
                        </label>
                        <input
                            type="date"
                            value={pages.accessibility.lastReviewed}
                            onChange={(e) => setPages({
                                ...pages,
                                accessibility: {
                                    ...pages.accessibility,
                                    lastReviewed: e.target.value
                                }
                            })}
                            style={{
                                width: '200px',
                                padding: 'var(--spacing-sm)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)'
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                    Accessibility Contact
                </h4>
                <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Email
                        </label>
                        <input
                            type="email"
                            value={pages.accessibility.accessibilityContact.email}
                            onChange={(e) => setPages({
                                ...pages,
                                accessibility: {
                                    ...pages.accessibility,
                                    accessibilityContact: {
                                        ...pages.accessibility.accessibilityContact,
                                        email: e.target.value
                                    }
                                }
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
                            Phone
                        </label>
                        <input
                            type="tel"
                            value={pages.accessibility.accessibilityContact.phone}
                            onChange={(e) => setPages({
                                ...pages,
                                accessibility: {
                                    ...pages.accessibility,
                                    accessibilityContact: {
                                        ...pages.accessibility.accessibilityContact,
                                        phone: e.target.value
                                    }
                                }
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
                </div>
            </div>
        </div>
    );

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                    Static Pages Management
                </h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                    Manage your website's static pages including Contact Us, Terms & Conditions, Privacy Policy, and Accessibility Statement
                </p>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-lg)', borderBottom: '2px solid var(--border-primary)' }}>
                {['contact', 'terms', 'privacy', 'accessibility'].map(tab => {
                    const Icon = getTabIcon(tab);
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                border: 'none',
                                borderBottom: activeTab === tab ? '3px solid var(--color-primary)' : '3px solid transparent',
                                backgroundColor: activeTab === tab ? 'var(--color-primary)10' : 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-xs)',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: activeTab === tab ? 600 : 400,
                                color: activeTab === tab ? 'var(--color-primary)' : 'var(--text-secondary)',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Icon size={16} />
                            {getTabLabel(tab)}
                        </button>
                    );
                })}
            </div>

            {/* Editor Toolbar */}
            <div className="card" style={{ padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                        <button onClick={() => insertHtmlTag('bold')} className="btn btn-secondary" style={{ padding: '6px 12px' }} title="Bold">
                            <strong>B</strong>
                        </button>
                        <button onClick={() => insertHtmlTag('italic')} className="btn btn-secondary" style={{ padding: '6px 12px' }} title="Italic">
                            <em>I</em>
                        </button>
                        <button onClick={() => insertHtmlTag('h2')} className="btn btn-secondary" style={{ padding: '6px 12px' }} title="Heading 2">
                            H2
                        </button>
                        <button onClick={() => insertHtmlTag('h3')} className="btn btn-secondary" style={{ padding: '6px 12px' }} title="Heading 3">
                            H3
                        </button>
                        <button onClick={() => insertHtmlTag('link')} className="btn btn-secondary" style={{ padding: '6px 12px' }} title="Link">
                            🔗
                        </button>
                        <button onClick={() => insertHtmlTag('ul')} className="btn btn-secondary" style={{ padding: '6px 12px' }} title="List">
                            ≡
                        </button>
                        <button onClick={() => insertHtmlTag('p')} className="btn btn-secondary" style={{ padding: '6px 12px' }} title="Paragraph">
                            ¶
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                        >
                            <Eye size={16} />
                            {showPreview ? 'Hide' : 'Show'} Preview
                        </button>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                            {isSaving ? '💾 Saving...' : `💾 Last saved: ${formatTimeAgo(lastSaved)}`}
                        </span>
                    </div>
                </div>
            </div>

            {/* Content Editor */}
            <div style={{ display: 'grid', gridTemplateColumns: showPreview ? '1fr 1fr' : '1fr', gap: 'var(--spacing-md)' }}>
                <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                        HTML Content
                    </label>
                    <textarea
                        data-tab={activeTab}
                        value={pages[activeTab].content}
                        onChange={(e) => handleContentChange(e.target.value)}
                        rows={20}
                        style={{
                            width: '100%',
                            padding: 'var(--spacing-md)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--font-size-sm)',
                            fontFamily: 'monospace',
                            resize: 'vertical'
                        }}
                    />
                </div>

                {showPreview && (
                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Preview
                        </label>
                        <div
                            style={{
                                padding: 'var(--spacing-md)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: 'var(--bg-secondary)',
                                minHeight: '400px',
                                maxHeight: '600px',
                                overflowY: 'auto'
                            }}
                            dangerouslySetInnerHTML={{ __html: pages[activeTab].content }}
                        />
                    </div>
                )}
            </div>

            {/* Page-specific Settings */}
            {activeTab === 'contact' && renderContactSettings()}
            {(activeTab === 'terms' || activeTab === 'privacy') && renderVersionHistory()}
            {activeTab === 'accessibility' && renderAccessibilitySettings()}

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-lg)' }}>
                <button
                    onClick={handleSaveDraft}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', padding: '10px 24px' }}
                >
                    <Save size={18} />
                    Save Draft
                </button>
                <button
                    onClick={handlePublish}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', padding: '10px 24px' }}
                >
                    <Globe size={18} />
                    Publish
                </button>
            </div>
        </div>
    );
}

export default StaticPagesSettings;





