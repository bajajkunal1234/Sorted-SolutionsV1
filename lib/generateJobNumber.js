/**
 * Shared utility — generates the next sequential JOB-XXXX number.
 * Used by: /api/admin/jobs, /api/customer/jobs, /api/booking
 *
 * Uses the service-role Supabase client so it can read jobs regardless
 * of RLS policies (the anon key is blocked from reading jobs).
 *
 * NOTE: This scans the last 50 jobs for the highest number.
 * A race condition is theoretically possible under very high concurrency.
 * For now this is acceptable; move to a DB sequence if throughput grows.
 */
import { createServerSupabase } from '@/lib/supabase-server';

export async function generateJobNumber() {
    try {
        const supabase = createServerSupabase();
        const { data: latestJobs } = await supabase
            .from('jobs')
            .select('job_number')
            .not('job_number', 'is', null)
            .order('created_at', { ascending: false })
            .limit(50);

        let nextNum = 1001;
        if (latestJobs && latestJobs.length > 0) {
            const nums = latestJobs
                .map(j => {
                    const match = j.job_number?.match(/^JOB-(\d+)$/);
                    return match ? parseInt(match[1]) : 0;
                })
                .filter(n => n > 0);

            if (nums.length > 0) {
                nextNum = Math.max(...nums) + 1;
            }
        }
        return `JOB-${nextNum}`;
    } catch (e) {
        // Fallback: use timestamp-based number so the insert still succeeds
        console.error('[generateJobNumber] failed, using timestamp fallback:', e.message);
        return `JOB-${Date.now().toString().slice(-6)}`;
    }
}
