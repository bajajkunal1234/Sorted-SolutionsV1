-- Migration: Allow technician app duty toggle and admin portal bank account creation
-- Also add explicit policies for admin_recipients and qrcodes

-- 1. technician_live_locations: allow public UPDATE and INSERT so mobile app can toggle duty status
DROP POLICY IF EXISTS "Public update access for technician_live_locations" ON public.technician_live_locations;
CREATE POLICY "Public update access for technician_live_locations"
ON public.technician_live_locations
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Public insert access for technician_live_locations" ON public.technician_live_locations;
CREATE POLICY "Public insert access for technician_live_locations"
ON public.technician_live_locations
FOR INSERT
TO public
WITH CHECK (true);

-- 2. accounts: allow public INSERT and UPDATE so BankAccountsReport can create/update bank accounts
DROP POLICY IF EXISTS "Public insert access for accounts" ON public.accounts;
CREATE POLICY "Public insert access for accounts"
ON public.accounts
FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Public update access for accounts" ON public.accounts;
CREATE POLICY "Public update access for accounts"
ON public.accounts
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- 3. admin_recipients: explicit service role and public read policies
DROP POLICY IF EXISTS "Service role full access on admin_recipients" ON public.admin_recipients;
CREATE POLICY "Service role full access on admin_recipients"
ON public.admin_recipients
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Public read access for admin_recipients" ON public.admin_recipients;
CREATE POLICY "Public read access for admin_recipients"
ON public.admin_recipients
FOR SELECT
TO public
USING (true);

-- 4. qrcodes: explicit service role and public read policies
DROP POLICY IF EXISTS "Service role full access on qrcodes" ON public.qrcodes;
CREATE POLICY "Service role full access on qrcodes"
ON public.qrcodes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Public read access for qrcodes" ON public.qrcodes;
CREATE POLICY "Public read access for qrcodes"
ON public.qrcodes
FOR SELECT
TO public
USING (true);
