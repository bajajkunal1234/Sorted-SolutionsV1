import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const supabase = createServerSupabase();
    const pageId = 'sloc-bandra-ac-repair';

    const { data: localities, error: localitiesError } = await supabase
        .from('page_localities')
        .select('*')
        .eq('page_id', pageId);

    const { data: services, error: servicesError } = await supabase
        .from('page_services')
        .select('*')
        .eq('page_id', pageId);

    const { data: problems, error: problemsError } = await supabase
        .from('page_problems')
        .select('*')
        .eq('page_id', pageId);

    return NextResponse.json({
        localities: { data: localities, error: localitiesError?.message },
        services: { data: services, error: servicesError?.message },
        problems: { data: problems, error: problemsError?.message },
    });
}
