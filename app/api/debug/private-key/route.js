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
    };

    // Try parsing it using our cleaning logic
    let cleanKey = key.trim();
    if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
        cleanKey = cleanKey.slice(1, -1);
    }
    if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) {
        cleanKey = cleanKey.slice(1, -1);
    }
    cleanKey = cleanKey.replace(/\\n/g, '\n');

    const cleanInfo = {
        length: cleanKey.length,
        startsWithBegin: cleanKey.startsWith('-----BEGIN'),
        endsWithEnd: cleanKey.endsWith('-----'),
        first30Chars: cleanKey.substring(0, 30),
        last30Chars: cleanKey.substring(cleanKey.length - 30),
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
