-- Migration: P1 Security Fixes
-- 1. RLS para coupons (garantia server-side do isolamento por agência)
-- 2. RLS para gift_cards

-- ============================================================
-- 1. COUPONS — RLS
-- ============================================================
ALTER TABLE IF EXISTS public.coupons ENABLE ROW LEVEL SECURITY;

-- Agência vê seus próprios cupons
DROP POLICY IF EXISTS "coupons_agency_select" ON public.coupons;
CREATE POLICY "coupons_agency_select" ON public.coupons
  FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "coupons_agency_insert" ON public.coupons;
CREATE POLICY "coupons_agency_insert" ON public.coupons
  FOR INSERT TO authenticated
  WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "coupons_agency_update" ON public.coupons;
CREATE POLICY "coupons_agency_update" ON public.coupons
  FOR UPDATE TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "coupons_agency_delete" ON public.coupons;
CREATE POLICY "coupons_agency_delete" ON public.coupons
  FOR DELETE TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id));

-- Clientes autenticados veem APENAS os cupons ativos da agência à qual pertencem
DROP POLICY IF EXISTS "coupons_client_select" ON public.coupons;
CREATE POLICY "coupons_client_select" ON public.coupons
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.user_id = auth.uid()
        AND c.agency_id = coupons.agency_id
        AND c.deleted_at IS NULL
    )
  );

-- ============================================================
-- 2. GIFT_CARDS — RLS (mesma lógica)
-- ============================================================
ALTER TABLE IF EXISTS public.gift_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gift_cards_agency_select" ON public.gift_cards;
CREATE POLICY "gift_cards_agency_select" ON public.gift_cards
  FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "gift_cards_agency_insert" ON public.gift_cards;
CREATE POLICY "gift_cards_agency_insert" ON public.gift_cards
  FOR INSERT TO authenticated
  WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "gift_cards_agency_update" ON public.gift_cards;
CREATE POLICY "gift_cards_agency_update" ON public.gift_cards
  FOR UPDATE TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id));

-- Clientes veem apenas gift cards de sua agência
DROP POLICY IF EXISTS "gift_cards_client_select" ON public.gift_cards;
CREATE POLICY "gift_cards_client_select" ON public.gift_cards
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.user_id = auth.uid()
        AND c.agency_id = gift_cards.agency_id
        AND c.deleted_at IS NULL
    )
  );
