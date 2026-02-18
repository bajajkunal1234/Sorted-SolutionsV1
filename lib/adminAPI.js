// Data service layer for admin API calls
// This abstracts all API interactions for the admin app

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/admin'

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

    const data = await response.json()

    if (!data.success) {
        throw new Error(data.error || 'API request failed')
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
    getAll: async (search = '') => {
        const query = search ? `?search=${encodeURIComponent(search)}` : ''
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
        return apiFetch('/settings/quick-booking')
    },
    updateSettings: async (settings) => {
        return apiFetch('/settings/quick-booking', {
            method: 'PUT',
            body: JSON.stringify(settings),
        })
    },
    createItem: async (type, data) => {
        return apiFetch('/settings/quick-booking', {
            method: 'POST',
            body: JSON.stringify({ type, data }),
        })
    },
    updateItem: async (type, id, data) => {
        return apiFetch('/settings/quick-booking', {
            method: 'PATCH',
            body: JSON.stringify({ type, id, data }),
        })
    },
    deleteItem: async (type, id) => {
        return apiFetch('/settings/quick-booking', {
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
    getAll: async (type = '') => {
        const query = type ? `?type=${type}` : ''
        return apiFetch(`/accounts${query}`)
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
        if (filters.start_date) params.append('start_date', filters.start_date)
        if (filters.end_date) params.append('end_date', filters.end_date)

        const query = params.toString() ? `?${params.toString()}` : ''
        return apiFetch(`/transactions${query}`)
    },

    create: async (transactionData) => {
        return apiFetch('/transactions', {
            method: 'POST',
            body: JSON.stringify(transactionData),
        })
    },

    update: async (id, updates) => {
        return apiFetch('/transactions', {
            method: 'PUT',
            body: JSON.stringify({ id, ...updates }),
        })
    },

    delete: async (id) => {
        return apiFetch(`/transactions?id=${id}`, {
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
const SETTINGS_BASE = '/api/settings'

async function settingsFetch(endpoint, options = {}) {
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/admin').replace('/admin', '')
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
    printTemplates: printTemplatesAPI,
}
