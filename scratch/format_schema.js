const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'db_schema_dump.json');
if (!fs.existsSync(schemaPath)) {
    console.error('Schema dump file not found');
    process.exit(1);
}

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

const coreTables = [
    'jobs',
    'customers',
    'technicians',
    'accounts',
    'account_groups',
    'transactions',
    'transaction_line_items',
    'journal_entries',
    'journal_entry_lines',
    'sales_invoices',
    'purchase_invoices',
    'receipt_vouchers',
    'payment_vouchers',
    'expenses',
    'active_amcs',
    'active_rentals',
    'inventory',
    'technician_stock',
    'interactions'
];

let markdown = '# Database Schema (Core Tables)\n\n';

for (const tableName of coreTables) {
    if (!schema[tableName]) {
        markdown += `## Table: ${tableName} (Not found in dump)\n\n`;
        continue;
    }
    
    markdown += `## Table: \`${tableName}\`\n\n`;
    markdown += '| Column | Type | Nullable | Default |\n';
    markdown += '| --- | --- | --- | --- |\n';
    
    for (const col of schema[tableName]) {
        const defVal = col.default !== null ? `\`${col.default}\`` : '*NULL*';
        markdown += `| **${col.column}** | \`${col.type}\` | ${col.nullable} | ${defVal} |\n`;
    }
    
    markdown += '\n';
}

fs.writeFileSync(path.join(__dirname, 'core_db_schema.md'), markdown);
console.log('Core database schema markdown written to scratch/core_db_schema.md');
