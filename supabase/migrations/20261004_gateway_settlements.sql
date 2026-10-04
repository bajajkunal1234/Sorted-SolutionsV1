-- Migration: Add payment gateway settlement tracking and settlements table
-- Purpose: Track unsettled vs settled customer collections across payment gateways (Google Pay QR, Razorpay, Pine Labs)
-- and support auto-creating commission purchase vouchers.

ALTER TABLE receipt_vouchers ADD COLUMN IF NOT EXISTS is_settled BOOLEAN DEFAULT FALSE;
ALTER TABLE receipt_vouchers ADD COLUMN IF NOT EXISTS settlement_ref TEXT;
ALTER TABLE receipt_vouchers ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS gateway_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_account_id UUID REFERENCES accounts(id),
    destination_account_id UUID REFERENCES accounts(id),
    settlement_ref TEXT,
    settlement_date DATE DEFAULT CURRENT_DATE,
    gross_amount NUMERIC DEFAULT 0,
    fee_amount NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    net_amount NUMERIC DEFAULT 0,
    purchase_invoice_id UUID,
    receipt_ids JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
