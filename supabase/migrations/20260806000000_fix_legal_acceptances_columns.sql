-- Migration: 20260806000000_fix_legal_acceptances_columns.sql
-- Objective: Ensure public.legal_acceptances table supports both user-compliance and client-contract accepts

-- 1. Alter columns in public.legal_acceptances to be optional and add missing columns
ALTER TABLE public.legal_acceptances 
  ALTER COLUMN client_id DROP NOT NULL,
  ALTER COLUMN agency_id DROP NOT NULL,
  ALTER COLUMN terms_type DROP NOT NULL;

ALTER TABLE public.legal_acceptances
  ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES public.policy_documents(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS context text;

-- 2. Adjust RLS policies to allow insert and read for authenticated users' compliance acceptances
DROP POLICY IF EXISTS "la read" ON public.legal_acceptances;
DROP POLICY IF EXISTS "la insert backend only" ON public.legal_acceptances;
DROP POLICY IF EXISTS "agency_members_read" ON public.legal_acceptances;
DROP POLICY IF EXISTS "clients_own_acceptances" ON public.legal_acceptances;
DROP POLICY IF EXISTS "public_insert" ON public.legal_acceptances;

-- Allow users to read their own compliance acceptance or those within their agency
CREATE POLICY "legal_acceptances_select" ON public.legal_acceptances
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    OR agency_id IN (SELECT agency_id FROM public.user_roles WHERE user_id = auth.uid())
  );

-- Allow inserting own acceptance
CREATE POLICY "legal_acceptances_insert" ON public.legal_acceptances
  FOR INSERT TO authenticated, anon
  WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL
  );

GRANT SELECT, INSERT ON public.legal_acceptances TO authenticated, anon;
GRANT ALL ON public.legal_acceptances TO service_role;
