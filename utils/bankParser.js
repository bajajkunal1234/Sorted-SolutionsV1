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

    const cleanNum = (val) => {
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        if (!val) return 0;
        const str = String(val).replace(/,/g, '').trim();
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    };

    let dateValue = null;
    let particulars = '';
    let refNo = '';
    let withdrawal = 0;
    let deposit = 0;
    let balance = 0;

    if (format === 'HDFC') {
        dateValue = getValue(['Date', 'Txn Date', 'Transaction Date']);
        particulars = getValue(['Narration', 'Particulars', 'Description']) || '';
        refNo = getValue(['Chq./Ref.No.', 'Reference No.', 'Ref No.', 'Cheque/Ref No']) || '';
        withdrawal = cleanNum(getValue(['Withdrawal Amt.', 'Withdrawal', 'Debit Amt.', 'Debit']));
        deposit = cleanNum(getValue(['Deposit Amt.', 'Deposit', 'Credit Amt.', 'Credit']));
        balance = cleanNum(getValue(['Closing Balance', 'Balance', 'Closing Bal', 'Balance (INR)']));
    } else if (format === 'ICICI') {
        dateValue = getValue(['Transaction Date', 'Date', 'Value Date']);
        particulars = getValue(['Transaction Remarks', 'Particulars', 'Narration', 'Description']) || '';
        refNo = getValue(['Cheque Number', 'Ref No.', 'Transaction ID', 'Reference']) || '';
        withdrawal = cleanNum(getValue(['Withdrawal Amt (INR)', 'Withdrawal', 'Debit']));
        deposit = cleanNum(getValue(['Deposit Amt (INR)', 'Deposit', 'Credit']));
        balance = cleanNum(getValue(['Balance (INR)', 'Balance', 'Closing Balance']));
    } else {
        dateValue = getValue(['Date', 'Date/Time', 'Transaction Date', 'Txn Date']);
        particulars = getValue(['Narration', 'Description', 'Particulars', 'Transaction Remarks']) || '';
        refNo = getValue(['Reference', 'Ref No.', 'Chq No.', 'Chq./Ref.No.', 'Cheque No.']) || '';
        withdrawal = cleanNum(getValue(['Withdrawal', 'Debit', 'Withdrawal Amt.', 'Debit Amount']));
        deposit = cleanNum(getValue(['Deposit', 'Credit', 'Deposit Amt.', 'Credit Amount']));
        balance = cleanNum(getValue(['Balance', 'Closing Balance', 'Closing Bal', 'Balance (INR)']));
    }

    // Format Date
    let date = '';
    if (dateValue instanceof Date) {
        date = dateValue.toISOString().split('T')[0];
    } else if (typeof dateValue === 'string') {
        const trimmed = dateValue.trim();
        const parts = trimmed.split(/[\/\-]/);
        if (parts.length === 3) {
            let [p0, p1, p2] = parts;
            if (p0.length === 4) {
                // YYYY-MM-DD
                date = `${p0}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`;
            } else {
                // DD-MM-YYYY or DD-MM-YY
                let y = p2.length === 2 ? '20' + p2 : p2;
                let m = p1.padStart(2, '0');
                let d = p0.padStart(2, '0');
                date = `${y}-${m}-${d}`;
            }
        } else {
            date = trimmed;
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
