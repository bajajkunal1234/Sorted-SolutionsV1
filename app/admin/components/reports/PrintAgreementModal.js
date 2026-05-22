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

        // Account properties inside HTML template (we still keep these so they can use inline placeholders if they want)
        processed = processed.replace(/\[CUSTOMER_NAME\]/g, customer.name || 'N/A');
        
        let addressStr = 'N/A';
        const specificProperty = recordData.installation_property || recordData.delivery_property;
        if (specificProperty) {
           const parts = [
               specificProperty.flat_number,
               specificProperty.building_name,
               specificProperty.address,
               specificProperty.locality,
               specificProperty.city,
               specificProperty.pincode ? `- ${specificProperty.pincode}` : ''
           ].filter(Boolean);
           addressStr = parts.join(', ');
        } else if (customer.property) {
            const parts = [
                customer.property.flat_number,
                customer.property.building_name,
                customer.property.address,
                customer.property.locality,
                customer.property.city,
                customer.property.pincode ? `- ${customer.property.pincode}` : ''
            ].filter(Boolean);
            addressStr = parts.join(', ');
        } else if (customer.address || customer.mailing_address) {
            addressStr = customer.address || customer.mailing_address;
            if (customer.city) addressStr += `, ${customer.city}`;
            if (customer.state) addressStr += `, ${customer.state}`;
            if (customer.pincode) addressStr += ` - ${customer.pincode}`;
        }
        processed = processed.replace(/\[CUSTOMER_ADDRESS\]/g, addressStr || 'N/A');
        processed = processed.replace(/\[CUSTOMER_PHONE\]/g, customer.phone || 'N/A');
        processed = processed.replace(/\[CUSTOMER_EMAIL\]/g, customer.email || 'N/A');

        // Product Details
        processed = processed.replace(/\[PRODUCT_NAME\]/g, planName);
        processed = processed.replace(/\[PRODUCT_BRAND\]/g, recordData.product_brand || 'N/A');
        processed = processed.replace(/\[PRODUCT_MODEL\]/g, recordData.product_model || 'N/A');
        processed = processed.replace(/\[SERIAL_NUMBER\]/g, serialNumber);

        // Dates
        processed = processed.replace(/\[START_DATE\]/g, recordData.start_date ? new Date(recordData.start_date).toLocaleDateString('en-GB') : 'N/A');
        processed = processed.replace(/\[END_DATE\]/g, recordData.end_date ? new Date(recordData.end_date).toLocaleDateString('en-GB') : 'N/A');
        processed = processed.replace(/\[TODAYS_DATE\]/g, new Date().toLocaleDateString('en-GB'));

        // Type Specific
        if (agreementType === 'rental') {
            processed = processed.replace(/\[MONTHLY_RENT\]/g, recordData.monthly_rent || 0);
            processed = processed.replace(/\[SECURITY_DEPOSIT\]/g, recordData.security_deposit || 0);
            processed = processed.replace(/\[SETUP_FEE\]/g, recordData.setup_fee || 0);
            processed = processed.replace(/\[NEXT_RENT_DUE\]/g, recordData.next_rent_due_date ? new Date(recordData.next_rent_due_date).toLocaleDateString('en-GB') : 'N/A');
        } else if (agreementType === 'amc') {
            processed = processed.replace(/\[AMC_AMOUNT\]/g, recordData.amc_amount || 0);
            processed = processed.replace(/\[CONTRACT_VALUE\]/g, recordData.amc_amount || 0);
            processed = processed.replace(/\[NEXT_SERVICE_DATE\]/g, recordData.next_service_date ? new Date(recordData.next_service_date).toLocaleDateString('en-GB') : 'N/A');
            
            // Services and Terms from amc_plans
            let servicesHtml = 'N/A';
            if (recordData.amc_plans?.services && Array.isArray(recordData.amc_plans.services) && recordData.amc_plans.services.length > 0) {
                servicesHtml = `<ul style="margin:0; padding-left:20px;">` + recordData.amc_plans.services.map(s => {
                    const name = s.item || s.name || s;
                    const freq = s.frequency ? ` (${s.frequency})` : '';
                    const qty = s.quantity > 1 ? ` x${s.quantity}` : '';
                    return `<li>${name}${qty}${freq}</li>`;
                }).join('') + `</ul>`;
            }
            processed = processed.replace(/\[SERVICES_INCLUDED\]/g, servicesHtml);
            
            let termsHtml = 'N/A';
            if (recordData.amc_plans?.terms) {
                termsHtml = `<p style="white-space: pre-wrap;">${recordData.amc_plans.terms}</p>`;
            } else if (printSettings?.amc_terms && printSettings.amc_terms.length > 0) {
                termsHtml = `<ol style="margin:0; padding-left:20px;">` + printSettings.amc_terms.map(t => `<li style="margin-bottom: 4px;">${t}</li>`).join('') + `</ol>`;
            }
            processed = processed.replace(/\[PLAN_TERMS\]/g, termsHtml);
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
            <div className="modal-overlay" style={{ zIndex: 1200 }}>
                <div className="modal-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                    <RefreshCcw className="animate-spin" size={32} style={{ color: 'var(--text-tertiary)' }} />
                </div>
            </div>
        );
    }

    // Determine specific terms based on type mapping back to db column logic handled in PrintSetup
    const termsList = type === 'rental' ? (settings?.rental_terms || []) : (settings?.amc_terms || []);

    const customer = data?.accounts || {};
    let customerAddressStr = '';
    const specificProp = data?.installation_property || data?.delivery_property;
    if (specificProp) {
        const parts = [
            specificProp.flat_number,
            specificProp.building_name,
            specificProp.address,
            specificProp.locality,
            specificProp.city,
            specificProp.pincode ? `- ${specificProp.pincode}` : ''
        ].filter(Boolean);
        customerAddressStr = parts.join(', ');
    } else if (customer.property) {
        const parts = [
            customer.property.flat_number,
            customer.property.building_name,
            customer.property.address,
            customer.property.locality,
            customer.property.city,
            customer.property.pincode ? `- ${customer.property.pincode}` : ''
        ].filter(Boolean);
        customerAddressStr = parts.join(', ');
    } else {
        customerAddressStr = customer.address || customer.mailing_address || '';
        if (customer.city) customerAddressStr += `, ${customer.city}`;
        if (customer.state) customerAddressStr += `, ${customer.state}`;
        if (customer.pincode) customerAddressStr += ` - ${customer.pincode}`;
    }

    return (
        <div className="modal-overlay print-modal-hide-ui" style={{ zIndex: 1200 }}>
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
                        {/* Watermark Logo */}
                        {settings?.show_logo && (settings?.logo_url || '/logo_watermark.jpg') && (
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                opacity: 0.1,
                                pointerEvents: 'none',
                                zIndex: 0,
                                width: '60%',
                                height: '60%',
                                backgroundImage: `url('${settings?.logo_url || '/logo_watermark.jpg'}')`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                backgroundSize: 'contain'
                            }}></div>
                        )}
                        <div style={{ position: 'relative', zIndex: 1 }}>
                        {/* Company Header matching Invoice */}
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
                                {(type === 'rental' ? settings?.rental_show_gst : settings?.amc_show_gst) && settings?.gst_number && (
                                    <p style={{ margin: '5px 0', fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                                        GSTIN: {settings.gst_number}
                                    </p>
                                )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <h2 style={{ margin: 0, fontSize: '28px', color: '#1e293b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>
                                    {type === 'rental' ? 'RENTAL AGREEMENT' : 'AMC AGREEMENT'}
                                </h2>
                                <div style={{ marginTop: '15px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', textAlign: 'right', fontSize: '13px' }}>
                                        <b style={{ color: '#475569' }}>Agr. ID:</b>
                                        <span>{data.id?.slice(0, 8).toUpperCase() || 'NEW'}</span>
                                        <b style={{ color: '#475569' }}>Date:</b>
                                        <span>{new Date().toLocaleDateString('en-GB')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bill To Section */}
                        <div style={{ marginBottom: '30px' }}>
                            <h3 style={{ fontSize: '14px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Customer Details:</h3>
                            <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>{customer.name || data?.customerName || 'Customer Name'}</div>
                            <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px', maxWidth: '50%' }}>
                                {customerAddressStr ? customerAddressStr : 'Address not provided'}
                            </div>
                            <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                                {customer.phone && `Phone: ${customer.phone}`}
                                {customer.email && ` | Email: ${customer.email}`}
                            </div>
                        </div>

                        {/* Editable Content Area */}
                        <div 
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => setParsedHTML(e.target.innerHTML)}
                            dangerouslySetInnerHTML={{ __html: parsedHTML }}
                            style={{ outline: 'none', minHeight: '300px', fontSize: '13px', color: '#1e293b', lineHeight: '1.8' }}
                        />

                        <div style={{ marginTop: 'auto', paddingTop: '30px' }}>
                            {/* Terms & Conditions (Only shown if [PLAN_TERMS] wasn't used or is a rental) */}
                            {settings?.show_terms && termsList.length > 0 && type === 'rental' && (
                                <div style={{ marginBottom: '30px', borderTop: '1px solid #cbd5e1', paddingTop: '15px' }}>
                                    <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Standard Terms & Conditions
                                    </h4>
                                    <ol style={{ margin: 0, paddingLeft: '15px', fontSize: '11px', color: '#475569', lineHeight: '1.4' }}>
                                        {termsList.map((term, i) => (
                                            <li key={i} style={{ marginBottom: '2px' }}>{term}</li>
                                        ))}
                                    </ol>
                                </div>
                            )}

                            {/* Signatures */}
                            {settings?.include_signature && (
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'flex-end', 
                                    alignItems: 'flex-end',
                                    pageBreakInside: 'avoid'
                                }}>
                                    <div style={{ textAlign: 'center', minWidth: '180px' }}>
                                        <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>For {settings?.company_name}</p>
                                        <div style={{ width: '180px', height: '60px', borderBottom: '1px solid #cbd5e1', marginBottom: '8px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                                            {settings?.signature_url && (
                                                <img src={settings.signature_url} alt="Signature" style={{ maxHeight: '50px', maxWidth: '160px', objectFit: 'contain', marginBottom: '4px' }} />
                                            )}
                                        </div>
                                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>Authorized Signatory</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        </div>
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
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            `}</style>
        </div>
    );
}
