-- ============================================================
-- Migration: Financial Security Hardening (Phase P0 Fixes)
-- Restrict RLS policies on ledger entries (make read-only for agents,
-- block all updates/deletes) and adjustments (restrict to admins).
-- ============================================================

-- 1. Hardening financial_ledger_entries (Immutable contábil ledger)
DROP POLICY IF EXISTS "ledger_entries_access" ON public.financial_ledger_entries;

-- General agents can only SELECT entries of their agency.
-- No user can INSERT, UPDATE, or DELETE directly, keeping the ledger append-only
-- and writeable only by triggers or system role.
CREATE POLICY "ledger_entries_select" ON public.financial_ledger_entries
  FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

-- 2. Hardening seller_adjustments (Commissions adjustments)
DROP POLICY IF EXISTS "adjustments_access" ON public.seller_adjustments;

-- Sellers can only view (SELECT) adjustments where they are the assignee.
-- Admins can view all adjustments in their agency.
CREATE POLICY "adjustments_select" ON public.seller_adjustments
  FOR SELECT TO authenticated USING (
    (seller_id = auth.uid() AND public.is_agency_member(auth.uid(), agency_id)) OR
    public.has_role(auth.uid(), 'agency_admin', agency_id) OR
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

-- Only agency admins or super admins can INSERT, UPDATE, or DELETE adjustments.
CREATE POLICY "adjustments_manage" ON public.seller_adjustments
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'agency_admin', agency_id) OR
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
  ) WITH CHECK (
    public.has_role(auth.uid(), 'agency_admin', agency_id) OR
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );
