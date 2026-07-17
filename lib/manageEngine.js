/**
 * ManageEngine MDM Client Library
 * Handles OAuth 2.0 token management and profile association/disassociation over Zoho API.
 */

// In-memory cache for the OAuth access token to avoid redundant refresh calls
let cachedToken = null;
let tokenExpiry = null;

async function getAccessToken() {
    const clientId = process.env.MANAGEENGINE_CLIENT_ID;
    const clientSecret = process.env.MANAGEENGINE_CLIENT_SECRET;
    const refreshToken = process.env.MANAGEENGINE_REFRESH_TOKEN;
    const authUrl = process.env.MANAGEENGINE_AUTH_URL || 'https://accounts.zoho.com/oauth/v2/token';

    if (!clientId || !clientSecret || !refreshToken) {
        // Return null to trigger mock/simulation mode
        return null;
    }

    // Return cached token if still valid (with a 60-second buffer)
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
        return cachedToken;
    }

    try {
        const response = await fetch(authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                refresh_token: refreshToken,
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'refresh_token',
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Failed to refresh ManageEngine token: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        if (!data.access_token) {
            throw new Error('Access token missing in Zoho OAuth response');
        }

        cachedToken = data.access_token;
        // Expire in 'expires_in' seconds (usually 3600 seconds)
        const expiresIn = data.expires_in || 3600;
        tokenExpiry = Date.now() + (expiresIn * 1000);

        return cachedToken;
    } catch (err) {
        console.error('[MDM] Zoho OAuth refresh error:', err.message);
        throw err;
    }
}

/**
 * Associates the On-Duty Kiosk profile to a device
 */
export async function associateKioskProfile(deviceId) {
    if (!deviceId) {
        console.warn('[MDM] No device ID provided. Skipping profile association.');
        return { success: false, error: 'No device ID' };
    }

    const token = await getAccessToken();
    const onDutyProfileId = process.env.MANAGEENGINE_ON_DUTY_PROFILE_ID;
    const offDutyProfileId = process.env.MANAGEENGINE_OFF_DUTY_PROFILE_ID;
    const apiHost = process.env.MANAGEENGINE_API_HOST || 'https://mdm.manageengine.com';

    if (!token || !onDutyProfileId) {
        console.warn(`[MDM SIMULATOR] Device "${deviceId}": Associated On-Duty Kiosk profile (${onDutyProfileId || 'MOCK_ON_DUTY_ID'})`);
        return { success: true, simulated: true };
    }

    try {
        // Step A: Disassociate Off-Duty profile if configured
        if (offDutyProfileId) {
            await disassociateProfile(token, apiHost, deviceId, offDutyProfileId);
        }

        // Step B: Associate On-Duty Kiosk profile
        const result = await associateProfile(token, apiHost, deviceId, onDutyProfileId);
        console.log(`[MDM] Associated Kiosk profile for device ${deviceId} successfully.`);
        return { success: true, ...result };
    } catch (err) {
        console.error(`[MDM] Error associating profile to device ${deviceId}:`, err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Disassociates the On-Duty Kiosk profile and associates Off-Duty profile
 */
export async function disassociateKioskProfile(deviceId) {
    if (!deviceId) {
        console.warn('[MDM] No device ID provided. Skipping profile disassociation.');
        return { success: false, error: 'No device ID' };
    }

    const token = await getAccessToken();
    const onDutyProfileId = process.env.MANAGEENGINE_ON_DUTY_PROFILE_ID;
    const offDutyProfileId = process.env.MANAGEENGINE_OFF_DUTY_PROFILE_ID;
    const apiHost = process.env.MANAGEENGINE_API_HOST || 'https://mdm.manageengine.com';

    if (!token || !onDutyProfileId) {
        console.warn(`[MDM SIMULATOR] Device "${deviceId}": Disassociated On-Duty Kiosk profile & Associated Off-Duty profile (${offDutyProfileId || 'MOCK_OFF_DUTY_ID'})`);
        return { success: true, simulated: true };
    }

    try {
        // Step A: Disassociate On-Duty Kiosk profile
        await disassociateProfile(token, apiHost, deviceId, onDutyProfileId);

        // Step B: Associate Off-Duty profile if configured
        if (offDutyProfileId) {
            await associateProfile(token, apiHost, deviceId, offDutyProfileId);
        }

        console.log(`[MDM] Released Kiosk profile for device ${deviceId} successfully.`);
        return { success: true };
    } catch (err) {
        console.error(`[MDM] Error disassociating profile from device ${deviceId}:`, err.message);
        return { success: false, error: err.message };
    }
}

// Helper: Associate profile call
async function associateProfile(token, host, deviceId, profileId) {
    const url = `${host}/api/v1/mdm/devices/${deviceId}/profiles`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            profile_ids: [profileId],
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Profile association failed: status ${response.status} - ${errText}`);
    }

    return response.json();
}

// Helper: Disassociate profile call
async function disassociateProfile(token, host, deviceId, profileId) {
    const url = `${host}/api/v1/mdm/devices/${deviceId}/profiles`;
    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            profile_ids: [profileId],
        }),
    });

    if (!response.ok) {
        // Some MDM servers require POSTing to /disassociate instead of DELETE
        // We will catch and retry if needed, but standardizing on DELETE or retrying POST:
        const disassociateUrl = `${host}/api/v1/mdm/devices/${deviceId}/profiles/disassociate`;
        const retryResponse = await fetch(disassociateUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                profile_ids: [profileId],
            }),
        });

        if (!retryResponse.ok) {
            const errText = await retryResponse.text();
            throw new Error(`Profile disassociation failed on both methods: ${errText}`);
        }
        return retryResponse.json();
    }

    return response.json();
}
