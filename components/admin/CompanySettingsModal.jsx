'use client'

import { useState } from 'react'
import { X, Building2, MapPin, Mail, Phone, FileText, Save } from 'lucide-react'

export default function CompanySettingsModal({ isOpen, onClose }) {
    const [companyData, setCompanyData] = useState({
        companyName: 'Sorted Solutions',
        address: '123 Business Street, Mumbai, Maharashtra 400001',
        email: 'info@sortedsolutions.com',
        phone: '+91 98765 43210',
        gstin: '27AABCU9603R1ZM',
        pan: 'AABCU9603R'
    })

    const handleSave = () => {
        // Save to localStorage or Supabase
        localStorage.setItem('companySettings', JSON.stringify(companyData))
        alert('Company settings saved successfully!')
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                {/* Header */}
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <Building2 size={24} style={{ color: 'var(--color-primary)' }} />
                        <h2 className="modal-title">Company Settings</h2>
                    </div>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="modal-content">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                        {/* Company Name */}
                        <div className="form-group">
                            <label className="form-label">
                                <Building2 size={16} style={{ display: 'inline', marginRight: '8px' }} />
                                Company Name
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                value={companyData.companyName}
                                onChange={(e) => setCompanyData({ ...companyData, companyName: e.target.value })}
                                placeholder="Enter company name"
                            />
                        </div>

                        {/* Address */}
                        <div className="form-group">
                            <label className="form-label">
                                <MapPin size={16} style={{ display: 'inline', marginRight: '8px' }} />
                                Address
                            </label>
                            <textarea
                                className="form-textarea"
                                value={companyData.address}
                                onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                                placeholder="Enter complete address"
                                rows={3}
                            />
                        </div>

                        {/* Email & Phone */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                            <div className="form-group">
                                <label className="form-label">
                                    <Mail size={16} style={{ display: 'inline', marginRight: '8px' }} />
                                    Email
                                </label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={companyData.email}
                                    onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                                    placeholder="email@company.com"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    <Phone size={16} style={{ display: 'inline', marginRight: '8px' }} />
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    value={companyData.phone}
                                    onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                                    placeholder="+91 98765 43210"
                                />
                            </div>
                        </div>

                        {/* GSTIN & PAN */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                            <div className="form-group">
                                <label className="form-label">
                                    <FileText size={16} style={{ display: 'inline', marginRight: '8px' }} />
                                    GSTIN
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={companyData.gstin}
                                    onChange={(e) => setCompanyData({ ...companyData, gstin: e.target.value.toUpperCase() })}
                                    placeholder="27AABCU9603R1ZM"
                                    maxLength={15}
                                    style={{ fontFamily: 'monospace' }}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    <FileText size={16} style={{ display: 'inline', marginRight: '8px' }} />
                                    PAN
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={companyData.pan}
                                    onChange={(e) => setCompanyData({ ...companyData, pan: e.target.value.toUpperCase() })}
                                    placeholder="AABCU9603R"
                                    maxLength={10}
                                    style={{ fontFamily: 'monospace' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={handleSave}>
                        <Save size={16} />
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    )
}
