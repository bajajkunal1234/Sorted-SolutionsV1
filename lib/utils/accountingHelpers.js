import { companyDetails } from '../data/accountingData';

/**
 * Format amount as currency (₹1,23,456.78)
 */
export const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '₹0.00';

    const num = parseFloat(amount);
    if (isNaN(num)) return '₹0.00';

    const formatted = num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    return `₹${formatted}`;
};

/**
 * Calculate GST amount from base amount and rate
 */
export const calculateGST = (baseAmount, gstRate) => {
    if (!baseAmount || !gstRate) return 0;
    return (parseFloat(baseAmount) * parseFloat(gstRate)) / 100;
};

/**
 * Calculate base amount from amount including GST
 */
export const reverseGSTCalculation = (inclAmount, gstRate) => {
    if (!inclAmount || !gstRate) return { base: 0, gst: 0 };

    const incl = parseFloat(inclAmount);
    const rate = parseFloat(gstRate);

    const base = incl / (1 + rate / 100);
    const gst = incl - base;

    return {
        base: parseFloat(base.toFixed(2)),
        gst: parseFloat(gst.toFixed(2))
    };
};

/**
 * Determine GST type based on states (CGST+SGST or IGST)
 */
export const determineGSTType = (fromState, toState) => {
    if (!fromState || !toState) return 'local';

    const from = fromState.toLowerCase().trim();
    const to = toState.toLowerCase().trim();

    return from === to ? 'local' : 'interstate';
};

/**
 * Calculate CGST and SGST or IGST based on states
 */
export const calculateGSTComponents = (baseAmount, gstRate, fromState, toState) => {
    const gstType = determineGSTType(fromState, toState);
    const totalGST = calculateGST(baseAmount, gstRate);

    if (gstType === 'local') {
        return {
            type: 'local',
            cgst: totalGST / 2,
            sgst: totalGST / 2,
            igst: 0,
            total: totalGST
        };
    } else {
        return {
            type: 'interstate',
            cgst: 0,
            sgst: 0,
            igst: totalGST,
            total: totalGST
        };
    }
};

/**
 * Validate HSN code (8 digits)
 */
export const validateHSN = (code) => {
    if (!code) return false;
    const cleaned = code.toString().replace(/\s/g, '');
    return /^\d{4,8}$/.test(cleaned);
};

/**
 * Format HSN code with spaces (1234 5678)
 */
export const formatHSN = (code) => {
    if (!code) return '';
    const cleaned = code.toString().replace(/\s/g, '');
    return cleaned.replace(/(\d{4})(\d{4})/, '$1 $2');
};

/**
 * Generate invoice number
 */
export const generateInvoiceNumber = (type, year, sequence) => {
    const prefix = {
        'sales': 'INV',
        'purchase': 'PINV',
        'payment': 'PV',
        'receipt': 'RV'
    }[type] || 'DOC';

    const yr = year || new Date().getFullYear();
    const seq = sequence.toString().padStart(4, '0');

    return `${prefix}-${yr}-${seq}`;
};

/**
 * Calculate closing balance for a ledger
 */
export const calculateClosingBalance = (openingBalance, transactions) => {
    if (!transactions || transactions.length === 0) {
        return openingBalance || 0;
    }

    const total = transactions.reduce((acc, txn) => {
        // Debit increases asset/expense, Credit increases liability/income
        if (txn.type === 'debit') {
            return acc + (txn.amount || 0);
        } else {
            return acc - (txn.amount || 0);
        }
    }, openingBalance || 0);

    return total;
};

/**
 * Get account group hierarchy path
 */
export const getGroupPath = (groupId, groups) => {
    const path = [];
    let current = groups.find(g => g.id === groupId);

    while (current) {
        path.unshift(current.name);
        current = current.parent ? groups.find(g => g.id === current.parent) : null;
    }

    return path.join(' > ');
};

/**
 * Calculate invoice totals
 */
export const calculateInvoiceTotals = (items, additionalCharges, customerState) => {
    // Calculate items subtotal
    const itemsSubtotal = items.reduce((acc, item) => {
        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        return acc + (qty * rate);
    }, 0);

    // Calculate additional charges total
    const chargesTotal = additionalCharges.reduce((acc, charge) => {
        return acc + (parseFloat(charge.amount) || 0);
    }, 0);

    // Calculate GST for each item
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;

    items.forEach(item => {
        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        const baseAmount = qty * rate;
        const gstRate = parseFloat(item.gstRate) || 0;

        const gstComponents = calculateGSTComponents(
            baseAmount,
            gstRate,
            companyDetails.address.state,
            customerState
        );

        totalCGST += gstComponents.cgst;
        totalSGST += gstComponents.sgst;
        totalIGST += gstComponents.igst;
    });

    const subtotal = itemsSubtotal + chargesTotal;
    const totalGST = totalCGST + totalSGST + totalIGST;
    const grandTotal = subtotal + totalGST;

    return {
        itemsSubtotal: parseFloat(itemsSubtotal.toFixed(2)),
        chargesTotal: parseFloat(chargesTotal.toFixed(2)),
        subtotal: parseFloat(subtotal.toFixed(2)),
        cgst: parseFloat(totalCGST.toFixed(2)),
        sgst: parseFloat(totalSGST.toFixed(2)),
        igst: parseFloat(totalIGST.toFixed(2)),
        totalGST: parseFloat(totalGST.toFixed(2)),
        grandTotal: parseFloat(grandTotal.toFixed(2))
    };
};

/**
 * Format date for invoices
 */
export const formatInvoiceDate = (date) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

/**
 * Parse rate input (handles both incl. and excl. GST)
 */
export const parseRateInput = (value, gstRate, isInclusive) => {
    const amount = parseFloat(value) || 0;

    if (isInclusive) {
        // User entered rate including GST
        const result = reverseGSTCalculation(amount, gstRate);
        return {
            baseRate: result.base,
            gstAmount: result.gst,
            totalRate: amount
        };
    } else {
        // User entered base rate
        const gstAmount = calculateGST(amount, gstRate);
        return {
            baseRate: amount,
            gstAmount: gstAmount,
            totalRate: amount + gstAmount
        };
    }
};

/**
 * Generate SKU for new account
 */
export const generateSKU = (type, existingLedgers) => {
    const prefix = {
        'customer': 'CX',
        'supplier': 'SUP',
        'technician': 'TX',
        'expense': 'EXP',
        'income': 'INC'
    }[type] || 'ACC';

    // Find highest number for this prefix
    const existing = existingLedgers
        .filter(l => l.sku && l.sku.startsWith(prefix))
        .map(l => {
            const match = l.sku.match(/\d+$/);
            return match ? parseInt(match[0]) : 0;
        });

    const maxNum = existing.length > 0 ? Math.max(...existing) : 0;
    const nextNum = (maxNum + 1).toString().padStart(3, '0');

    return `${prefix}-${nextNum}`;
};

/**
 * Validate GSTIN format
 */
export const validateGSTIN = (gstin) => {
    if (!gstin) return false;
    // Format: 27AABCU9603R1ZM (15 characters)
    const pattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return pattern.test(gstin);
};

/**
 * Get state from pin code (basic implementation)
 */
export const getStateFromPincode = (pincode) => {
    if (!pincode) return '';

    const pin = pincode.toString();
    const stateMap = {
        '4': 'Maharashtra',
        '1': 'Delhi',
        '2': 'Haryana',
        '3': 'Punjab',
        '5': 'Karnataka',
        '6': 'Tamil Nadu',
        '7': 'Andhra Pradesh',
        '8': 'West Bengal'
    };

    return stateMap[pin[0]] || '';
};
