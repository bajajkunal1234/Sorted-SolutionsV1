import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { cleanPhone10, trackLeadAttribution } from '@/lib/lead-tracker';

export const dynamic = 'force-dynamic';

// GET /api/admin/leads
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || '30d'; // today, yesterday, 7d, 30d, 90d, all, custom

        const supabase = createServerSupabase();
        if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

        // Calculate date boundaries
        const startDate = new Date();
        const endDate = new Date();

        if (range === 'today') {
            startDate.setHours(0, 0, 0, 0);
        } else if (range === 'yesterday') {
            startDate.setDate(startDate.getDate() - 1);
            startDate.setHours(0, 0, 0, 0);
            
            endDate.setDate(endDate.getDate() - 1);
            endDate.setHours(23, 59, 59, 999);
        } else if (range === 'custom') {
            const startParam = searchParams.get('start');
            const endParam = searchParams.get('end');
            if (startParam && endParam) {
                const sParts = startParam.split('-');
                const eParts = endParam.split('-');
                if (sParts.length === 3 && eParts.length === 3) {
                    startDate.setFullYear(parseInt(sParts[0]), parseInt(sParts[1]) - 1, parseInt(sParts[2]));
                    startDate.setHours(0, 0, 0, 0);

                    endDate.setFullYear(parseInt(eParts[0]), parseInt(eParts[1]) - 1, parseInt(eParts[2]));
                    endDate.setHours(23, 59, 59, 999);
                }
            }
        } else if (range === '7d') {
            startDate.setDate(startDate.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
        } else if (range === '30d') {
            startDate.setDate(startDate.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);
        } else if (range === '90d') {
            startDate.setDate(startDate.getDate() - 90);
            startDate.setHours(0, 0, 0, 0);
        } else {
            // all time
            startDate.setFullYear(startDate.getFullYear() - 10);
        }

        // 1. Fetch leads
        let leadQuery = supabase
            .from('lead_attributions')
            .select('*')
            .order('first_contact_at', { ascending: false });
        
        if (range !== 'all') {
            leadQuery = leadQuery
                .gte('first_contact_at', startDate.toISOString())
                .lte('first_contact_at', endDate.toISOString());
        }

        const { data: leads, error: leadError } = await leadQuery;
        if (leadError) throw leadError;

        if (!leads || leads.length === 0) {
            return NextResponse.json({ success: true, leads: [], summary: {} });
        }

        // Extract phone numbers and session IDs
        const phones = leads.map(l => l.phone);
        const sessionIds = leads.map(l => l.session_id).filter(Boolean);

        // Fetch related data in parallel
        const [
            { data: sessions },
            { data: pageViews },
            { data: clicks },
            { data: customers },
            { data: accounts },
            { data: jobs },
            { data: invoices },
            { data: dailyMetrics }
        ] = await Promise.all([
            // Sessions
            sessionIds.length > 0 ? 
                supabase.from('visitor_sessions').select('*').in('id', sessionIds) : 
                Promise.resolve({ data: [] }),
            // Page Views
            sessionIds.length > 0 ? 
                supabase.from('page_views').select('*').in('session_id', sessionIds).order('created_at', { ascending: true }) : 
                Promise.resolve({ data: [] }),
            // Visitor Click events
            sessionIds.length > 0 ? 
                supabase.from('visitor_clicks').select('*').in('session_id', sessionIds).order('created_at', { ascending: true }) : 
                Promise.resolve({ data: [] }),
            // Customers
            supabase.from('customers').select('id, name, phone, ledger_id, created_at'),
            // Accounts
            supabase.from('accounts').select('id, name, phone, mobile, created_at'),
            // Jobs (Website or Admin created)
            supabase.from('jobs').select('id, job_number, customer_id, customer_name, status, category, subcategory, amount, source, created_at, notes'),
            // Invoices
            supabase.from('sales_invoices').select('id, job_id, total_amount, status, created_at'),
            // Daily Ad Spend metrics
            supabase.from('google_ads_daily_metrics')
                .select('*')
                .gte('date', startDate.toISOString().split('T')[0])
                .lte('date', endDate.toISOString().split('T')[0])
        ]);

        // Build mappings in memory
        const sessionMap = {};
        (sessions || []).forEach(s => { sessionMap[s.id] = s; });

        const pageViewsMap = {};
        (pageViews || []).forEach(pv => {
            if (!pageViewsMap[pv.session_id]) pageViewsMap[pv.session_id] = [];
            pageViewsMap[pv.session_id].push(pv);
        });

        const clicksMap = {};
        (clicks || []).forEach(c => {
            if (!clicksMap[c.session_id]) clicksMap[c.session_id] = [];
            clicksMap[c.session_id].push(c);
        });

        // Map customers by clean 10-digit phone
        const customerMap = {};
        (customers || []).forEach(c => {
            const clean = cleanPhone10(c.phone);
            if (clean) customerMap[clean] = c;
        });

        // Map jobs and invoices
        const jobsByPhoneMap = {};
        (jobs || []).forEach(j => {
            // Find phone number associated with the job
            let phone = null;
            if (j.customer_id) {
                const cx = (customers || []).find(c => c.id === j.customer_id || c.ledger_id === j.customer_id);
                if (cx) {
                    phone = cleanPhone10(cx.phone);
                } else {
                    const acc = (accounts || []).find(a => a.id === j.customer_id);
                    if (acc) {
                        phone = cleanPhone10(acc.mobile || acc.phone);
                    }
                }
            }
            if (!phone && j.customer_name) {
                const cleanName = j.customer_name.toLowerCase().trim();
                const cx = (customers || []).find(c => c.name && c.name.toLowerCase().trim() === cleanName);
                if (cx) {
                    phone = cleanPhone10(cx.phone);
                } else {
                    const acc = (accounts || []).find(a => a.name && a.name.toLowerCase().trim() === cleanName);
                    if (acc) {
                        phone = cleanPhone10(acc.mobile || acc.phone);
                    }
                }
            }
            if (!phone && j.notes) {
                try {
                    const notesObj = typeof j.notes === 'string' ? JSON.parse(j.notes) : j.notes;
                    if (notesObj?.customer?.phone) {
                        phone = cleanPhone10(notesObj.customer.phone);
                    }
                } catch {}
            }

            if (phone) {
                if (!jobsByPhoneMap[phone]) jobsByPhoneMap[phone] = [];
                jobsByPhoneMap[phone].push(j);
            }
        });

        const invoiceMap = {};
        (invoices || []).forEach(inv => {
            if (inv.job_id) invoiceMap[inv.job_id] = inv;
        });

        // Stitch leads details
        const enrichedLeads = leads.map(lead => {
            const cleanPhone = lead.phone;
            const session = lead.session_id ? sessionMap[lead.session_id] : null;
            const matchedCustomer = customerMap[cleanPhone];
            const matchedJobs = jobsByPhoneMap[cleanPhone] || [];

            // Calculate revenue and invoices
            let totalBilled = 0;
            let jobsCount = matchedJobs.length;
            let completedJobsCount = 0;

            const jobDetails = matchedJobs.map(j => {
                const inv = invoiceMap[j.id];
                const revenue = inv && inv.status !== 'draft' ? parseFloat(inv.total_amount || '0') : 0;
                totalBilled += revenue;

                if (j.status === 'completed') {
                    completedJobsCount++;
                }

                return {
                    id: j.id,
                    jobNumber: j.job_number,
                    status: j.status,
                    category: j.category,
                    subcategory: j.subcategory,
                    source: j.source,
                    amount: parseFloat(j.amount || '0'),
                    revenue: revenue,
                    created_at: j.created_at
                };
            });

            // If the customer has created jobs or completed jobs, mark lead status as converted automatically
            let leadStatus = lead.status;
            if (jobsCount > 0 && leadStatus !== 'converted') {
                leadStatus = 'converted';
            }

            // Build Journey Timeline
            const journey = [];

            // 1. Landing / Session Start
            if (session) {
                journey.push({
                    timestamp: session.created_at,
                    event: `Landed on website from ${lead.lead_source === 'google_ads' ? 'Google Ads' : lead.lead_source}`,
                    details: `Referrer: ${session.referrer || 'Direct'} · Campaign: ${session.utm_campaign || 'N/A'}`,
                    type: 'landing'
                });

                // Page Views
                const pvs = pageViewsMap[lead.session_id] || [];
                pvs.forEach(pv => {
                    journey.push({
                        timestamp: pv.created_at,
                        event: `Viewed page: ${pv.page_path}`,
                        details: pv.duration_seconds > 0 ? `Stayed for ${pv.duration_seconds}s` : null,
                        type: 'pageview'
                    });
                });

                // Clicks
                const clks = clicksMap[lead.session_id] || [];
                clks.forEach(c => {
                    journey.push({
                        timestamp: c.created_at,
                        event: `Clicked ${c.click_type === 'whatsapp' ? 'WhatsApp' : 'Call'} button`,
                        details: `On page: ${c.page_path}`,
                        type: 'click'
                    });
                });
            }

            // 2. Conversion/Attribution Event
            journey.push({
                timestamp: lead.first_contact_at,
                event: `First Contact Captured (${lead.conversion_type?.replace(/_/g, ' ') || 'direct'})`,
                details: `Source: ${lead.lead_source} · Campaign: ${lead.campaign || 'N/A'}`,
                type: 'contact'
            });

            // 3. Jobs/Bookings events
            matchedJobs.forEach(j => {
                const inv = invoiceMap[j.id];
                journey.push({
                    timestamp: j.created_at,
                    event: `Job ${j.job_number} created (Source: ${j.source})`,
                    details: `Category: ${j.category} · Status: ${j.status}`,
                    type: 'job'
                });

                if (j.status === 'completed') {
                    journey.push({
                        timestamp: j.updated_at || j.created_at, // approximation
                        event: `Job ${j.job_number} Completed`,
                        details: inv ? `Billed ₹${parseFloat(inv.total_amount).toLocaleString()}` : `Billed ₹${parseFloat(j.amount).toLocaleString()}`,
                        type: 'job_completed'
                    });
                }
            });

            // Sort journey timeline ascending by timestamp
            journey.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            return {
                ...lead,
                customer: matchedCustomer ? { id: matchedCustomer.id, name: matchedCustomer.name, email: matchedCustomer.email } : null,
                session: session ? { ip: session.ip_address, referrer: session.referrer, utm_campaign: session.utm_campaign, utm_source: session.utm_source } : null,
                jobs: jobDetails,
                totalRevenue: totalBilled,
                jobsCount,
                completedJobsCount,
                status: leadStatus,
                journey
            };
        });

        // Calculate aggregate statistics for Google Ads ROI
        let adsLeadCount = 0;
        let adsConvertedCount = 0;
        let adsRevenue = 0;
        let totalAdsSpend = 0;
        let totalAdsClicks = 0;
        let totalAdsImpressions = 0;

        enrichedLeads.forEach(l => {
            if (l.lead_source === 'google_ads') {
                adsLeadCount++;
                if (l.status === 'converted' || l.jobsCount > 0) {
                    adsConvertedCount++;
                }
                adsRevenue += l.totalRevenue;
            }
        });

        (dailyMetrics || []).forEach(m => {
            totalAdsSpend += parseFloat(m.amount_spent || '0');
            totalAdsClicks += parseInt(m.clicks || '0');
            totalAdsImpressions += parseInt(m.impressions || '0');
        });

        const summary = {
            adsLeads: adsLeadCount,
            adsConversions: adsConvertedCount,
            adsRevenue: adsRevenue,
            adsSpend: totalAdsSpend,
            adsClicks: totalAdsClicks,
            adsImpressions: totalAdsImpressions,
            cpl: adsLeadCount > 0 ? (totalAdsSpend / adsLeadCount) : 0,
            cpc: totalAdsClicks > 0 ? (totalAdsSpend / totalAdsClicks) : 0,
            ctr: totalAdsImpressions > 0 ? (totalAdsClicks / totalAdsImpressions) * 100 : 0,
            roas: totalAdsSpend > 0 ? (adsRevenue / totalAdsSpend) : 0,
            conversionRate: adsLeadCount > 0 ? (adsConvertedCount / adsLeadCount) * 100 : 0
        };

        return NextResponse.json({
            success: true,
            leads: enrichedLeads,
            summary
        });

    } catch (error) {
        console.error('[leads GET error]', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST /api/admin/leads
// Logs a manual call / WhatsApp lead, or automatically matches it to a visitor session
export async function POST(request) {
    try {
        const body = await request.json();
        const { phone, name, type, date, notes, status = 'interested' } = body;

        if (!phone || !type) {
            return NextResponse.json({ success: false, error: 'Phone and type are required' }, { status: 400 });
        }

        const rawPhone10 = cleanPhone10(phone);
        if (!rawPhone10) {
            return NextResponse.json({ success: false, error: 'Invalid 10-digit phone number' }, { status: 400 });
        }

        const supabase = createServerSupabase();
        if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

        // Search for matching untracked visitor click events close to the call time
        const loggedTime = new Date(date || new Date());
        const windowStart = new Date(loggedTime.getTime() - 45 * 60 * 1000); // 45 mins before
        const windowEnd = new Date(loggedTime.getTime() + 15 * 60 * 1000);  // 15 mins after

        // Fetch candidate clicks of the same type ('call' or 'whatsapp')
        const { data: clicks, error: clickErr } = await supabase
            .from('visitor_clicks')
            .select(`
                id,
                session_id,
                click_type,
                created_at,
                visitor_sessions (
                    id,
                    utm_source,
                    utm_campaign,
                    gclid,
                    referrer,
                    created_at
                )
            `)
            .eq('click_type', type === 'whatsapp' ? 'whatsapp' : 'call')
            .gte('created_at', windowStart.toISOString())
            .lte('created_at', windowEnd.toISOString())
            .order('created_at', { ascending: false });

        if (clickErr) throw clickErr;

        // Fetch session IDs already claimed in lead_attributions
        const { data: claimedLeads } = await supabase
            .from('lead_attributions')
            .select('session_id')
            .not('session_id', 'is', null);

        const claimedSessionIds = new Set((claimedLeads || []).map(l => l.session_id));

        // Find the best matching visitor click (which is untracked/unclaimed)
        let matchedSessionId = null;
        let matchedClick = null;

        if (clicks && clicks.length > 0) {
            // Priority 1: Google Ads click (has gclid or utm_source google)
            matchedClick = clicks.find(c => {
                if (!c.session_id || claimedSessionIds.has(c.session_id)) return false;
                const sess = c.visitor_sessions;
                if (!sess) return false;
                const src = sess.utm_source?.toLowerCase() || '';
                return sess.gclid || src.includes('google') || src.includes('ads');
            });

            // Priority 2: Any unclaimed session click
            if (!matchedClick) {
                matchedClick = clicks.find(c => c.session_id && !claimedSessionIds.has(c.session_id));
            }

            if (matchedClick) {
                matchedSessionId = matchedClick.session_id;
            }
        }

        // Trigger trackLeadAttribution
        const conversionType = type === 'whatsapp' ? 'manual_whatsapp' : 'manual_call';
        const result = await trackLeadAttribution(supabase, {
            phone,
            session_id: matchedSessionId,
            conversion_type: conversionType,
            name,
            status,
            notes: notes || (matchedSessionId ? `Auto-linked to website click session.` : `Manual lead log.`)
        });

        if (!result.success) throw new Error(result.error);

        return NextResponse.json({
            success: true,
            lead: result.lead,
            matchedSession: matchedClick ? matchedClick.visitor_sessions : null
        });

    } catch (error) {
        console.error('[leads POST error]', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// PUT /api/admin/leads
// Updates lead status or notes
export async function PUT(request) {
    try {
        const body = await request.json();
        const { phone, status, notes } = body;

        if (!phone) {
            return NextResponse.json({ success: false, error: 'Phone is required' }, { status: 400 });
        }

        const rawPhone10 = cleanPhone10(phone);
        if (!rawPhone10) {
            return NextResponse.json({ success: false, error: 'Invalid phone number' }, { status: 400 });
        }

        const supabase = createServerSupabase();
        if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

        const updatePayload = {};
        if (status) updatePayload.status = status;
        if (notes !== undefined) updatePayload.notes = notes;

        const { data, error } = await supabase
            .from('lead_attributions')
            .update(updatePayload)
            .eq('phone', rawPhone10)
            .select('*')
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('[leads PUT error]', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
