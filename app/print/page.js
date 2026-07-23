'use client'

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function PrintViewContent() {
    const searchParams = useSearchParams();
    const type = searchParams.get('type');
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

                // 2. Fetch Transaction Details
                const apiType = type === 'sales_invoices' || type === 'sales' ? 'sales' : 'quotation';
                const txRes = await fetch(`/api/admin/transactions?type=${apiType}&id=${id}`);
                const txData = await txRes.json();
                if (!txData.success || !txData.data || txData.data.length === 0) {
                    throw new Error('Transaction not found');
                }
                const tx = txData.data[0];

                // 3. Format transaction details for template engine
                const itemForPrint = {
                    ...tx,
                    account_name: tx.accounts?.name || tx.account_name || '',
                    account_phone: tx.accounts?.mobile || tx.accounts?.phone || tx.account_phone || '',
                    account_address: tx.accounts?.address || tx.account_address || tx.billing_address || '',
                    job_number: tx.jobs?.job_number || tx.job_number || '',
                    date: tx.created_at || tx.date || new Date().toISOString()
                };

                const tabType = apiType === 'sales' ? 'sales' : 'quotations';

                // 4. Generate print HTML using global print engine
                if (typeof window !== 'undefined' && window.generatePrintHtml) {
                    const html = window.generatePrintHtml(itemForPrint, tabType, settingsData.data);
                    
                    // Rewrite page innerHTML
                    document.open();
                    document.write(html);
                    document.close();

                    // Trigger printing/save as PDF
                    setTimeout(() => {
                        window.print();
                    }, 500);
                } else {
                    throw new Error('Print engine script not ready. Please refresh.');
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
