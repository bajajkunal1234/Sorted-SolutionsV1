/**
 * Centralized utility for logging system-wide interactions/activities.
 * Used by Admin, Technician, and Customer portals.
 */

export const logInteraction = async ({
    type,               // Action type (e.g., 'customer-login', 'appliance-created')
    category,           // Category (e.g., 'auth', 'appliance', 'navigation')
    customerId = null,
    customerName = null,
    jobId = null,
    invoiceId = null,
    performedBy = null,     // User ID or identifier
    performedByName = null,
    description = '',
    metadata = {},
    source = 'System'      // 'Customer App', 'Technician App', 'Website', 'Admin'
}) => {
    try {
        const payload = {
            type,
            category,
            customer_id: customerId,
            customer_name: customerName,
            job_id: jobId,
            invoice_id: invoiceId,
            performed_by: performedBy,
            performed_by_name: performedByName,
            description,
            metadata,
            source,
            status: 'completed',
            timestamp: new Date().toISOString()
        };

        const response = await fetch('/api/admin/interactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json();
            console.warn('Failed to log interaction:', error);
            
            // Fallback: Store in localStorage if API fails (offline support)
            const localFallback = JSON.parse(localStorage.getItem('system_interactions_fallback') || '[]');
            localFallback.push(payload);
            localStorage.setItem('system_interactions_fallback', JSON.stringify(localFallback.slice(-50))); // Keep last 50
        }

        return true;
    } catch (error) {
        console.error('Error in logInteraction utility:', error);
        return false;
    }
};

/**
 * Convenience wrapper for login events
 */
export const logLogin = (user, role, source) => {
    return logInteraction({
        type: `${role}-login`,
        category: 'auth',
        customerId: role === 'customer' ? user.id : null,
        customerName: role === 'customer' ? user.name : null,
        performedBy: user.id || user.uid,
        performedByName: user.name || user.username || 'User',
        description: `${role.charAt(0).toUpperCase() + role.slice(1)} logged in via ${source}`,
        source: source
    });
};

/**
 * Convenience wrapper for navigation/tab switch
 */
export const logNavigation = (target, role, source) => {
    return logInteraction({
        type: 'nav-tab-switch',
        category: 'navigation',
        description: `${role} switched to ${target} tab`,
        metadata: { target },
        source: source
    });
};
