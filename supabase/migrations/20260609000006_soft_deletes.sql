-- =============================================================================
-- TravelOS — Stability Refactoring (Soft Deletes)
-- Migration: 20260609000006_soft_deletes
-- =============================================================================

-- 1. Add deleted_at column to critical tables
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.trip_passengers ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2. Update RLS Policies to hide soft-deleted records from standard queries

-- Clients
DROP POLICY IF EXISTS "agency members read clients" ON public.clients;
CREATE POLICY "agency members read clients" ON public.clients
  FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id) AND deleted_at IS NULL);

-- Trip Passengers
DROP POLICY IF EXISTS "agency members read passengers" ON public.trip_passengers;
CREATE POLICY "agency members read passengers" ON public.trip_passengers
  FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id) AND deleted_at IS NULL);

-- Proposals
DROP POLICY IF EXISTS "agency members read proposals" ON public.proposals;
CREATE POLICY "agency members read proposals" ON public.proposals
  FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id) AND deleted_at IS NULL);

-- Financial Records
DROP POLICY IF EXISTS "fin read" ON public.financial_records;
CREATE POLICY "fin read" ON public.financial_records
  FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id) AND deleted_at IS NULL);

-- Vouchers
DROP POLICY IF EXISTS "vouchers read" ON public.vouchers;
CREATE POLICY "vouchers read" ON public.vouchers
  FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id) AND deleted_at IS NULL);

-- 3. Prevent physical deletion by regular users (Audit Safety)
-- Change delete policies to only allow soft-delete via UPDATE
-- Warning: Super admins might still need physical delete rights, but for now we restrict agency admins.

-- Revoke physical DELETE for Clients
DROP POLICY IF EXISTS "agency admins delete clients" ON public.clients;
-- (Users will now use UPDATE to set deleted_at)

-- Revoke physical DELETE for Trip Passengers
DROP POLICY IF EXISTS "agency members delete passengers" ON public.trip_passengers;

-- Revoke physical DELETE for Proposals
DROP POLICY IF EXISTS "agency admins delete proposals" ON public.proposals;

-- Revoke physical DELETE for Financial Records
DROP POLICY IF EXISTS "fin delete" ON public.financial_records;

-- Revoke physical DELETE for Vouchers
DROP POLICY IF EXISTS "vouchers delete" ON public.vouchers;
