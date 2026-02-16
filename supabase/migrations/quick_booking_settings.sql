-- Create quick_booking_settings table
CREATE TABLE IF NOT EXISTS quick_booking_settings (
    id BIGINT PRIMARY KEY DEFAULT 1,
    title TEXT DEFAULT 'Book A Technician Now',
    subtitle TEXT DEFAULT 'Get same day service | Transparent pricing | Licensed technicians',
    serviceable_pincodes TEXT[] DEFAULT ARRAY['400001', '400002', '400003', '400004', '400005', '400008', '400012', '400014', '400050', '400051', '400052', '400053', '400063', '400070', '400077'],
    valid_pincode_message TEXT DEFAULT '✓ We serve here!',
    invalid_pincode_message TEXT DEFAULT '✗ Not serviceable',
    help_text TEXT DEFAULT 'We currently serve Mumbai areas. Call us for other locations.',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT one_row CHECK (id = 1)
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_quick_booking_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quick_booking_settings_modtime
    BEFORE UPDATE ON quick_booking_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_quick_booking_settings_updated_at();

-- Insert initial data
INSERT INTO quick_booking_settings (id, title, subtitle)
VALUES (1, 'Book A Technician Now', 'Get same day service | Transparent pricing | Licensed technicians')
ON CONFLICT (id) DO NOTHING;
