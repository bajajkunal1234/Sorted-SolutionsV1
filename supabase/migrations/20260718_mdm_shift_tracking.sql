-- Alter technicians to add mdm_device_id
ALTER TABLE public.technicians 
ADD COLUMN IF NOT EXISTS mdm_device_id TEXT;

-- Alter technician_live_locations to add duty_status
ALTER TABLE public.technician_live_locations 
ADD COLUMN IF NOT EXISTS duty_status VARCHAR(50) DEFAULT 'offline';

-- Alter technician_attendance to add shift and lunch times
ALTER TABLE public.technician_attendance 
ADD COLUMN IF NOT EXISTS shift_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS shift_end_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lunch_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lunch_end_time TIMESTAMPTZ;
