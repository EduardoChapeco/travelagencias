-- Migration: 20260620000000_financial_reconciliation_and_vales.sql
-- Goal: Prepare database schema for Cash Flow adjustments, Operator Reconciliations, and Group Tour cost budgets.

-- 1. Add employee and operator relations to financial transactions
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS operator_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- 2. Add employee and operator relations to financial records
ALTER TABLE public.financial_records
  ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS operator_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- 3. Add Ads budget and savings vault to group_tours
ALTER TABLE public.group_tours
  ADD COLUMN IF NOT EXISTS ads_budget numeric(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS target_poupanca_balance numeric(12,2) NOT NULL DEFAULT 0.00;

-- 4. Create Group Tour Costs Table
CREATE TABLE IF NOT EXISTS public.group_tour_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_tour_id uuid REFERENCES public.group_tours(id) ON DELETE CASCADE NOT NULL,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0.00,
  type text NOT NULL DEFAULT 'fixed' CHECK (type IN ('fixed', 'variable')), -- fixed (ônibus, guia) or variable (ingresso, hotel por pax)
  allocated_per_pax boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. RLS Policies for group_tour_costs
ALTER TABLE public.group_tour_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "costs_all_policy" ON public.group_tour_costs
  FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

-- Trigger for updated_at on group_tour_costs
CREATE TRIGGER trg_group_tour_costs_updated_at 
  BEFORE UPDATE ON public.group_tour_costs 
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_updated_at();
