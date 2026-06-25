-- ============================================================
-- Migration: Financial Rearchitecture Core Schemas (Phase 1)
-- Creates ledger, categories, adjustments, commission plans,
-- and monthly close period controls.
-- ============================================================

-- 1. Financial Categories (Plano de Contas estruturado)
CREATE TABLE IF NOT EXISTS public.financial_categories (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id      uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  parent_id      uuid REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  name           text NOT NULL,
  category_type  text NOT NULL CHECK (category_type IN ('revenue', 'expense', 'asset', 'liability', 'control')),
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_id, name)
);

-- 2. Seller Commission Plans
CREATE TABLE IF NOT EXISTS public.seller_commission_plans (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id             uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  seller_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  valid_from            date NOT NULL,
  valid_until           date,
  tier_mode             text NOT NULL DEFAULT 'integral' CHECK (tier_mode IN ('integral', 'progressive')),
  commission_base_rule  text NOT NULL DEFAULT 'base_comissionavel', -- 'base_comissionavel', 'total_sale'
  over_share_rule       text NOT NULL DEFAULT 'default_30',
  status                text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  version               int NOT NULL DEFAULT 1,
  created_by            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- 3. Seller Commission Tiers
CREATE TABLE IF NOT EXISTS public.seller_commission_tiers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         uuid NOT NULL REFERENCES public.seller_commission_plans(id) ON DELETE CASCADE,
  minimum_volume  numeric(14,2) NOT NULL DEFAULT 0.00,
  maximum_volume  numeric(14,2),
  commission_rate numeric(5,2) NOT NULL DEFAULT 0.00,
  bonus_amount    numeric(14,2) NOT NULL DEFAULT 0.00,
  sort_order      int NOT NULL DEFAULT 0
);

-- 4. Seller Adjustments (Descontos por erros, incentivos, adiantamentos)
CREATE TABLE IF NOT EXISTS public.seller_adjustments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id             uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  seller_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sale_id               uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  adjustment_type       text NOT NULL CHECK (adjustment_type IN ('error_charge', 'bonus', 'advance', 'chargeback', 'reimbursement', 'manual_adjustment', 'incentive', 'gift_cost')),
  description           text NOT NULL,
  amount                numeric(14,2) NOT NULL DEFAULT 0.00,
  effective_period      text NOT NULL CHECK (effective_period ~ '^\d{4}-\d{2}$'), -- Formato YYYY-MM
  status                text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- 5. Monthly Closing Periods (Fechamentos mensais travados)
CREATE TABLE IF NOT EXISTS public.monthly_closing_periods (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  year            int NOT NULL,
  month           int NOT NULL CHECK (month BETWEEN 1 AND 12),
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'agent_review', 'admin_review', 'closed', 'reopened')),
  opened_at       timestamptz NOT NULL DEFAULT now(),
  closed_at       timestamptz,
  closed_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_id, year, month)
);

-- 6. Financial Ledger Entries (Razão Imutável Contábil)
CREATE TABLE IF NOT EXISTS public.financial_ledger_entries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id      uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  account_code   text NOT NULL,
  debit_amount   numeric(14,2) NOT NULL DEFAULT 0.00,
  credit_amount  numeric(14,2) NOT NULL DEFAULT 0.00,
  entry_date     timestamptz NOT NULL DEFAULT now(),
  description    text NOT NULL,
  source_event   text NOT NULL,
  source_id      uuid NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS ENABLEMENT ──────────────────────────────────────────

ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_commission_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_commission_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_closing_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger_entries ENABLE ROW LEVEL SECURITY;

-- ─── RLS POLICIES ────────────────────────────────────────────

-- financial_categories
CREATE POLICY "categories_access" ON public.financial_categories
  FOR ALL USING (public.is_agency_member(auth.uid(), agency_id));

-- seller_commission_plans
CREATE POLICY "comm_plans_access" ON public.seller_commission_plans
  FOR ALL USING (public.is_agency_member(auth.uid(), agency_id));

-- seller_commission_tiers
CREATE POLICY "comm_tiers_access" ON public.seller_commission_tiers
  FOR ALL USING (
    plan_id IN (
      SELECT id FROM public.seller_commission_plans WHERE public.is_agency_member(auth.uid(), agency_id)
    )
  );

-- seller_adjustments
CREATE POLICY "adjustments_access" ON public.seller_adjustments
  FOR ALL USING (public.is_agency_member(auth.uid(), agency_id));

-- monthly_closing_periods
CREATE POLICY "closing_periods_access" ON public.monthly_closing_periods
  FOR ALL USING (public.is_agency_member(auth.uid(), agency_id));

-- financial_ledger_entries (Audit / Read-only for agents, manage for admin)
CREATE POLICY "ledger_entries_access" ON public.financial_ledger_entries
  FOR ALL USING (public.is_agency_member(auth.uid(), agency_id));

-- ─── TRIGGERS FOR UPDATED_AT ────────────────────────────────

CREATE TRIGGER trg_financial_categories_updated_at BEFORE UPDATE ON public.financial_categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_seller_commission_plans_updated_at BEFORE UPDATE ON public.seller_commission_plans FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_seller_adjustments_updated_at BEFORE UPDATE ON public.seller_adjustments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_monthly_closing_periods_updated_at BEFORE UPDATE ON public.monthly_closing_periods FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── INDEXES FOR PERFORMANCE ───────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ledger_entries_agency_date ON public.financial_ledger_entries(agency_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_source ON public.financial_ledger_entries(source_event, source_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_seller_period ON public.seller_adjustments(seller_id, effective_period);
CREATE INDEX IF NOT EXISTS idx_closing_periods_agency_ym ON public.monthly_closing_periods(agency_id, year, month);

-- ─── GRANTS ──────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_commission_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_commission_tiers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_adjustments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_closing_periods TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_ledger_entries TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
