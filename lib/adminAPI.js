// Data service layer for admin API calls
// This abstracts all API interactions for the admin app

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/admin'

// Generic fetch wrapper
async function apiFetch(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    })

    // Guard: if the body is empty (e.g. Vercel timeout, 504, crashed function)
    // response.json() would throw "Unexpected end of JSON input" — surface a cleaner error
    const text = await response.text();
    if (!text || !text.trim()) {
        throw new Error(`Server returned an empty response (HTTP ${response.status}). Please try again.`);
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error(`Server returned non-JSON response (HTTP ${response.status}): ${text.slice(0, 120)}`);
    }

    if (!data.success) {
        const err = new Error(data.error || 'API request failed')
        // Attach any structured dependency info so callers can show details
        if (data.blocking) err.blocking = data.blocking
        throw err
    }

    return data.data
}


// =====================================================
// JOBS API
// =====================================================
export const jobsAPI = {
    // Get all jobs with optional filters
    getAll: async (filters = {}) => {
        const params = new URLSearchParams()
        if (filters.status && filters.status !== 'all') params.append('status', filters.status)
        if (filters.customer_id) params.append('customer_id', filters.customer_id)
        if (filters.technician_id) params.append('technician_id', filters.technician_id)

        const query = params.toString() ? `?${params.toString()}` : ''
        return apiFetch(`/jobs${query}`)
    },

    // Get single job by ID
    getById: async (id) => {
        const jobs = await apiFetch(`/jobs`)
        return jobs.find(job => job.id === id)
    },

    // Create new job
    create: async (jobData) => {
        return apiFetch('/jobs', {
            method: 'POST',
            body: JSON.stringify(jobData),
        })
    },

    // Update job
    update: async (id, updates) => {
        return apiFetch('/jobs', {
            method: 'PUT',
            body: JSON.stringify({ id, ...updates }),
        })
    },

    // Delete job
    delete: async (id) => {
        return apiFetch(`/jobs?id=${id}`, {
            method: 'DELETE',
        })
    },
}

// =====================================================
// CUSTOMERS API
// =====================================================
export const customersAPI = {
    getAll: async (params = {}) => {
        const queryParams = new URLSearchParams()
        if (typeof params === 'string') {
            queryParams.append('search', params)
        } else {
            if (params.search) queryParams.append('search', params.search)
            if (params.ledger_id) queryParams.append('ledger_id', params.ledger_id)
        }
        const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
        return apiFetch(`/customers${query}`)
    },

    create: async (customerData) => {
        return apiFetch('/customers', {
            method: 'POST',
            body: JSON.stringify(customerData),
        })
    },

    update: async (id, updates) => {
        return apiFetch('/customers', {
            method: 'PUT',
            body: JSON.stringify({ id, ...updates }),
        })
    },

    delete: async (id) => {
        return apiFetch(`/customers?id=${id}`, {
            method: 'DELETE',
        })
    },
}

// =====================================================
// TECHNICIANS API
// =====================================================
export const techniciansAPI = {
    getAll: async () => {
        return apiFetch('/technicians')
    },

    create: async (techData) => {
        return apiFetch('/technicians', {
            method: 'POST',
            body: JSON.stringify(techData),
        })
    },

    update: async (id, updates) => {
        return apiFetch('/technicians', {
            method: 'PUT',
            body: JSON.stringify({ id, ...updates }),
        })
    },

    delete: async (id) => {
        return apiFetch(`/technicians?id=${id}`, {
            method: 'DELETE',
        })
    },
}

export const quickBookingAPI = {
    getSettings: async () => {
        return settingsFetch('/quick-booking')
    },
    updateSettings: async (settings) => {
        return settingsFetch('/quick-booking', {
            method: 'PUT',
            body: JSON.stringify(settings),
        })
    },
    createItem: async (type, data) => {
        return settingsFetch('/quick-booking', {
            method: 'POST',
            body: JSON.stringify({ type, data }),
        })
    },
    updateItem: async (type, id, data) => {
        return settingsFetch('/quick-booking', {
            method: 'PATCH',
            body: JSON.stringify({ type, id, data }),
        })
    },
    deleteItem: async (type, id) => {
        return settingsFetch('/quick-booking', {
            method: 'DELETE',
            body: JSON.stringify({ type, id }),
        })
    }
}

export const websiteTestimonialsAPI = {
    getAll: async () => {
        return apiFetch('/settings/testimonials')
    },
    create: async (data) => {
        return apiFetch('/settings/testimonials', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    },
    update: async (id, data) => {
        return apiFetch('/settings/testimonials', {
            method: 'PUT',
            body: JSON.stringify({ id, ...data }),
        })
    },
    delete: async (id) => {
        return apiFetch(`/settings/testimonials?id=${id}`, {
            method: 'DELETE'
        })
    }
}

// =====================================================
// INVENTORY API
// =====================================================
export const inventoryAPI = {
    getAll: async (filters = {}) => {
        const params = new URLSearchParams()
        if (filters.category) params.append('category', filters.category)
        if (filters.low_stock) params.append('low_stock', 'true')

        const query = params.toString() ? `?${params.toString()}` : ''
        return apiFetch(`/inventory${query}`)
    },

    create: async (itemData) => {
        return apiFetch('/inventory', {
            method: 'POST',
            body: JSON.stringify(itemData),
        })
    },

    update: async (id, updates) => {
        return apiFetch('/inventory', {
            method: 'PUT',
            body: JSON.stringify({ id, ...updates }),
        })
    },

    delete: async (id) => {
        return apiFetch(`/inventory?id=${id}`, {
            method: 'DELETE',
        })
    },
}

// =====================================================
// ACCOUNTS API
// =====================================================
export const accountsAPI = {
    getAll: async (type = '', include_archived = false) => {
        let query = type ? `?type=${type}` : ''
        if (include_archived) {
            query += query ? `&include_archived=1` : `?include_archived=1`
        }
        return apiFetch(`/accounts${query}`)
    },
    
    getById: async (id) => {
        return apiFetch(`/accounts/${id}`)
    },

    create: async (accountData) => {
        return apiFetch('/accounts', {
            method: 'POST',
            body: JSON.stringify(accountData),
        })
    },

    update: async (id, updates) => {
        return apiFetch('/accounts', {
            method: 'PUT',
            body: JSON.stringify({ id, ...updates }),
        })
    },

    delete: async (id) => {
        return apiFetch(`/accounts?id=${id}`, {
            method: 'DELETE',
        })
    },
}

// =====================================================
// JOURNALS API
// =====================================================
export const journalsAPI = {
    getAll: async (filters = {}) => {
        const params = new URLSearchParams()
        if (filters.from) params.append('from', filters.from)
        if (filters.to) params.append('to', filters.to)
        
        const query = params.toString() ? `?${params.toString()}` : ''
        return apiFetch(`/journals${query}`)
    },
    create: async (journalData) => {
        return apiFetch('/journals', {
            method: 'POST',
            body: JSON.stringify(journalData),
        })
    }
}

// =====================================================
// REPORTS API
// =====================================================
export const reportsAPI = {
    getAll: async (filters = {}) => {
        const params = new URLSearchParams()
        if (filters.from) params.append('from', filters.from)
        if (filters.to) params.append('to', filters.to)
        
        const query = params.toString() ? `?${params.toString()}` : ''
        return apiFetch(`/reports${query}`)
    }
}


export const accountGroupsAPI = {
    getAll: async () => {
        return apiFetch('/account-groups')
    },

    create: async (groupData) => {
        return apiFetch('/account-groups', {
            method: 'POST',
            body: JSON.stringify(groupData),
        })
    },

    update: async (id, updates) => {
        return apiFetch('/account-groups', {
            method: 'PUT',
            body: JSON.stringify({ id, ...updates }),
        })
    },

    delete: async (id) => {
        return apiFetch(`/account-groups?id=${id}`, {
            method: 'DELETE',
        })
    },
}

// =====================================================
// TRANSACTIONS API
// =====================================================
export const transactionsAPI = {
    getAll: async (filters = {}) => {
        const params = new URLSearchParams()
        if (filters.type) params.append('type', filters.type)
        if (filters.customer_id) params.append('customer_id', filters.customer_id)
        if (filters.account_id) params.append('account_id', filters.account_id)
        if (filters.start_date) params.append('start_date', filters.start_date)
        if (filters.end_date) params.append('end_date', filters.end_date)
        if (filters.include_archived) params.append('include_archived', '1')

        const query = params.toString() ? `?${params.toString()}` : ''
        return apiFetch(`/transactions${query}`)
    },

    create: async (transactionData, type) => {
        // Accept type as explicit 2nd arg OR fall back to transactionData.type property
        const { type: embeddedType, ...data } = transactionData;
        const queryType = type || embeddedType;
        if (!queryType) throw new Error('Transaction type is required');
        return apiFetch(`/transactions?type=${queryType}`, {
            method: 'POST',
            body: JSON.stringify(data),
        })
    },

    update: async (id, updates, type) => {
        const { type: embeddedType, ...data } = updates;
        const queryType = type || embeddedType || '';
        const typeParam = queryType ? `?type=${queryType}` : '';
        return apiFetch(`/transactions${typeParam}`, {
            method: 'PUT',
            body: JSON.stringify({ id, ...data }),
        })
    },

    delete: async (id, type) => {
        const typeParam = type ? `&type=${type}` : '';
        return apiFetch(`/transactions?id=${id}${typeParam}`, {
            method: 'DELETE',
        })
    },
}

// =====================================================
// EXPENSES API
// =====================================================
export const expensesAPI = {
    getAll: async (filters = {}) => {
        const params = new URLSearchParams()
        if (filters.technician_id) params.append('technician_id', filters.technician_id)
        if (filters.status) params.append('status', filters.status)
        if (filters.start_date) params.append('start_date', filters.start_date)
        if (filters.end_date) params.append('end_date', filters.end_date)

        const query = params.toString() ? `?${params.toString()}` : ''
        return apiFetch(`/expenses${query}`)
    },

    create: async (expenseData) => {
        return apiFetch('/expenses', {
            method: 'POST',
            body: JSON.stringify(expenseData),
        })
    },

    update: async (id, updates) => {
        return apiFetch('/expenses', {
            method: 'PUT',
            body: JSON.stringify({ id, ...updates }),
        })
    },

    delete: async (id) => {
        return apiFetch(`/expenses?id=${id}`, {
            method: 'DELETE',
        })
    },
}

// =====================================================
// AMC API (Plans & Active)
// =====================================================
export const amcAPI = {
    getPlans: async () => {
        return apiFetch('/amc?type=plans')
    },

    getActive: async (filters = {}) => {
        const params = new URLSearchParams({ type: 'active' })
        if (filters.customer_id) params.append('customer_id', filters.customer_id)
        if (filters.status) params.append('status', filters.status)
        if (filters.include_archived) params.append('include_archived', '1')

        return apiFetch(`/amc?${params.toString()}`)
    },

    createPlan: async (planData) => {
        return apiFetch('/amc?type=plan', {
            method: 'POST',
            body: JSON.stringify(planData),
        })
    },

    createActive: async (amcData) => {
        return apiFetch('/amc?type=amc', {
            method: 'POST',
            body: JSON.stringify(amcData),
        })
    },

    updatePlan: async (id, updates) => {
        return apiFetch('/amc?type=plan', {
            method: 'PUT',
            body: JSON.stringify({ id, ...updates }),
        })
    },

    updateActive: async (id, updates) => {
        return apiFetch('/amc?type=amc', {
            method: 'PUT',
            body: JSON.stringify({ id, ...updates }),
        })
    },

    deletePlan: async (id) => {
        return apiFetch(`/amc?type=plan&id=${id}`, {
            method: 'DELETE',
        })
    },

    deleteActive: async (id) => {
        return apiFetch(`/amc?type=amc&id=${id}`, {
            method: 'DELETE',
        })
    },
}

// =====================================================
// RENTAL API (Plans & Active)
// =====================================================
export const rentalsAPI = {
    getPlans: async () => {
        return apiFetch('/rentals?type=plans')
    },

    getActive: async (filters = {}) => {
        const params = new URLSearchParams({ type: 'active' })
        if (filters.customer_id) params.append('customer_id', filters.customer_id)
        if (filters.status) params.append('status', filters.status)
        if (filters.include_archived) params.append('include_archived', '1')

        return apiFetch(`/rentals?${params.toString()}`)
    },

    createPlan: async (planData) => {
        return apiFetch('/rentals?type=plan', {
            method: 'POST',
            body: JSON.stringify(planData),
        })
    },

    createActive: async (rentalData) => {
        return apiFetch('/rentals?type=rental', {
            method: 'POST',
            body: JSON.stringify(rentalData),
        })
    },

    updatePlan: async (id, updates) => {
        return apiFetch('/rentals?type=plan', {
            method: 'PUT',
            body: JSON.stringify({ id, ...updates }),
        })
    },

    updateActive: async (id, updates) => {
        return apiFetch('/rentals?type=rental', {
            method: 'PUT',
            body: JSON.stringify({ id, ...updates }),
        })
    },
}

// =====================================================
// WEBSITE SETTINGS API
// =====================================================
export const websiteSettingsAPI = {
    getAll: async () => {
        return apiFetch('/website-settings')
    },

    getByKey: async (key) => {
        return apiFetch(`/website-settings?key=${key}`)
    },

    save: async (key, value, description = '') => {
        return apiFetch('/website-settings', {
            method: 'POST',
            body: JSON.stringify({ key, value, description }),
        })
    },
}

// =====================================================
// WEBSITE DEDICATED SETTINGS (Structured Tables)
// =====================================================
// Note: These point to /api/settings instead of /api/admin
const SETTINGS_BASE = '/settings'

async function settingsFetch(endpoint, options = {}) {
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '/api/admin').replace('/admin', '')
    const url = `${baseUrl}${SETTINGS_BASE}${endpoint}`
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    })
    const data = await response.json()
    if (!data.success) throw new Error(data.error || 'Settings API failed')
    return data.data
}

export const websiteBrandsAPI = {
    getAll: () => settingsFetch('/brand-logos'),
    saveAll: (brands) => settingsFetch('/brand-logos', { method: 'PUT', body: JSON.stringify({ logos: brands }) }),
    create: (brand) => settingsFetch('/brand-logos', { method: 'POST', body: JSON.stringify(brand) }),
    delete: (id) => settingsFetch(`/brand-logos?id=${id}`, { method: 'DELETE' })
}

// Booking brands managed in the Quick Booking Form > Brands sub-tab
export const bookingBrandsAPI = {
    getAll: () => settingsFetch('/booking-brands'),
    create: (brand) => settingsFetch('/booking-brands', { method: 'POST', body: JSON.stringify(brand) }),
    toggle: (id, is_active) => settingsFetch('/booking-brands', { method: 'PATCH', body: JSON.stringify({ id, is_active }) }),
    delete: (id) => settingsFetch(`/booking-brands?id=${id}`, { method: 'DELETE' })
}

export const websiteFaqsAPI = {
    getAll: () => settingsFetch('/faqs'),
    create: (faq) => settingsFetch('/faqs', { method: 'POST', body: JSON.stringify(faq) }),
    update: (id, updates) => settingsFetch('/faqs', { method: 'PUT', body: JSON.stringify({ id, ...updates }) }),
    delete: (id) => settingsFetch(`/faqs?id=${id}`, { method: 'DELETE' })
}

export const websiteWhyChooseUsAPI = {
    getAll: () => settingsFetch('/why-choose-us'),
    saveAll: (features) => settingsFetch('/why-choose-us', { method: 'POST', body: JSON.stringify(features) })
}

export const websiteHowItWorksAPI = {
    getAll: () => settingsFetch('/how-it-works'),
    saveAll: (steps) => settingsFetch('/how-it-works', { method: 'POST', body: JSON.stringify(steps) })
}

export const websiteFrequentlyBookedAPI = {
    getAll: () => settingsFetch('/frequently-booked'),
    saveAll: (services) => settingsFetch('/frequently-booked', { method: 'POST', body: JSON.stringify(services) })
}

export const websiteLocationsAPI = {
    getAll: (params = {}) => {
        const query = new URLSearchParams(params).toString()
        return settingsFetch(`/locations${query ? `?${query}` : ''}`)
    },
    create: (location) => settingsFetch('/locations', { method: 'POST', body: JSON.stringify(location) }),
    update: (id, updates) => settingsFetch('/locations', { method: 'PUT', body: JSON.stringify({ id, ...updates }) }),
    delete: (id) => settingsFetch(`/locations?id=${id}`, { method: 'DELETE' })
}


// =====================================================
// MASTER DATA APIs (Products, Brands, Issues, Properties)
// =====================================================
export const productsAPI = {
    getAll: async (category = '') => {
        const query = category ? `?category=${category}` : ''
        return apiFetch(`/products${query}`)
    },

    create: async (productData) => {
        return apiFetch('/products', {
            method: 'POST',
            body: JSON.stringify(productData),
        })
    },

    update: async (id, updates) => {
        return apiFetch('/products', {
            method: 'PUT',
            body: JSON.stringify({ id, ...updates }),
        })
    },
}

export const brandsAPI = {
    getAll: async () => {
        return apiFetch('/brands')
    },

    create: async (brandData) => {
        return apiFetch('/brands', {
            method: 'POST',
            body: JSON.stringify(brandData),
        })
    },
}

export const issuesAPI = {
    getAll: async (category = '') => {
        const query = category ? `?category=${category}` : ''
        return apiFetch(`/issues${query}`)
    },

    create: async (issueData) => {
        return apiFetch('/issues', {
            method: 'POST',
            body: JSON.stringify(issueData),
        })
    },
}

export const propertiesAPI = {
    getAll: async (customerId = '') => {
        const query = customerId ? `?customer_id=${customerId}` : ''
        return apiFetch(`/properties${query}`)
    },

    create: async (propertyData) => {
        return apiFetch('/properties', {
            method: 'POST',
            body: JSON.stringify(propertyData),
        })
    },

    update: async (id, updates) => {
        return apiFetch('/properties', {
            method: 'PUT',
            body: JSON.stringify({ id, ...updates }),
        })
    },
}

// =====================================================
// INVENTORY CATEGORIES API
// =====================================================
export const inventoryCategoriesAPI = {
    getAll: async () => {
        return apiFetch('/inventory-categories')
    },

    create: async (categoryData) => {
        return apiFetch('/inventory-categories', {
            method: 'POST',
            body: JSON.stringify(categoryData),
        })
    },

    delete: async (id) => {
        return apiFetch(`/inventory-categories/${id}`, { method: 'DELETE' })
    },
}

// =====================================================
// INVENTORY BRANDS API
// =====================================================
export const inventoryBrandsAPI = {
    getAll: async () => {
        return apiFetch('/inventory-brands')
    },

    create: async (brandData) => {
        return apiFetch('/inventory-brands', {
            method: 'POST',
            body: JSON.stringify(brandData),
        })
    },

    delete: async (id) => {
        return apiFetch(`/inventory-brands/${id}`, { method: 'DELETE' })
    },
}

// =====================================================
// INVENTORY LOGS API
// =====================================================
export const inventoryLogsAPI = {
    getByInventoryId: async (inventoryId) => {
        return apiFetch(`/inventory-logs?inventory_id=${inventoryId}`)
    },

    create: async (logData) => {
        return apiFetch('/inventory-logs', {
            method: 'POST',
            body: JSON.stringify(logData),
        })
    },
}

// =====================================================
// INVENTORY MOVEMENT API
// =====================================================
export const inventoryMovementAPI = {
    getByInventoryId: async (inventoryId) => {
        return apiFetch(`/inventory-movement?inventory_id=${inventoryId}`)
    },
}

// =====================================================
// PRINT TEMPLATES API
// =====================================================
export const printTemplatesAPI = {
    getAll: async (type = '') => {
        const query = type ? `?type=${type}` : ''
        return apiFetch(`/print-templates${query}`)
    },
}

// =====================================================
// AGREEMENT TEMPLATES API
// =====================================================
export const agreementTemplatesAPI = {
    get: async (type) => {
        return apiFetch(`/agreement-templates?type=${type}`)
    },

    update: async (type, content) => {
        return apiFetch('/agreement-templates', {
            method: 'PUT',
            body: JSON.stringify({ type, content }),
        })
    },
}

// =====================================================
// PRINT SETTINGS API
// =====================================================
export const printSettingsAPI = {
    get: async () => {
        // Stored as a JSON blob in website_settings under key 'print_settings'
        const raw = await apiFetch('/website-settings?key=print_settings').catch(() => null)
        if (!raw || !raw.value) return null
        try { return JSON.parse(raw.value) } catch { return null }
    },

    update: async (settingsData) => {
        // Save as JSON blob via the existing website_settings POST (upsert) endpoint
        return apiFetch('/website-settings', {
            method: 'POST',
            body: JSON.stringify({
                key: 'print_settings',
                value: JSON.stringify(settingsData),
                description: 'Print & invoice settings'
            })
        })
    },
}


// =====================================================
// INTERACTIONS API
// =====================================================
export const interactionsAPI = {
    create: async (interactionData) => {
        return apiFetch('/interactions', {
            method: 'POST',
            body: JSON.stringify(interactionData),
        })
    },
}

// Export all APIs
export default {
    jobs: jobsAPI,
    customers: customersAPI,
    technicians: techniciansAPI,
    inventory: inventoryAPI,
    accounts: accountsAPI,
    transactions: transactionsAPI,
    expenses: expensesAPI,
    amc: amcAPI,
    rentals: rentalsAPI,
    websiteSettings: websiteSettingsAPI,
    websiteBrands: websiteBrandsAPI,
    bookingBrands: bookingBrandsAPI,
    websiteFaqs: websiteFaqsAPI,
    websiteWhyChooseUs: websiteWhyChooseUsAPI,
    websiteHowItWorks: websiteHowItWorksAPI,
    websiteFrequentlyBooked: websiteFrequentlyBookedAPI,
    websiteLocations: websiteLocationsAPI,
    products: productsAPI,
    brands: brandsAPI,
    issues: issuesAPI,
    properties: propertiesAPI,
    interactions: interactionsAPI,
    accountGroups: accountGroupsAPI,
    inventoryCategories: inventoryCategoriesAPI,
    inventoryBrands: inventoryBrandsAPI,
    inventoryLogs: inventoryLogsAPI,
    inventoryMovement: inventoryMovementAPI,
    printTemplates: printTemplatesAPI,
    printSettings: printSettingsAPI,
    agreementTemplates: agreementTemplatesAPI,
}


// =====================================================
// PRODUCT LINKS API
// =====================================================
export const productLinksAPI = {
    getAll: () => apiFetch('/product-links'),
    create: (product_id, service_id, notes = '') =>
        apiFetch('/product-links', { method: 'POST', body: JSON.stringify({ product_id, service_id, notes }) }),
    delete: (id) => apiFetch('/product-links?id=' + id, { method: 'DELETE' }),
    toggleAutoAdd: (id, auto_add) =>
        apiFetch('/product-links', { method: 'PATCH', body: JSON.stringify({ id, auto_add }) }),
};
