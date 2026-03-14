import { useState, useEffect, useRef } from 'react';
import { X, Printer, RefreshCcw } from 'lucide-react';
import { printSettingsAPI, agreementTemplatesAPI } from '@/lib/adminAPI';

export default function PrintAgreementModal({ type, data, onClose }) {
    const [settings, setSettings] = useState(null);
    const [template, setTemplate] = useState('');
    const [parsedHTML, setParsedHTML] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const printRef = useRef(null);

    useEffect(() => {
        fetchData();
    }, [type, data]);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [settingsData, templateData] = await Promise.all([
                printSettingsAPI.get(),
                agreementTemplatesAPI.get(type)
            ]);

            setSettings(settingsData || {});
            
            const rawTemplate = templateData?.content || `<p>No template defined for ${type.toUpperCase()}. Please configure one in the Agreement Template tab.</p>`;
            setTemplate(rawTemplate);
            
            // Replace placeholders
            const html = processTemplate(rawTemplate, settingsData || {}, data, type);
            setParsedHTML(html);

        } catch (error) {
            console.error('Failed to load print data:', error);
            alert('Failed to load print data: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const processTemplate = (html, printSettings, recordData, agreementType) => {
        if (!html || !recordData) return html;

        const customer = recordData.accounts || {};
        const planName = recordData.product_name || recordData.plan_name || 'N/A';
        const serialNumber = recordData.serial_number || 'N/A';
        
        let processed = html;

        // Common Account Placeholders
        processed = processed.replace(/\[CUSTOMER_NAME\]/g, customer.name || 'N/A');
        
        // Handle Address (try to extract from address strings if properties aren't eagerly loaded)
        // Note: NewRentalForm passes customerName but full address might need deriving.
        let addressStr = 'N/A';
        if (recordData.delivery_property) {
           addressStr = recordData.delivery_property.address || 'N/A';
        } else if (customer.address) {
            addressStr = customer.address;
            if (customer.city) addressStr += `, ${customer.city}`;
            if (customer.state) addressStr += `, ${customer.state}`;
            if (customer.pincode) addressStr += ` - ${customer.pincode}`;
        }
        processed = processed.replace(/\[CUSTOMER_ADDRESS\]/g, addressStr);
        processed = processed.replace(/\[CUSTOMER_PHONE\]/g, customer.phone || 'N/A');
        processed = processed.replace(/\[CUSTOMER_EMAIL\]/g, customer.email || 'N/A');

        // Product Details
        processed = processed.replace(/\[PRODUCT_NAME\]/g, planName);
        processed = processed.replace(/\[SERIAL_NUMBER\]/g, serialNumber);

        // Dates
        processed = processed.replace(/\[START_DATE\]/g, recordData.start_date ? new Date(recordData.start_date).toLocaleDateString() : 'N/A');
        processed = processed.replace(/\[END_DATE\]/g, recordData.end_date ? new Date(recordData.end_date).toLocaleDateString() : 'N/A');
        processed = processed.replace(/\[TODAYS_DATE\]/g, new Date().toLocaleDateString());

        // Type Specific
        if (agreementType === 'rental') {
            processed = processed.replace(/\[MONTHLY_RENT\]/g, recordData.monthly_rent || 0);
            processed = processed.replace(/\[SECURITY_DEPOSIT\]/g, recordData.security_deposit || 0);
            processed = processed.replace(/\[SETUP_FEE\]/g, recordData.setup_fee || 0);
            processed = processed.replace(/\[NEXT_RENT_DUE\]/g, recordData.next_rent_due_date ? new Date(recordData.next_rent_due_date).toLocaleDateString() : 'N/A');
        } else if (agreementType === 'amc') {
            processed = processed.replace(/\[AMC_AMOUNT\]/g, recordData.amc_amount || 0);
            processed = processed.replace(/\[NEXT_SERVICE_DATE\]/g, recordData.next_service_date ? new Date(recordData.next_service_date).toLocaleDateString() : 'N/A');
        }

        // Company Details
        processed = processed.replace(/\[COMPANY_NAME\]/g, printSettings.company_name || 'Sorted Solutions');
        processed = processed.replace(/\[COMPANY_PHONE\]/g, printSettings.company_phone || '');
        processed = processed.replace(/\[COMPANY_EMAIL\]/g, printSettings.company_email || '');

        return processed;
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="modal-overlay" style={{ zIndex: 1000 }}>
                <div className="modal-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                    <RefreshCcw className="animate-spin" size={32} style={{ color: 'var(--text-tertiary)' }} />
                </div>
            </div>
        );
    }

    // Determine specific terms based on type mapping back to db column logic handled in PrintSetup
    const termsList = type === 'rental' ? (settings?.rental_terms || []) : (settings?.amc_terms || []);

    return (
        <div className="modal-overlay print-modal-hide-ui" style={{ zIndex: 1000 }}>
            <div className="modal-content print-modal-content" style={{ maxWidth: '900px', width: '90vw', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '90vh' }}>
                
                {/* Fixed Non-Printable Header */}
                <div className="no-print" style={{ 
                    padding: 'var(--spacing-md) var(--spacing-lg)', 
                    backgroundColor: 'var(--bg-elevated)', 
                    borderBottom: '1px solid var(--border-primary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0
                }}>
                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0 }}>
                        {type === 'rental' ? 'Rental Agreement PDF' : 'AMC Agreement PDF'}
                    </h2>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                        <button className="btn btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                            <Printer size={16} />
                            Print Agreement
                        </button>
                        <button className="btn btn-secondary" onClick={onClose} style={{ padding: '6px' }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Scrollable Printable Area (A4 Styled container) */}
                <div style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    padding: 'var(--spacing-xl)', 
                    backgroundColor: '#e2e8f0', // Darker backdrop to make paper stand out
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    
                    {/* The A4 Paper */}
                    <div 
                        ref={printRef}
                        className="print-page"
                        style={{
                            width: '210mm',
                            minHeight: '297mm',
                            padding: '20mm',
                            backgroundColor: '#ffffff',
                            color: '#000000',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            margin: '0 auto',
                            fontFamily: 'Arial, sans-serif',
                            fontSize: settings?.font_size === 'small' ? '12px' : settings?.font_size === 'large' ? '16px' : '14px',
                            lineHeight: '1.6',
                            position: 'relative'
                        }}
                    >
                        {/* Company Header */}
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'flex-start',
                            marginBottom: '30px',
                            borderBottom: '2px solid #1e293b',
                            paddingBottom: '20px'
                        }}>
                            <div>
                                {settings?.show_logo && settings?.logo_url && (
                                    <img src={settings.logo_url} alt="Logo" style={{ height: '60px', marginBottom: '10px' }} />
                                )}
                                <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b', fontWeight: 700 }}>
                                    {settings?.company_name || 'Company Name'}
                                </h1>
                                <p style={{ margin: '5px 0', fontSize: '12px', color: '#64748b', whiteSpace: 'pre-wrap' }}>
                                    {settings?.company_address}
                                </p>
                                <p style={{ margin: '5px 0', fontSize: '12px', color: '#64748b' }}>
                                    {settings?.company_phone} | {settings?.company_email}
                                </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <h2 style={{ margin: 0, fontSize: '24px', color: '#1e293b', fontWeight: 700, textTransform: 'uppercase' }}>
                                    {type === 'rental' ? 'RENTAL AGREEMENT' : 'AMC AGREEMENT'}
                                </h2>
                                <p style={{ margin: '5px 0', fontSize: '12px', color: '#64748b' }}>
                                    Date: {new Date().toLocaleDateString('en-IN')}
                                </p>
                                {settings?.show_gst && settings?.gst_number && (
                                    <p style={{ margin: '5px 0', fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                                        GSTIN: {settings.gst_number}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Editable Content Area */}
                        {/* We use contentEditable so admin can make one-off manual tweaks before printing */}
                        <div 
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => setParsedHTML(e.target.innerHTML)}
                            dangerouslySetInnerHTML={{ __html: parsedHTML }}
                            style={{ outline: 'none', minHeight: '200px' }}
                        />

                        {/* Terms & Conditions */}
                        {settings?.show_terms && termsList.length > 0 && (
                            <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #cbd5e1' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: '#1e293b' }}>
                                    Terms & Conditions:
                                </h4>
                                <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#475569' }}>
                                    {termsList.map((term, i) => (
                                        <li key={i} style={{ marginBottom: '4px' }}>{term}</li>
                                    ))}
                                </ol>
                            </div>
                        )}

                        {/* Signatures */}
                        {settings?.include_signature && (
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                marginTop: '80px',
                                pageBreakInside: 'avoid'
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ width: '200px', borderBottom: '1px solid #1e293b', marginBottom: '8px' }}></div>
                                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 600 }}>Customer Signature</p>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>{data.accounts?.name || 'Customer'}</p>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ width: '200px', borderBottom: '1px solid #1e293b', marginBottom: '8px' }}></div>
                                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 600 }}>Authorized Signatory</p>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>{settings?.company_name || 'Company'}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Print CSS Injection */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-modal-hide-ui {
                        position: absolute !important;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100%;
                        background: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .print-modal-content {
                        box-shadow: none !important;
                        width: 100% !important;
                        max-width: none !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .print-page, .print-page * {
                        visibility: visible;
                    }
                    .print-page {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100% !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
