const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oqwvbwaqcdbggcqvzswv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkyMDY2NiwiZXhwIjoyMDg2NDk2NjY2fQ.TdS9UKZH4L0PQvlZxa4fCbYiILikhTbKEi0MRpu-9s4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function geocodeAddress() {
    const address = "Orchard Mall Royal Palms Goregaon East Mumbai";
    
    // Fetch google maps key from database settings table
    const { data, error } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', 'google_maps_api_key')
        .maybeSingle();

    if (error || !data) {
        console.log("Failed to fetch API key:", error);
        return;
    }

    const apiKey = data.value;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

    const res = await fetch(url);
    const json = await res.json();
    if (json.status === 'OK' && json.results.length > 0) {
        const loc = json.results[0].geometry.location;
        console.log("SERVICE CENTER COORDINATES:", loc);
    } else {
        console.log("Geocoding failed:", json);
    }
}

geocodeAddress();
