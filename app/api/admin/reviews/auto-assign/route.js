import { supabase } from '@/lib/supabase';
import { autoDistributeReviewsToAllWebServices } from '@/lib/v2/reviewClassifier';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/reviews/auto-assign
 *
 * Runs the AI review auto-assignment engine across all web services in inventory:
 * - Direct appliance matches for specific categories
 * - Generic positive reviews for general coverage
 * - Strictly excludes cross-appliance contamination
 */
export async function POST(request) {
    try {
        const result = await autoDistributeReviewsToAllWebServices(supabase);
        return NextResponse.json({
            success: true,
            message: `Successfully auto-assigned reviews to ${result.updatedServicesCount} web services.`,
            ...result
        });
    } catch (err) {
        console.error('[Auto Assign Reviews API] Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function GET(request) {
    return POST(request);
}
