-- Standard Account Groups Seeding
-- Date: 2026-02-19

INSERT INTO account_groups (id, name, nature, parent, "behavesAsSubLedger")
VALUES 
    ('capital-account', 'Capital Account', 'equity', NULL, FALSE),
    ('loans-liability', 'Loans (Liability)', 'liabilities', NULL, FALSE),
    ('current-liabilities', 'Current Liabilities', 'liabilities', NULL, FALSE),
    ('fixed-assets', 'Fixed Assets', 'asset', NULL, FALSE),
    ('investments', 'Investments', 'asset', NULL, FALSE),
    ('current-assets', 'Current Assets', 'asset', NULL, FALSE),
    ('sales-accounts', 'Sales Accounts', 'income', NULL, FALSE),
    ('purchase-accounts', 'Purchase Accounts', 'expense', NULL, FALSE),
    ('direct-incomes', 'Direct Incomes', 'income', NULL, FALSE),
    ('indirect-incomes', 'Indirect Incomes', 'income', NULL, FALSE),
    ('direct-expenses', 'Direct Expenses', 'expense', NULL, FALSE),
    ('indirect-expenses', 'Indirect Expenses', 'expense', NULL, FALSE),
    
    -- Sub Groups
    ('bank-accounts', 'Bank Accounts', 'asset', 'current-assets', FALSE),
    ('cash-in-hand', 'Cash-in-hand', 'asset', 'current-assets', FALSE),
    ('sundry-debtors', 'Sundry Debtors', 'asset', 'current-assets', TRUE),
    ('sundry-creditors', 'Sundry Creditors', 'liabilities', 'current-liabilities', TRUE),
    ('duties-taxes', 'Duties & Taxes', 'liabilities', 'current-liabilities', FALSE),
    ('provisions', 'Provisions', 'liabilities', 'current-liabilities', FALSE),
    ('stock-in-hand', 'Stock-in-hand', 'asset', 'current-assets', FALSE),
    ('loans-advances-asset', 'Loans & Advances (Asset)', 'asset', 'current-assets', FALSE)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    nature = EXCLUDED.nature,
    parent = EXCLUDED.parent,
    "behavesAsSubLedger" = EXCLUDED."behavesAsSubLedger";
