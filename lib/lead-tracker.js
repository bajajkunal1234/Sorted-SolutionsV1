/**
 * Server-side Lead Tracker Utility
 * Maps visitors, clicks, and bookings to lead attributions
 */

/**
 * Normalizes any phone number to the last 10 digits.
 * Returns null if the number is invalid.
 */
export function cleanPhone10(phone) {
    if (!phone) return null;
    const cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.length < 10) return null;
    return cleaned.slice(-10);
}

/**
 * Maps a phone number conversion to a website session and records the attribution.
 * Safe to run on every booking or enquiry.
 * 
 * @param {object} supabase - Supabase client instance
 * @param {object} params
 * @param {string} params.phone - Phone number of the lead
 * @param {string} [params.session_id] - Session UUID
 * @param {string} params.conversion_type - 'web_booking', 'web_enquiry', 'web_call', 'web_whatsapp', 'manual_call', 'manual_whatsapp'
 * @param {string} [params.name] - Customer name
 * @param {string} [params.status] - Lead status: 'interested', 'converted', 'junk', 'lost'
 * @param {string} [params.notes] - Custom notes
 */
export async function trackLeadAttribution(supabase, {
    phone,
    session_id = null,
    conversion_type,
    name = null,
    status = 'interested',
    notes = null
}) {
    try {
        const rawPhone10 = cleanPhone10(phone);
        if (!rawPhone10) return { success: false, error: 'Invalid phone number' };

        let leadSource = 'direct';
        let campaign = null;
        let gclid = null;

        // If no session_id is provided, try to look up the most recent session from the same IP/UserAgent if possible,
        // or just default to direct. Let's see if we have session_id.
        if (session_id) {
            const { data: session, error: sessError } = await supabase
                .from('visitor_sessions')
                .select('utm_source, utm_medium, utm_campaign, gclid, referrer')
                .eq('id', session_id)
                .maybeSingle();

            if (!sessError && session) {
                gclid = session.gclid;
                campaign = session.utm_campaign;

                const utmSource = session.utm_source?.toLowerCase() || '';
                const utmMedium = session.utm_medium?.toLowerCase() || '';

                if (gclid || utmSource.includes('google') || utmSource.includes('ads') || utmMedium.includes('cpc') || utmMedium.includes('ppc') || utmMedium.includes('adwords')) {
                    leadSource = 'google_ads';
                } else if (utmSource) {
                    leadSource = utmSource;
                } else if (session.referrer) {
                    try {
                        const refUrl = new URL(session.referrer);
                        const hostname = refUrl.hostname.toLowerCase();
                        if (hostname.includes('google.')) {
                            leadSource = 'google_organic';
                        } else if (hostname.includes('facebook.com') || hostname.includes('instagram.com')) {
                            leadSource = 'social';
                        } else if (!hostname.includes('sorted') && !hostname.includes('localhost')) {
                            leadSource = hostname;
                        } else {
                            leadSource = 'direct';
                        }
                    } catch {
                        leadSource = 'referral';
                    }
                } else {
                    leadSource = 'direct';
                }
            }
        }

        // Fetch existing lead status first to avoid downgrading a 'converted' lead
        const { data: existingLead } = await supabase
            .from('lead_attributions')
            .select('status, session_id, gclid, campaign, name, lead_source')
            .eq('phone', rawPhone10)
            .maybeSingle();

        // If lead already exists, keep 'converted' status if it's currently 'converted'
        let finalStatus = status;
        if (existingLead?.status === 'converted') {
            finalStatus = 'converted';
        }

        // Preserve GCLID / Campaign / Session ID if we don't have new ones but the existing one did
        const finalSessionId = session_id || existingLead?.session_id || null;
        const finalGclid = gclid || existingLead?.gclid || null;
        const finalCampaign = campaign || existingLead?.campaign || null;
        const finalName = name || existingLead?.name || null;
        const finalLeadSource = (leadSource !== 'direct' || !existingLead?.lead_source) ? leadSource : existingLead.lead_source;

        const { data, error } = await supabase
            .from('lead_attributions')
            .upsert({
                phone: rawPhone10,
                name: finalName,
                session_id: finalSessionId,
                lead_source: finalLeadSource,
                campaign: finalCampaign,
                gclid: finalGclid,
                conversion_type: conversion_type,
                status: finalStatus,
                ...(notes ? { notes } : {}),
                updated_at: new Date().toISOString()
            }, { onConflict: 'phone' })
            .select('*')
            .single();

        if (error) {
            console.error('[lead-tracker] Upsert error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, lead: data };
    } catch (e) {
        console.error('[lead-tracker] Exception:', e);
        return { success: false, error: e.message };
    }
}
