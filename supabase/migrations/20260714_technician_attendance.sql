-- Alter technicians to add weekly_off_day
ALTER TABLE public.technicians 
ADD COLUMN IF NOT EXISTS weekly_off_day TEXT DEFAULT 'Sunday';

-- Create technician_attendance table
CREATE TABLE IF NOT EXISTS public.technician_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technician_id UUID NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('present', 'absent', 'half_day', 'weekly_off', 'leave')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (technician_id, date)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.technician_attendance ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated/service roles (and general select)
DROP POLICY IF EXISTS "Allow all for technician_attendance" ON public.technician_attendance;
CREATE POLICY "Allow all for technician_attendance" ON public.technician_attendance FOR ALL USING (true) WITH CHECK (true);
