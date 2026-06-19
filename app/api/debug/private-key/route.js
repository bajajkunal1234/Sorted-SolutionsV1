import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
    const key = process.env.FIREBASE_PRIVATE_KEY;
    if (!key) {
        return NextResponse.json({ error: 'FIREBASE_PRIVATE_KEY is missing' });
    }

    const info = {
        length: key.length,
        startsWithBegin: key.startsWith('-----BEGIN'),
        endsWithEnd: key.endsWith('-----'),
        hasLiteralEscapedNewlines: key.includes('\\n'),
        hasActualNewlines: key.includes('\n'),
        trimmedStartsWithBegin: key.trim().startsWith('-----BEGIN'),
        trimmedEndsWithEnd: key.trim().endsWith('-----'),
        first20Chars: key.substring(0, 20),
        last20Chars: key.substring(key.length - 20),
        rawLast20CharCodes: Array.from(key.substring(key.length - 20)).map(c => c.charCodeAt(0)),
    };

    // Try parsing it using our cleaning logic
    let cleanKey = key.trim();
    if (cleanKey.startsWith('"') || cleanKey.startsWith("'")) {
        cleanKey = cleanKey.slice(1);
    }
    if (cleanKey.endsWith('"') || cleanKey.endsWith("'")) {
        cleanKey = cleanKey.slice(0, -1);
    }
    cleanKey = cleanKey.trim().replace(/\\n/g, '\n');

    const cleanHash = crypto.createHash('sha256').update(cleanKey).digest('hex');
    const cleanInfo = {
        length: cleanKey.length,
        hash: cleanHash,
        startsWithBegin: cleanKey.startsWith('-----BEGIN'),
        endsWithEnd: cleanKey.endsWith('-----'),
        first30Chars: cleanKey.substring(0, 30),
        last30Chars: cleanKey.substring(cleanKey.length - 30),
        cleanLast20CharCodes: Array.from(cleanKey.substring(cleanKey.length - 20)).map(c => c.charCodeAt(0)),
    };

    let parseError = null;
    try {
        crypto.createPrivateKey(cleanKey);
    } catch (e) {
        parseError = e.message;
    }

    return NextResponse.json({
        rawInfo: info,
        cleanInfo,
        isValidPEM: parseError === null,
        cryptoError: parseError,
    });
}
