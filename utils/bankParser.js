import * as XLSX from 'xlsx';

/**
 * Bank Statement Parser Utility
 * Handles parsing for different bank formats (HDFC, ICICI, etc.)
 */

export const parseBankCSV = (csvText) => {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    // Detect headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    // Identify Bank Format based on headers
    const format = detectFormat(headers);

    const transactions = [];

    // Start from line 1 (skip headers)
    for (let i = 1; i < lines.length; i++) {
        const columns = parseCSVLine(lines[i]);
        if (columns.length < 3) continue;

        const row = {};
        headers.forEach((h, idx) => {
            row[h] = columns[idx]?.trim().replace(/^"|"$/g, '');
        });

        transactions.push(normalizeTransaction(row, format));
    }

    return transactions;
};

export const parseBankExcel = (buffer) => {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert to 2D array first to find the header row
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (rawData.length === 0) return [];

    // Find the header row (searching for 'Date' and 'Narration' or 'Transaction Remarks')
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(rawData.length, 50); i++) {
        const row = rawData[i];
        const rowStr = row.join(',').toLowerCase();
        if (rowStr.includes('date') && (rowStr.includes('narration') || rowStr.includes('remarks') || rowStr.includes('particulars'))) {
            headerRowIndex = i;
            break;
        }
    }

    if (headerRowIndex === -1) {
        // Fallback to row 0 if no clear header found
        headerRowIndex = 0;
    }

    const headers = rawData[headerRowIndex].map(h => String(h || '').trim());
    const transactionsData = rawData.slice(headerRowIndex + 1);
    const format = detectFormat(headers);

    return transactionsData
        .filter(row => {
            if (row.length < 3) return false;
            const dateStr = String(row[0] || '').toLowerCase();
            const narration = String(row[1] || '').toLowerCase();

            // Skip clearly non-date first columns
            if (dateStr.includes('hdfc bank') || dateStr.includes('registered office') || dateStr.includes('statement of') || dateStr.includes('page')) return false;

            // Skip boilerplate narration rows
            if (narration.includes('contents of this statement') || narration.includes('reported within') || narration.includes('gstin number') || narration.includes('end of statement')) return false;

            // Must have a date and either an amount or a narration
            return row[0] && (row[1] || row[3] || row[4]);
        })
        .map(row => {
            const rowObj = {};
            headers.forEach((h, idx) => {
                rowObj[h] = row[idx];
            });
            return normalizeTransaction(rowObj, format);
        })
        .filter(t => t.particulars && t.amount > 0); // Final check to ensure we have meaningful data
};

const detectFormat = (headers) => {
    const headerStr = headers.join(',').toLowerCase();
    if (headerStr.includes('narration') && headerStr.includes('withdrawal amt.')) return 'HDFC';
    if (headerStr.includes('transaction remarks') && headerStr.includes('withdrawal amt (inr)')) return 'ICICI';
    return 'GENERIC';
};

const parseCSVLine = (line) => {
    // Basic CSV parser that handles quotes
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuote = !inQuote;
        else if (char === ',' && !inQuote) {
            result.push(cur);
            cur = '';
        } else {
            cur += char;
        }
    }
    result.push(cur);
    return result;
};

const normalizeTransaction = (row, format) => {
    // Utility to get value from row using multiple possible keys
    const getValue = (keys) => {
        for (const key of keys) {
            // Case-insensitive search for the key in row
            const actualKey = Object.keys(row).find(k =>
                k.toLowerCase().trim().replace(/\s+/g, ' ') === key.toLowerCase().trim()
            );
            if (actualKey && (row[actualKey] !== undefined && row[actualKey] !== null && row[actualKey] !== '')) {
                return row[actualKey];
            }
        }
        return null;
    };

    let dateValue = null;
    let particulars = '';
    let refNo = '';
    let withdrawal = 0;
    let deposit = 0;
    let balance = 0;

    if (format === 'HDFC') {
        dateValue = getValue(['Date']);
        particulars = getValue(['Narration', 'Particulars']) || '';
        refNo = getValue(['Chq./Ref.No.', 'Reference No.']) || '';
        withdrawal = parseFloat(getValue(['Withdrawal Amt.', 'Withdrawal'])) || 0;
        deposit = parseFloat(getValue(['Deposit Amt.', 'Deposit'])) || 0;
        balance = parseFloat(getValue(['Closing Balance', 'Balance'])) || 0;
    } else if (format === 'ICICI') {
        dateValue = getValue(['Transaction Date', 'Date']);
        particulars = getValue(['Transaction Remarks', 'Particulars', 'Narration']) || '';
        refNo = getValue(['Cheque Number', 'Ref No.']) || '';
        withdrawal = parseFloat(getValue(['Withdrawal Amt (INR)', 'Withdrawal'])) || 0;
        deposit = parseFloat(getValue(['Deposit Amt (INR)', 'Deposit'])) || 0;
        balance = parseFloat(getValue(['Balance (INR)', 'Balance'])) || 0;
    } else {
        dateValue = getValue(['Date', 'Date/Time', 'Transaction Date']);
        particulars = getValue(['Narration', 'Description', 'Particulars', 'Transaction Remarks']) || '';
        refNo = getValue(['Reference', 'Ref No.', 'Chq No.', 'Chq./Ref.No.']) || '';
        withdrawal = parseFloat(getValue(['Withdrawal', 'Debit', 'Withdrawal Amt.'])) || 0;
        deposit = parseFloat(getValue(['Deposit', 'Credit', 'Deposit Amt.'])) || 0;
        balance = parseFloat(getValue(['Balance', 'Closing Balance'])) || 0;
    }

    // Format Date
    let date = '';
    if (dateValue instanceof Date) {
        date = dateValue.toISOString().split('T')[0];
    } else if (typeof dateValue === 'string') {
        // Try to handle DD/MM/YY or DD/MM/YYYY
        const parts = dateValue.split(/[\/\-]/);
        if (parts.length === 3) {
            let d = parts[0], m = parts[1], y = parts[2];
            if (y.length === 2) y = '20' + y;
            if (d.length === 1) d = '0' + d;
            if (m.length === 1) m = '0' + m;
            date = `${y}-${m}-${d}`;
        } else {
            date = dateValue;
        }
    } else if (dateValue) {
        date = String(dateValue);
    }

    return {
        date,
        particulars: String(particulars).trim(),
        refNo: String(refNo).trim(),
        amount: Math.abs(withdrawal || deposit),
        type: withdrawal > 0 ? 'payment' : 'receipt',
        balance,
        status: 'unreconciled',
        suggestedAccount: suggestAccount(String(particulars))
    };
};

const suggestAccount = (particulars) => {
    if (!particulars) return null;
    const p = particulars.toLowerCase();

    if (p.includes('telecom') || p.includes('jio') || p.includes('airtel') || p.includes('vi ')) return 'Telephone/Internet';
    if (p.includes('electric') || p.includes('mseb') || p.includes('adani')) return 'Electricity';
    if (p.includes('salary') || p.includes('wages')) return 'Salaries & Wages';
    if (p.includes('rent')) return 'Office Rent';
    if (p.includes('petrol') || p.includes('fuel')) return 'Fuel & Conveyance';
    if (p.includes('swiggy') || p.includes('zomato') || p.includes('food')) return 'Staff Welfare';

    return null;
};
