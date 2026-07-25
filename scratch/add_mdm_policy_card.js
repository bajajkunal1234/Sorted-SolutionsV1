const fs = require('fs');
const path = 'components/technician/TechnicianApp.jsx';
let content = fs.readFileSync(path, 'utf8');

const lines = content.split(/\r?\n/);

// 1. Add state variable
let stateIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const [dutyStatusError, setDutyStatusError]')) {
        stateIndex = i;
        break;
    }
}

if (stateIndex === -1) {
    console.error('State target not found');
    process.exit(1);
}
lines.splice(stateIndex + 1, 0, `    const [mdmProfiles, setMdmProfiles] = useState(null);`);

// 2. Add profile fetch mapping
let fetchIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('setTechnicianData(data.technician);')) {
        fetchIndex = i;
        break;
    }
}

if (fetchIndex === -1) {
    console.error('Fetch target not found');
    process.exit(1);
}
lines.splice(fetchIndex + 1, 0, `                    setMdmProfiles(data.mdmProfiles || null);`);

// 3. Add UI card render
let uiIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Your shift is active. Precise GPS location tracking is locked Always-On.')) {
        uiIndex = i;
        break;
    }
}

if (uiIndex === -1) {
    console.error('UI target not found');
    process.exit(1);
}

// Locate the closing </p> tag
let closingPTagIndex = -1;
for (let i = uiIndex; i < lines.length; i++) {
    if (lines[i].includes('</p>')) {
        closingPTagIndex = i;
        break;
    }
}

if (closingPTagIndex === -1) {
    console.error('Closing </p> tag not found');
    process.exit(1);
}

const uiReplacement = `
                    {/* MDM Policy Status Display */}
                    {mdmProfiles && mdmProfiles.length > 0 && (
                        <div style={{
                            padding: '10px 12px',
                            backgroundColor: 'rgba(99, 102, 241, 0.05)',
                            border: '1px solid rgba(99, 102, 241, 0.15)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            marginTop: '8px'
                        }}>
                            <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                🛡️ Active MDM Policies:
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '4px' }}>
                                {mdmProfiles.map((p, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>• {p.profile_name}</span>
                                        <span style={{ 
                                            fontSize: '10px', 
                                            fontWeight: 'bold',
                                            color: p.status === "6" ? '#10b981' : '#f59e0b',
                                            backgroundColor: p.status === "6" ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                            padding: '2px 6px',
                                            borderRadius: '8px'
                                        }}>
                                            {p.status === "6" ? "Applied" : "Pending"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}`;

lines.splice(closingPTagIndex + 1, 0, uiReplacement);

// Reassemble the file with original line endings format
fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('Successfully updated TechnicianApp.jsx with MDM policy display card!');
