'use client'

import { useState } from 'react';
import { X, Building2, Mail, Phone, MapPin, FileText } from 'lucide-react';

function CompanyDetailsModal({ onClose }) {
    const [companyData, setCompanyData] = useState({
        name: 'Sorted Solutions',
        address: '123 Business Street, Mumbai, Maharashtra 400001',
        gstin: '27AABCU9603R1ZM',
        pan: 'AABCU9603R',
        email: 'contact@sortedsolutions.com',
        phone: '+91 98765 43210',
        website: 'www.sortedsolutions.com'
    });

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                {/* Header */}
                <div className="modal-header">
                    <h2 className="modal-title">Company Details</h2>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="modal-content" style={{ padding: 'var(--spacing-lg)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                        {/* Company Name */}
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                <Building2 size={16} />
                                Company Name
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                value={companyData.name}
                                onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                            />
                        </div>

                        {/* Address */}
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                <MapPin size={16} />
                                Address
                            </label>
                            <textarea
                                className="form-input"
                                value={companyData.address}
                                onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                                rows="3"
                            />
                        </div>

                        {/* GSTIN & PAN */}
                        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                    <FileText size={16} />
                                    GSTIN
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={companyData.gstin}
                                    onChange={(e) => setCompanyData({ ...companyData, gstin: e.target.value.toUpperCase() })}
                                    maxLength={15}
                                    style={{ fontFamily: 'monospace' }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                    <FileText size={16} />
                                    PAN
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={companyData.pan}
                                    onChange={(e) => setCompanyData({ ...companyData, pan: e.target.value.toUpperCase() })}
                                    maxLength={10}
                                    style={{ fontFamily: 'monospace' }}
                                />
                            </div>
                        </div>

                        {/* Contact Details */}
                        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                    <Mail size={16} />
                                    Email
                                </label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={companyData.email}
                                    onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                    <Phone size={16} />
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    value={companyData.phone}
                                    onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Website */}
                        <div className="form-group">
                            <label className="form-label">Website</label>
                            <input
                                type="text"
                                className="form-input"
                                value={companyData.website}
                                onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={() => {
                        // Save company details
                        console.log('Company details saved:', companyData);
                        onClose();
                    }}>
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CompanyDetailsModal;
