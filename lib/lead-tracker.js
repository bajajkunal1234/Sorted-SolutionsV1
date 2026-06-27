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
    notes = null,
    lead_source = null,
    campaign = null,
    first_contact_at = null
}) {
    try {
        const rawPhone10 = cleanPhone10(phone);
        if (!rawPhone10) return { success: false, error: 'Invalid phone number' };

        let leadSource = lead_source || 'direct';
        let finalCampaign = campaign || null;
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
                if (!finalCampaign) finalCampaign = session.utm_campaign;

                const utmSource = session.utm_source?.toLowerCase() || '';
                const utmMedium = session.utm_medium?.toLowerCase() || '';

                if (!lead_source) {
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
        }

        // Fetch existing lead status first to avoid downgrading a 'converted' lead
        const { data: existingLead } = await supabase
            .from('lead_attributions')
            .select('status, session_id, gclid, campaign, name, lead_source, first_contact_at, conversion_type')
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
        const resolvedCampaign = finalCampaign || existingLead?.campaign || null;
        const finalName = name || existingLead?.name || null;
        const finalLeadSource = (leadSource !== 'direct' || !existingLead?.lead_source) ? leadSource : existingLead.lead_source;

        // Preserve website conversion type if incoming is manual
        let finalConversionType = conversion_type;
        if (existingLead && existingLead.conversion_type) {
            const isExistingWeb = existingLead.conversion_type.startsWith('web_');
            const isIncomingManual = conversion_type.startsWith('manual_');
            if (isExistingWeb && isIncomingManual) {
                finalConversionType = existingLead.conversion_type;
            }
        }

        // Preserve first_contact_at if it exists, unless the new one is earlier
        let finalFirstContactAt = first_contact_at ? new Date(first_contact_at).toISOString() : null;
        if (existingLead && existingLead.first_contact_at) {
            if (finalFirstContactAt) {
                const existingTime = new Date(existingLead.first_contact_at).getTime();
                const newTime = new Date(finalFirstContactAt).getTime();
                if (existingTime < newTime) {
                    finalFirstContactAt = existingLead.first_contact_at;
                }
            } else {
                finalFirstContactAt = existingLead.first_contact_at;
            }
        } else if (!finalFirstContactAt) {
            finalFirstContactAt = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('lead_attributions')
            .upsert({
                phone: rawPhone10,
                name: finalName,
                session_id: finalSessionId,
                lead_source: finalLeadSource,
                campaign: resolvedCampaign,
                gclid: finalGclid,
                conversion_type: finalConversionType,
                status: finalStatus,
                ...(notes ? { notes } : {}),
                first_contact_at: finalFirstContactAt,
                updated_at: new Date().toISOString()
            }, { onConflict: 'phone' })
            .select('*')
            .single();

        if (error) {
            console.error('[lead-tracker] Upsert error:', error);
            return { success: false, error: error.message };
        }

        const alreadyExisted = !!existingLead;
        return { success: true, lead: data, alreadyExisted };
    } catch (e) {
        console.error('[lead-tracker] Exception:', e);
        return { success: false, error: e.message };
    }
}
