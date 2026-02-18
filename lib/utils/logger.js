import { supabase } from '../supabase';

/**
 * Logging utility for system interactions.
 * Persists logs to Supabase interactions table.
 */
export const logInteraction = async (interaction) => {
    try {
        if (!supabase) {
            console.warn('Supabase client not initialized. Falling back to console.');
            console.log('Interaction:', interaction);
            return null;
        }

        const { data, error } = await supabase
            .from('interactions')
            .insert([{
                type: interaction.type,
                category: interaction.category,
                customer_id: interaction.customerId || null,
                customer_name: interaction.customerName || null,
                job_id: interaction.jobId || null,
                invoice_id: interaction.invoiceId || null,
                performed_by: interaction.performedBy || 'system',
                performed_by_name: interaction.performedByName || 'System',
                description: interaction.description,
                metadata: interaction.metadata || {},
                source: interaction.source || 'System',
                status: interaction.status || 'completed'
            }])
            .select()
            .single();

        if (error) throw error;

        console.log('Interaction logged to Supabase:', data);
        return data;
    } catch (error) {
        console.error('Failed to log interaction to Supabase:', error);
        // Fallback to localStorage just in case of DB failure to avoid losing data during demo
        try {
            const existing = JSON.parse(localStorage.getItem('system_interactions_fallback') || '[]');
            localStorage.setItem('system_interactions_fallback', JSON.stringify([{ ...interaction, timestamp: new Date().toISOString() }, ...existing].slice(0, 50)));
        } catch (e) { }
        return null;
    }
};

/**
 * Helper specifically for login/logout events
 */
export const logAuthEvent = async (type, user) => {
    return await logInteraction({
        type: type === 'login' ? 'user-login' : 'user-logout',
        category: 'account',
        performedBy: user.id,
        performedByName: user.name,
        description: `${user.name} (${user.role}) ${type === 'login' ? 'logged into' : 'logged out of'} the system`,
        metadata: {
            role: user.role,
            phone: user.phone
        },
        source: type === 'login' ? 'Login Page' : 'System'
    });
};
