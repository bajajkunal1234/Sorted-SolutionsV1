-- Migration: Enable Row Level Security (RLS) on gateway_settlements and technician_cash_handovers
-- Description: Resolves Supabase linter critical security alert 'rls_disabled_in_public'

-- 1. Enable RLS on gateway_settlements
ALTER TABLE IF EXISTS public.gateway_settlements ENABLE ROW LEVEL SECURITY;

-- 2. Enable RLS on technician_cash_handovers
ALTER TABLE IF EXISTS public.technician_cash_handovers ENABLE ROW LEVEL SECURITY;

-- 3. Service role full access policies
DROP POLICY IF EXISTS "Service role full access on gateway_settlements" ON public.gateway_settlements;
CREATE POLICY "Service role full access on gateway_settlements"
ON public.gateway_settlements
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on technician_cash_handovers" ON public.technician_cash_handovers;
CREATE POLICY "Service role full access on technician_cash_handovers"
ON public.technician_cash_handovers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Public read policy for technician_cash_handovers
DROP POLICY IF EXISTS "Public read access for technician_cash_handovers" ON public.technician_cash_handovers;
CREATE POLICY "Public read access for technician_cash_handovers"
ON public.technician_cash_handovers
FOR SELECT
TO public
USING (true);
