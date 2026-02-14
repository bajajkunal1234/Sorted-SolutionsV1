-- Add username and password fields to technicians table for login credentials
ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_technicians_username ON technicians(username);

-- Update is_active column name (if it doesn't exist, add it)
ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- If 'active' column exists and 'is_active' doesn't, rename it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'technicians' AND column_name = 'active')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'technicians' AND column_name = 'is_active') THEN
        ALTER TABLE technicians RENAME COLUMN active TO is_active;
    END IF;
END $$;
