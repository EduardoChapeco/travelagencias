
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'percent' CHECK (kind IN ('percent','fixed')),
  value numeric(12,2) NOT NULL DEFAULT 0,
  min_purchase numeric(12,2),
  max_discount numeric(12,2),
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  per_client_limit integer,
  scope text NOT NULL DEFAULT 'all' CHECK (scope IN ('all','group_tour','proposal','trip')),
  scope_id uuid,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons member read" ON public.coupons FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id) OR is_active = true);
CREATE POLICY "coupons agent insert" ON public.coupons FOR INSERT TO authenticated
  WITH CHECK (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "coupons agent update" ON public.coupons FOR UPDATE TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "coupons admin delete" ON public.coupons FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'agency_admin', agency_id));

CREATE TRIGGER trg_coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


CREATE TABLE IF NOT EXISTS public.gift_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  code text NOT NULL,
  initial_value numeric(12,2) NOT NULL DEFAULT 0,
  balance numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  recipient_name text,
  recipient_email text,
  message text,
  purchased_by_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  redeemed_by_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','redeemed','expired','cancelled')),
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gift_cards TO authenticated;
GRANT ALL ON public.gift_cards TO service_role;
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gc member read" ON public.gift_cards FOR SELECT TO authenticated
  USING (
    public.is_agency_member(auth.uid(), agency_id)
    OR EXISTS (SELECT 1 FROM public.clients c WHERE c.user_id = auth.uid()
               AND (c.id = gift_cards.purchased_by_client_id OR c.id = gift_cards.redeemed_by_client_id))
  );
CREATE POLICY "gc agent insert" ON public.gift_cards FOR INSERT TO authenticated
  WITH CHECK (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "gc agent update" ON public.gift_cards FOR UPDATE TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "gc admin delete" ON public.gift_cards FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'agency_admin', agency_id));

CREATE TRIGGER trg_gift_cards_updated_at BEFORE UPDATE ON public.gift_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX coupons_agency_active_idx ON public.coupons (agency_id, is_active);
CREATE INDEX gift_cards_agency_status_idx ON public.gift_cards (agency_id, status);
