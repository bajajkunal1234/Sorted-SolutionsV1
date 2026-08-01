const fs = require('fs');
const path = require('path');

function getEnvKey() {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(/GOOGLE_GEOCODING_API_KEY=(.*)/);
        if (match) return match[1].trim();
    }
    return null;
}

async function geocode() {
    const key = getEnvKey();
    if (!key) {
        console.log("No key found in .env.local");
        return;
    }
    const q = "Orchard Mall Royal Palms Goregaon East Mumbai";
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${key}&region=in&components=country:IN`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK' && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        console.log("SUCCESS:", { lat, lng, formatted: data.results[0].formatted_address });
    } else {
        console.log("FAILED:", data);
    }
}
geocode();
