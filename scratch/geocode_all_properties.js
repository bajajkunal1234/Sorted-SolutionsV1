const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GOOGLE_KEY = process.env.GOOGLE_GEOCODING_API_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Key not found in env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function googleGeocode(query) {
    if (!query || query.trim().length < 3) return null;
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_KEY}&region=in&components=country:IN`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        if (data.status === 'OK' && data.results.length > 0) {
            const { lat, lng } = data.results[0].geometry.location;
            return { lat, lng, formatted: data.results[0].formatted_address };
        }
    } catch (_) {}
    return null;
}

async function geocodeAll() {
    console.log('Fetching properties needing geocoding...');
    const { data: properties, error } = await supabase
        .from('properties')
        .select('id, flat_number, building_name, address, locality, city, pincode')
        .is('latitude', null);

    if (error) {
        console.error('Database fetch error:', error);
        return;
    }

    console.log(`Found ${properties.length} properties to geocode.`);
    
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < properties.length; i++) {
        const prop = properties[i];
        const city = prop.city || 'Mumbai';
        const building = prop.building_name || '';
        const street = prop.address || '';
        const locality = prop.locality || '';
        const pincode = prop.pincode || '';

        const queries = [];
        if (building && street && locality) queries.push(`${building}, ${street}, ${locality}, ${city}, India`);
        if (building && locality)           queries.push(`${building}, ${locality}, ${city}, India`);
        if (street && locality)             queries.push(`${street}, ${locality}, ${city}, India`);
        if (locality)                       queries.push(`${locality}, ${city}, India`);
        if (pincode)                        queries.push(`${pincode}, India`);

        let placed = false;
        for (const q of queries) {
            const result = await googleGeocode(q);
            if (result) {
                await supabase
                    .from('properties')
                    .update({ latitude: result.lat, longitude: result.lng })
                    .eq('id', prop.id);
                placed = true;
                succeeded++;
                break;
            }
            await new Promise(r => setTimeout(r, 20));
        }

        if (!placed) {
            failed++;
            console.log(`[${i+1}/${properties.length}] ❌ Failed: ${building || street || locality || pincode}`);
        } else {
            if (succeeded % 50 === 0 || i === properties.length - 1) {
                console.log(`[${i+1}/${properties.length}] Progress: ${succeeded} succeeded, ${failed} failed`);
            }
        }

        // Delay to prevent hitting Google rate limit
        await new Promise(r => setTimeout(r, 60));
    }

    console.log(`\nGeocoding finished: ${succeeded} succeeded, ${failed} failed.`);
}

geocodeAll();
