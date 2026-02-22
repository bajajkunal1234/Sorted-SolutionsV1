-- Add firebase_uid to customers and technicians tables
-- Created on 2026-02-21

DO $$ 
BEGIN
    -- Add to customers if not exists
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'customers' AND COLUMN_NAME = 'firebase_uid') THEN
        ALTER TABLE customers ADD COLUMN firebase_uid TEXT UNIQUE;
    END IF;

    -- Add to technicians if not exists
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'technicians' AND COLUMN_NAME = 'firebase_uid') THEN
        ALTER TABLE technicians ADD COLUMN firebase_uid TEXT UNIQUE;
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_firebase_uid ON customers(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_technicians_firebase_uid ON technicians(firebase_uid);
