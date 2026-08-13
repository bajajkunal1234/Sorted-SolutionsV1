import pdf from 'pdf-parse';
import * as XLSX from 'xlsx';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function parseAmortizationText(text) {
    const lines = text.split('\n');
    const installments = [];
    
    // Date matches: DD-MM-YYYY, DD/MM/YYYY, DD-MMM-YY, YYYY-MM-DD
    const dateRegex = /\b(\d{1,2})[-/]([a-zA-Z]{3}|\d{1,2})[-/](\d{2,4})\b|\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/;
    
    let instNumber = 1;

    for (let line of lines) {
        const dateMatch = line.match(dateRegex);
        if (!dateMatch) continue;

        const dateStr = dateMatch[0];
        
        // Clean line numbers and keep numbers only
        const lineWithoutDate = line.replace(dateStr, ' ');
        
        // Extract all numbers (integers or decimals)
        const numberMatches = lineWithoutDate.match(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/g);
        if (!numberMatches || numberMatches.length < 2) continue; 

        const numbers = numberMatches.map(n => parseFloat(n.replace(/,/g, '')));

        let emi = 0;
        let principal = 0;
        let interest = 0;

        // Try heuristic: look for pairs where A + B = C
        let found = false;
        if (numbers.length >= 3) {
            for (let i = 0; i < numbers.length; i++) {
                for (let j = 0; j < numbers.length; j++) {
                    if (i === j) continue;
                    const sum = numbers[i] + numbers[j];
                    const matchIndex = numbers.findIndex((n, idx) => idx !== i && idx !== j && Math.abs(n - sum) < 10);
                    if (matchIndex !== -1) {
                        emi = numbers[matchIndex];
                        principal = numbers[i];
                        interest = numbers[j];
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
        }

        if (!found) {
            // Fallback heuristics based on typical columns
            if (numbers.length === 2) {
                [emi, principal] = numbers;
                interest = Math.max(0, emi - principal);
            } else if (numbers.length >= 3) {
                if (numbers[0] < 500 && numbers[0] > 0) { 
                    emi = numbers[1];
                    principal = numbers[2];
                    interest = numbers[3] || 0;
                } else {
                    emi = numbers[0];
                    principal = numbers[1];
                    interest = numbers[2];
                }
            }
        }

        // Validate values
        if (emi <= 0 || principal <= 0) continue;

        // Parse date string to standard YYYY-MM-DD
        let formattedDate = null;
        try {
            if (dateStr.match(/^\d{4}/)) {
                const parts = dateStr.split(/[-/]/);
                formattedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            } else {
                let [d, m, y] = dateStr.split(/[-/]/);
                if (y.length === 2) y = '20' + y;
                
                const months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
                let monthNum = parseInt(m);
                if (isNaN(monthNum)) {
                    monthNum = months[m.toLowerCase().substring(0, 3)] || 1;
                }
                
                const pad = (num) => String(num).padStart(2, '0');
                formattedDate = `${y}-${pad(monthNum)}-${pad(d)}`;
            }
        } catch (e) {
            continue;
        }

        installments.push({
            due_date: formattedDate,
            installment_number: instNumber++,
            expected_amount: emi,
            expected_principal: principal,
            expected_interest: interest
        });
    }

    return installments;
}

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file) {
            return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = file.name.toLowerCase();

        let extractedText = '';
        let installments = [];

        if (filename.endsWith('.pdf')) {
            const pdfData = await pdf(buffer);
            extractedText = pdfData.text;
            installments = parseAmortizationText(extractedText);
        } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv')) {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            const textLines = jsonData.map(row => row.join(' '));
            extractedText = textLines.join('\n');
            installments = parseAmortizationText(extractedText);
        } else {
            return NextResponse.json({ success: false, error: 'Unsupported file type. Please upload a PDF or Excel/CSV file.' }, { status: 400 });
        }

        if (installments.length === 0) {
            return NextResponse.json({ 
                success: false, 
                error: 'Could not find any amortization schedule rows in the file. Ensure the file contains dates and numeric values for installments.' 
            }, { status: 422 });
        }

        // Calculate Totals and Metadata
        let totalPrincipal = 0;
        let totalInterest = 0;
        let totalEmi = 0;
        
        installments.forEach(inst => {
            totalPrincipal += inst.expected_principal;
            totalInterest += inst.expected_interest;
            totalEmi += inst.expected_amount;
        });

        const tenure = installments.length;
        const avgEmi = totalEmi / tenure;

        let guessedLender = 'Unknown Supplier';
        const bankKeywords = [
            'hdfc', 'icici', 'sbi', 'state bank', 'axis', 'kotak', 'idfc', 'indusind', 
            'yes bank', 'hsbc', 'citi', 'standard chartered', 'bajaj', 'tata capital'
        ];
        
        for (let keyword of bankKeywords) {
            if (extractedText.toLowerCase().includes(keyword)) {
                guessedLender = keyword.toUpperCase();
                break;
            }
        }

        const lenderRegex = /(?:lender|bank|supplier|creditor)\s*:\s*([a-zA-Z0-9\s]+)/i;
        const lenderMatch = extractedText.match(lenderRegex);
        if (lenderMatch && lenderMatch[1]) {
            guessedLender = lenderMatch[1].trim();
        }

        return NextResponse.json({
            success: true,
            guessedLender,
            principal: Math.round(totalPrincipal),
            interestRateGuess: guessedLender.includes('HOME') || totalInterest / totalPrincipal > 0.5 ? 9.5 : 12.0,
            tenure_months: tenure,
            emi_amount: Math.round(avgEmi),
            installments
        });

    } catch (e) {
        console.error('[parse-schedule-error]:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
