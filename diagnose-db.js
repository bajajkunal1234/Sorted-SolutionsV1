import { createServerSupabase } from './lib/supabase-server.js';

async function diagnose() {
    const supabase = createServerSupabase();
    if (!supabase) {
        console.error('Supabase not initialized');
        return;
    }

    const testId = 'cat-washing-machine-repair';
    console.log(`Checking data for: ${testId}`);

    const { data: pageSettings, error: err1 } = await supabase
        .from('page_settings')
        .select('*')
        .eq('page_id', testId)
        .single();

    console.log('Page Settings Row:', pageSettings);
    if (err1) console.error('Error 1:', err1);

    const { data: problems, error: err2 } = await supabase
        .from('page_problems')
        .select('*')
        .eq('page_id', testId);

    console.log('Problems Count:', problems?.length);
    if (err2) console.error('Error 2:', err2);

    const { data: services, error: err3 } = await supabase
        .from('page_services')
        .select('*')
        .eq('page_id', testId);

    console.log('Services Count:', services?.length);
    if (err3) console.error('Error 3:', err3);
}

diagnose();
