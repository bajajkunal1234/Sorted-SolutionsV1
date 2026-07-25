const fs = require('fs');
const path = 'components/technician/TechnicianApp.jsx';
let content = fs.readFileSync(path, 'utf8');

const lines = content.split(/\r?\n/);

// 1. Update imports
let importIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('import {') && lines[i].includes('lucide-react')) {
        importIndex = i;
        break;
    }
}

if (importIndex === -1) {
    console.error('Import line not found');
    process.exit(1);
}

lines[importIndex] = lines[importIndex].replace(
    'Activity, AlertCircle,',
    'Activity, AlertCircle, Play, Power, Loader2,'
);

// 2. Add state variable
let stateIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const [mdmProfiles, setMdmProfiles]')) {
        stateIndex = i;
        break;
    }
}

if (stateIndex === -1) {
    console.error('mdmProfiles state not found');
    process.exit(1);
}
lines.splice(stateIndex + 1, 0, `    const [shiftActionLoading, setShiftActionLoading] = useState(null); // 'start', 'end', or null`);

// 3. Update handleStartShift
let startShiftIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const handleStartShift = async () => {')) {
        startShiftIndex = i;
        break;
    }
}

if (startShiftIndex === -1) {
    console.error('handleStartShift not found');
    process.exit(1);
}

let tryStartIndex = -1;
for (let i = startShiftIndex; i < startShiftIndex + 10; i++) {
    if (lines[i].includes('try {')) {
        tryStartIndex = i;
        break;
    }
}

if (tryStartIndex === -1) {
    console.error('try block of start shift not found');
    process.exit(1);
}

lines.splice(tryStartIndex + 1, 0, `        setShiftActionLoading('start');`);

let nextIndex = -1;
for (let i = startShiftIndex; i < lines.length; i++) {
    if (lines[i].includes('const handleEndShift = async () => {')) {
        nextIndex = i;
        break;
    }
}

let catchCloseIndex = -1;
for (let i = nextIndex - 1; i > startShiftIndex; i--) {
    if (lines[i].includes('} catch (err) {')) {
        for (let j = i; j < nextIndex; j++) {
            if (lines[j].trim() === '}') {
                catchCloseIndex = j;
                break;
            }
        }
        break;
    }
}

if (catchCloseIndex === -1) {
    console.error('catch block end of start shift not found');
    process.exit(1);
}

lines.splice(catchCloseIndex + 1, 0, `        } finally {`, `            setShiftActionLoading(null);`);

// 4. Update handleEndShift
let endShiftIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const handleEndShift = async () => {')) {
        endShiftIndex = i;
        break;
    }
}

if (endShiftIndex === -1) {
    console.error('handleEndShift not found');
    process.exit(1);
}

let endTryStartIndex = -1;
for (let i = endShiftIndex; i < endShiftIndex + 10; i++) {
    if (lines[i].includes('try {')) {
        endTryStartIndex = i;
        break;
    }
}

lines.splice(endTryStartIndex + 1, 0, `        setShiftActionLoading('end');`);

let nextEndIndex = -1;
for (let i = endShiftIndex; i < lines.length; i++) {
    if (lines[i].includes('const handleToggleLunch = async () => {')) {
        nextEndIndex = i;
        break;
    }
}

let endCatchCloseIndex = -1;
for (let i = nextEndIndex - 1; i > endShiftIndex; i--) {
    if (lines[i].includes('} catch (err) {')) {
        for (let j = i; j < nextEndIndex; j++) {
            if (lines[j].trim() === '}') {
                endCatchCloseIndex = j;
                break;
            }
        }
        break;
    }
}

lines.splice(endCatchCloseIndex + 1, 0, `        } finally {`, `            setShiftActionLoading(null);`);

// 5. Replace Start Shift Button markup
let startBtnIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('onClick={handleStartShift}')) {
        startBtnIndex = i;
        break;
    }
}

if (startBtnIndex === -1) {
    console.error('Start shift button UI not found');
    process.exit(1);
}

let carTextIndex = -1;
for (let i = startBtnIndex; i < startBtnIndex + 25; i++) {
    if (lines[i].includes('🚗 Start Work Shift')) {
        carTextIndex = i;
        break;
    }
}

if (carTextIndex === -1) {
    console.error('Car text not found');
    process.exit(1);
}

lines[startBtnIndex] = lines[startBtnIndex] + `\n                                    disabled={shiftActionLoading !== null}`;
lines[carTextIndex] = `                                    {shiftActionLoading === 'start' ? (
                                        <>
                                            <Loader2 style={{ animation: 'mdmSpin 1s linear infinite' }} size={16} /> Starting...
                                        </>
                                    ) : (
                                        <>
                                            <Activity size={16} /> Start Work Shift
                                        </>
                                    )}`;

// 6. Replace End Shift Button markup
let endBtnIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('onClick={handleEndShift}')) {
        endBtnIndex = i;
        break;
    }
}

if (endBtnIndex === -1) {
    console.error('End shift button UI not found');
    process.exit(1);
}

let endTextIndex = -1;
for (let i = endBtnIndex; i < endBtnIndex + 25; i++) {
    if (lines[i].includes('🔒 End Shift & Turn Off GPS')) {
        endTextIndex = i;
        break;
    }
}

lines[endBtnIndex] = lines[endBtnIndex] + `\n                                        disabled={shiftActionLoading !== null}`;
lines[endTextIndex] = `                                        {shiftActionLoading === 'end' ? (
                                            <>
                                                <Loader2 style={{ animation: 'mdmSpin 1s linear infinite' }} size={14} /> Ending...
                                            </>
                                        ) : (
                                            <>
                                                <Power size={14} /> End Shift & Turn Off GPS
                                            </>
                                        )}`;

// 7. Inject style inside main return block
let mainReturnIndex = -1;
for (let i = 3200; i < lines.length; i++) {
    if (lines[i].includes('return (') && lines[i+1].includes('<>')) {
        mainReturnIndex = i;
        break;
    }
}

if (mainReturnIndex === -1) {
    console.error('Main return block not found');
    process.exit(1);
}

lines.splice(mainReturnIndex + 2, 0, `        <style>{\`@keyframes mdmSpin { 100% { transform: rotate(360deg); } }\`}</style>`);

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('Successfully completed full injection of shift action loaders!');
