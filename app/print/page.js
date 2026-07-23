'use client'

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function PrintViewContent() {
    const searchParams = useSearchParams();
    const type = searchParams.get('type'); // sales, quotations, amc, rental
    const id = searchParams.get('id');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!type || !id) {
            setError('Missing type or id parameters');
            setLoading(false);
            return;
        }

        async function loadAndPrint() {
            try {
                // 1. Fetch Print Settings
                const settingsRes = await fetch('/api/admin/print-settings');
                const settingsData = await settingsRes.json();
                if (!settingsData.success) throw new Error(settingsData.error || 'Failed to load print settings');
                const settings = settingsData.data;

                if (type === 'amc' || type === 'rental') {
                    // --- Handle AMC and Rental Agreement Printing ---
                    const agreementsRes = await fetch(`/api/admin/settings/agreements`);
                    const agreementsData = await agreementsRes.json();
                    if (!agreementsData.success) throw new Error(agreementsData.error || 'Failed to load agreement templates');
                    
                    const template = agreementsData.data.find(t => t.type === type);
                    if (!template) throw new Error(`Agreement template of type '${type}' not found`);

                    const activeRes = await fetch(type === 'amc' ? `/api/admin/amc?type=active&id=${id}` : `/api/admin/rentals?type=active&id=${id}`);
                    const activeData = await activeRes.json();
                    if (!activeData.success || !activeData.data || activeData.data.length === 0) {
                        throw new Error('Active agreement record not found');
                    }
                    const recordData = activeData.data[0];

                    const html = generateAgreementHtml(type, recordData, settings, template.content);
                    
                    document.open();
                    document.write(html);
                    document.close();

                    setTimeout(() => {
                        window.print();
                    }, 500);
                } else {
                    // --- Handle Transaction Invoice & Quotation Printing ---
                    const apiType = type === 'sales_invoices' || type === 'sales' ? 'sales' : 'quotation';
                    const txRes = await fetch(`/api/admin/transactions?type=${apiType}&id=${id}`);
                    const txData = await txRes.json();
                    if (!txData.success || !txData.data || txData.data.length === 0) {
                        throw new Error('Transaction not found');
                    }
                    const tx = txData.data[0];

                    const itemForPrint = {
                        ...tx,
                        account_name: tx.accounts?.name || tx.account_name || '',
                        account_phone: tx.accounts?.mobile || tx.accounts?.phone || tx.account_phone || '',
                        account_address: tx.accounts?.address || tx.account_address || tx.billing_address || '',
                        job_number: tx.jobs?.job_number || tx.job_number || '',
                        date: tx.created_at || tx.date || new Date().toISOString()
                    };

                    const tabType = apiType === 'sales' ? 'sales' : 'quotations';

                    if (typeof window !== 'undefined' && window.generatePrintHtml) {
                        const html = window.generatePrintHtml(itemForPrint, tabType, settings);
                        
                        document.open();
                        document.write(html);
                        document.close();

                        setTimeout(() => {
                            window.print();
                        }, 500);
                    } else {
                        throw new Error('Print engine script not ready. Please refresh.');
                    }
                }
            } catch (err) {
                console.error(err);
                setError(err.message);
                setLoading(false);
            }
        }

        const timer = setTimeout(loadAndPrint, 500);
        return () => clearTimeout(timer);
    }, [type, id]);

    if (error) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif', color: '#ef4444' }}>
                <h3>Error Loading Document</h3>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', fontFamily: 'sans-serif', color: '#334155' }}>
            <Loader2 className="animate-spin" size={32} style={{ color: '#6366f1' }} />
            <p style={{ fontSize: '15px', fontWeight: 500 }}>Generating print view...</p>
        </div>
    );
}

function generateAgreementHtml(type, recordData, settings, templateContent) {
    const customer = recordData.accounts || {};
    const planName = recordData.product_name || recordData.plan_name || 'N/A';
    const serialNumber = recordData.serial_number || 'N/A';

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

    const formatMobileNumber = (num) => String(num).replace(/(\d{5})(\d{5})/, '$1 $2');
    const customerPhone = customer.phone ? formatMobileNumber(customer.phone) : 'N/A';

    let processed = templateContent || '';
    processed = processed.replace(/\[CUSTOMER_NAME\]/g, customer.name || 'N/A');
    processed = processed.replace(/\[CUSTOMER_ADDRESS\]/g, addressStr || 'N/A');
    processed = processed.replace(/\[CUSTOMER_PHONE\]/g, customerPhone);
    processed = processed.replace(/\[CUSTOMER_EMAIL\]/g, customer.email || 'N/A');
    processed = processed.replace(/\[PRODUCT_NAME\]/g, planName);
    processed = processed.replace(/\[PRODUCT_BRAND\]/g, recordData.product_brand || 'N/A');
    processed = processed.replace(/\[PRODUCT_MODEL\]/g, recordData.product_model || 'N/A');
    processed = processed.replace(/\[SERIAL_NUMBER\]/g, serialNumber);
    processed = processed.replace(/\[START_DATE\]/g, recordData.start_date ? new Date(recordData.start_date).toLocaleDateString('en-GB') : 'N/A');
    processed = processed.replace(/\[END_DATE\]/g, recordData.end_date ? new Date(recordData.end_date).toLocaleDateString('en-GB') : 'N/A');
    processed = processed.replace(/\[TODAYS_DATE\]/g, new Date().toLocaleDateString('en-GB'));

    if (type === 'rental') {
        processed = processed.replace(/\[MONTHLY_RENT\]/g, recordData.monthly_rent || 0);
        processed = processed.replace(/\[SECURITY_DEPOSIT\]/g, recordData.security_deposit || 0);
        processed = processed.replace(/\[SETUP_FEE\]/g, recordData.setup_fee || 0);
        processed = processed.replace(/\[NEXT_RENT_DUE\]/g, recordData.next_rent_due_date ? new Date(recordData.next_rent_due_date).toLocaleDateString('en-GB') : 'N/A');
    } else if (type === 'amc') {
        processed = processed.replace(/\[AMC_AMOUNT\]/g, recordData.amc_amount || 0);
        processed = processed.replace(/\[CONTRACT_VALUE\]/g, recordData.amc_amount || 0);
        processed = processed.replace(/\[NEXT_SERVICE_DATE\]/g, recordData.next_service_date ? new Date(recordData.next_service_date).toLocaleDateString('en-GB') : 'N/A');
        
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
        } else if (settings?.amc_terms && settings.amc_terms.length > 0) {
            termsHtml = `<ol style="margin:0; padding-left:20px;">` + settings.amc_terms.map(t => `<li style="margin-bottom: 4px;">${t}</li>`).join('') + `</ol>`;
        }
        processed = processed.replace(/\[PLAN_TERMS\]/g, termsHtml);
    }

    processed = processed.replace(/\[COMPANY_NAME\]/g, settings.company_name || 'Sorted Solutions');
    processed = processed.replace(/\[COMPANY_PHONE\]/g, settings.company_phone || '');
    processed = processed.replace(/\[COMPANY_EMAIL\]/g, settings.company_email || '');

    const termsList = type === 'rental' ? (settings.rental_terms || []) : (settings.amc_terms || []);
    const showGst = type === 'rental' ? settings.rental_show_gst : settings.amc_show_gst;

    return `
    <html>
    <head>
        <title>${type === 'rental' ? 'Rental' : 'AMC'} Agreement_${recordData.id?.slice(0,8)}</title>
        <style>
            @media print {
                body { margin: 0; padding: 0; background-color: #fff; }
                .no-print { display: none !important; }
                .print-page { border: none !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; width: 100% !important; min-height: 0 !important; }
            }
            body { background-color: #f1f5f9; margin: 20px; font-family: Arial, sans-serif; color: #1e293b; }
            .print-page {
                width: 210mm;
                min-height: 297mm;
                padding: 20mm;
                background-color: #ffffff;
                color: #000000;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                margin: 0 auto;
                position: relative;
                box-sizing: border-box;
                font-size: ${settings.font_size === 'small' ? '12px' : settings.font_size === 'large' ? '16px' : '14px'};
                line-height: 1.6;
            }
        </style>
    </head>
    <body>
        <div class="print-page">
            ${settings.show_logo && (settings.logo_url || '/logo_watermark.jpg') ? `
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.1; pointer-events: none; z-index: 0; width: 60%; height: 60%; background-image: url('${settings.logo_url || '/logo_watermark.jpg'}'); background-repeat: no-repeat; background-position: center; background-size: contain;"></div>
            ` : ''}
            <div style="position: relative; z-index: 1;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #1e293b; padding-bottom: 20px;">
                    <div>
                        ${settings.show_logo && settings.logo_url ? `
                        <img src="${settings.logo_url}" alt="Logo" style="height: 60px; margin-bottom: 10px;" />
                        ` : ''}
                        <h1 style="margin: 0; font-size: 24px; color: #1e293b; font-weight: 700;">
                            ${settings.company_name || 'Sorted Solutions'}
                        </h1>
                        <p style="margin: 5px 0; font-size: 12px; color: #64748b; white-space: pre-wrap;">
                            ${settings.company_address}
                        </p>
                        <p style="margin: 5px 0; font-size: 12px; color: #64748b;">
                            ${settings.company_phone} | ${settings.company_email}
                        </p>
                        ${showGst && settings.gst_number ? `
                        <p style="margin: 5px 0; font-size: 12px; color: #64748b; font-family: monospace;">
                            GSTIN: ${settings.gst_number}
                        </p>
                        ` : ''}
                    </div>
                    <div style="text-align: right;">
                        <h2 style="margin: 0; font-size: 28px; color: #1e293b; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">
                            ${type === 'rental' ? 'RENTAL AGREEMENT' : 'AMC AGREEMENT'}
                        </h2>
                        <div style="margin-top: 15px;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; text-align: right; font-size: 13px;">
                                <b style="color: #475569;">Agr. ID:</b>
                                <span>${recordData.id?.slice(0, 8).toUpperCase() || 'NEW'}</span>
                                <b style="color: #475569;">Date:</b>
                                <span>${new Date().toLocaleDateString('en-GB')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 30px;">
                    <h3 style="font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Customer Details:</h3>
                    <div style="font-size: 14px; color: #1e293b; font-weight: 600;">${customer.name || recordData.customerName || 'Customer Name'}</div>
                    <div style="font-size: 13px; color: #475569; margin-top: 4px; max-width: 50%;">
                        ${addressStr ? addressStr : 'Address not provided'}
                    </div>
                    <div style="font-size: 13px; color: #475569; margin-top: 4px;">
                        ${customer.phone ? `Phone: ${customerPhone}` : ''}
                        ${customer.email ? ` | Email: ${customer.email}` : ''}
                    </div>
                </div>

                <div style="outline: none; min-height: 300px; font-size: 13px; color: #1e293b; line-height: 1.8;">
                    ${processed}
                </div>

                <div style="margin-top: auto; padding-top: 30px;">
                    ${settings.show_terms && termsList.length > 0 && type === 'rental' ? `
                    <div style="margin-bottom: 30px; border-top: 1px solid #cbd5e1; padding-top: 15px;">
                        <h4 style="font-size: 13px; font-weight: 600; margin-bottom: 8px; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px;">
                            Standard Terms & Conditions
                        </h4>
                        <ol style="margin: 0; padding-left: 15px; font-size: 11px; color: #475569; line-height: 1.4;">
                            ${termsList.map(t => `<li style="margin-bottom: 2px;">${t}</li>`).join('')}
                        </ol>
                    </div>
                    ` : ''}

                    ${settings.include_signature ? `
                    <div style="display: flex; justify-content: flex-end; align-items: flex-end; page-break-inside: avoid;">
                        <div style="text-align: center; min-width: 180px;">
                            <p style="margin: 0; font-size: 11px; color: #64748b;">For ${settings.company_name}</p>
                            <div style="width: 180px; height: 60px; border-bottom: 1px solid #cbd5e1; margin-bottom: 8px; display: flex; align-items: flex-end; justify-content: center;">
                                ${settings.signature_url ? `
                                <img src="${settings.signature_url}" alt="Signature" style="max-height: 50px; max-width: 160px; object-fit: contain; margin-bottom: 4px;" />
                                ` : ''}
                            </div>
                            <p style="margin: 0; font-size: 12px; font-weight: 600; color: #1e293b;">Authorized Signatory</p>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

export default function PrintPage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
                <Loader2 className="animate-spin" size={32} style={{ color: '#6366f1' }} />
            </div>
        }>
            <PrintViewContent />
        </Suspense>
    );
}
