ALTER TABLE receipt_vouchers ADD COLUMN payment_account_id UUID REFERENCES accounts(id); ALTER TABLE payment_vouchers ADD COLUMN payment_account_id UUID REFERENCES accounts(id);
