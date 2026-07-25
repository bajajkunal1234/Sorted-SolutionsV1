const lastContact = 1784320070982; // last_contact_time
const lastScan = 1784320060087; // last_scan_time
const registered = 1784246984044; // registered_time

function toIST(ts) {
    const d = new Date(ts);
    return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

console.log('Registered Time (IST):', toIST(registered));
console.log('Last Contact Time (IST):', toIST(lastContact));
console.log('Last Scan Time (IST):', toIST(lastScan));
console.log('Current System Time (IST):', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
