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
        if (!res.ok) {
            console.error(`Fetch error for query "${query}": Status ${res.status}`);
            return null;
        }
        const data = await res.json();
        console.log(`Geocode response status for "${query}":`, data.status);
        if (data.status === 'OK' && data.results.length > 0) {
            const { lat, lng } = data.results[0].geometry.location;
            return { lat, lng, formatted: data.results[0].formatted_address };
        } else {
            console.error(`Google API Error for "${query}":`, data.error_message || data.status);
        }
    } catch (err) {
        console.error(`Exception during geocoding:`, err);
    }
    return null;
}

async function testGeocoding() {
    console.log('Fetching up to 3 properties needing geocoding...');
    const { data: properties, error } = await supabase
        .from('properties')
        .select('id, flat_number, building_name, address, locality, city, pincode')
        .is('latitude', null)
        .limit(3);

    if (error) {
        console.error('Database fetch error:', error);
        return;
    }

    if (!properties || properties.length === 0) {
        console.log('No properties need geocoding!');
        return;
    }

    console.log(`Found ${properties.length} properties to test.`);
    
    for (const prop of properties) {
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

        console.log(`\nProperty ID ${prop.id}:`);
        console.log(`Address: ${building} | ${street} | ${locality} | ${pincode}`);
        console.log(`Queries to attempt:`, queries);

        let placed = false;
        for (const q of queries) {
            const result = await googleGeocode(q);
            if (result) {
                console.log(`✅ Success! Resolved to:`, result);
                placed = true;
                break;
            }
        }
        if (!placed) {
            console.log(`❌ Failed to geocode property ${prop.id}`);
        }
    }
}

testGeocoding();
