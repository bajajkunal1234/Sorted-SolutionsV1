// Validation utilities for forms

/**
 * Validate mobile number (Indian format)
 * @param {string} mobile - Mobile number to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateMobileNumber = (mobile) => {
    if (!mobile || mobile.trim() === '') {
        return { isValid: true, error: '' }; // Optional field
    }

    // Remove spaces and common separators
    const cleaned = mobile.replace(/[\s\-()]/g, '');

    // Check if it starts with +91 or 91
    let digits = cleaned;
    if (cleaned.startsWith('+91')) {
        digits = cleaned.substring(3);
    } else if (cleaned.startsWith('91') && cleaned.length > 10) {
        digits = cleaned.substring(2);
    }

    // Check if contains only digits
    if (!/^\d+$/.test(digits)) {
        return {
            isValid: false,
            error: 'Mobile number must contain only digits'
        };
    }

    // Check if exactly 10 digits
    if (digits.length !== 10) {
        return {
            isValid: false,
            error: `Mobile number must be exactly 10 digits (found ${digits.length})`
        };
    }

    // Check if starts with valid digit (6-9 for Indian mobile)
    if (!/^[6-9]/.test(digits)) {
        return {
            isValid: false,
            error: 'Mobile number must start with 6, 7, 8, or 9'
        };
    }

    return { isValid: true, error: '' };
};

/**
 * Format mobile number for display (as-you-type +91-XXXXX XXXXX)
 * @param {string} mobile - Mobile number to format
 * @returns {string} - Formatted mobile number
 */
export const formatMobileNumber = (mobile) => {
    if (!mobile) return '';

    // Strip everything except digits
    let digits = mobile.replace(/\D/g, '');
    
    // Handle leading 91 or 0
    if (digits.startsWith('91') && digits.length > 10) {
        digits = digits.slice(2);
    } else if (digits.startsWith('0')) {
        digits = digits.slice(1);
    }
    
    // Limit to 10 digits max
    digits = digits.slice(0, 10);
    
    if (digits.length === 0) return '';
    if (digits.length <= 5) {
        return `+91-${digits}`;
    }
    return `+91-${digits.slice(0, 5)} ${digits.slice(5)}`;
};

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateEmail = (email) => {
    if (!email || email.trim() === '') {
        return { isValid: true, error: '' }; // Optional field
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return {
            isValid: false,
            error: 'Please enter a valid email address'
        };
    }

    return { isValid: true, error: '' };
};

/**
 * Validate GSTIN
 * @param {string} gstin - GSTIN to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateGSTIN = (gstin) => {
    if (!gstin || gstin.trim() === '') {
        return { isValid: true, error: '' }; // Optional field
    }

    // GSTIN format: 2 digits (state) + 10 chars (PAN) + 1 digit (entity) + 1 char (Z) + 1 check digit
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    if (!gstinRegex.test(gstin)) {
        return {
            isValid: false,
            error: 'Invalid GSTIN format (e.g., 27AABCU9603R1ZM)'
        };
    }

    return { isValid: true, error: '' };
};

/**
 * Validate PAN
 * @param {string} pan - PAN to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validatePAN = (pan) => {
    if (!pan || pan.trim() === '') {
        return { isValid: true, error: '' }; // Optional field
    }

    // PAN format: 5 letters + 4 digits + 1 letter
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

    if (!panRegex.test(pan)) {
        return {
            isValid: false,
            error: 'Invalid PAN format (e.g., ABCDE1234F)'
        };
    }

    return { isValid: true, error: '' };
};

/**
 * Validate IFSC Code
 * @param {string} ifsc - IFSC code to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateIFSC = (ifsc) => {
    if (!ifsc || ifsc.trim() === '') {
        return { isValid: true, error: '' }; // Optional field
    }

    // IFSC format: 4 letters (bank) + 0 + 6 alphanumeric (branch)
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

    if (!ifscRegex.test(ifsc)) {
        return {
            isValid: false,
            error: 'Invalid IFSC code format (e.g., SBIN0001234)'
        };
    }

    return { isValid: true, error: '' };
};
