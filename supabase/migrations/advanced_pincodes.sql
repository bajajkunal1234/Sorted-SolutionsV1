-- Add advanced_pincodes JSONB column to quick_booking_settings
ALTER TABLE quick_booking_settings ADD COLUMN IF NOT EXISTS advanced_pincodes JSONB DEFAULT '[]'::jsonb;

-- Example of the JSONB structure:
-- [
--   {
--     "pincode": "400063",
--     "locality": "Goregaon East",
--     "appliances": ["1", "5"] // Array of category IDs; empty means 'All Appliances'
--   }
-- ]

-- Optional: You can try to backfill the existing simple text array into the advanced JSONB if you wish, 
-- but given the new locality requirement, the admin will need to populate the localities anyway.
-- Here is a basic backfill script that gives each existing pincode a blank locality and "All" appliances:

UPDATE quick_booking_settings
SET advanced_pincodes = (
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'pincode', pin,
                'locality', '',
                'appliances', '[]'::jsonb
            )
        ),
        '[]'::jsonb
    )
    FROM unnest(serviceable_pincodes) AS pin
)
WHERE id = 1 AND (advanced_pincodes IS NULL OR jsonb_array_length(advanced_pincodes) = 0);
