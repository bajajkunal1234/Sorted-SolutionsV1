import { NextResponse } from 'next/server';
import { logInteractionServer } from '@/lib/log-interaction-server';

/**
 * POST /api/track/click
 * Fire-and-forget endpoint for client-side click events (homepage, service pages, etc.)
 * Body: { serviceId, serviceName, pageUrl, source }
 */
export async function POST(request) {
    try {
        const { serviceId, serviceName, pageUrl, source = 'Website' } = await request.json();

        await logInteractionServer({
            type: 'homepage-service-click',
            category: 'acquisition',
            description: `User clicked "${serviceName || serviceId}" on ${source}${pageUrl ? ` — ${pageUrl}` : ''}`,
            metadata: { serviceId, serviceName, pageUrl },
            source,
        });

        return NextResponse.json({ success: true });
    } catch {
        // Silently succeed — clicking should never fail visibly to the user
        return NextResponse.json({ success: true });
    }
}
