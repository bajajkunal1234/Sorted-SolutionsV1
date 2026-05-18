-- Migration: Add missing bank and tax columns to accounts table
-- Purpose: Support bank account details (micr_code, account_type, enable_cheque_printing) and accounting settings (rounding_method, currency) in AccountDetailModal

ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS micr_code TEXT,
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'savings',
ADD COLUMN IF NOT EXISTS enable_cheque_printing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rounding_method TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';

NOTIFY pgrst, 'reload schema';
