
-- 1. Create agency_private for sensitive fields
CREATE TABLE IF NOT EXISTS public.agency_private (
  agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
  email text,
  phone text,
  legal_name text,
  document text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_private TO authenticated;
GRANT ALL ON public.agency_private TO service_role;

ALTER TABLE public.agency_private ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency members read private"
  ON public.agency_private FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "agency members insert private"
  ON public.agency_private FOR INSERT TO authenticated
  WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "agency members update private"
  ON public.agency_private FOR UPDATE TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "agency admins delete private"
  ON public.agency_private FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'agency_admin', agency_id));

CREATE TRIGGER trg_agency_private_updated_at
  BEFORE UPDATE ON public.agency_private
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Migrate existing data
INSERT INTO public.agency_private (agency_id, email, phone, legal_name, document)
SELECT id, email, phone, legal_name, document FROM public.agencies
ON CONFLICT (agency_id) DO NOTHING;

-- 3. Drop sensitive columns from public agencies
ALTER TABLE public.agencies
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS legal_name,
  DROP COLUMN IF EXISTS document;

-- 4. Lock down SECURITY DEFINER helpers from being directly callable by clients
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_agency_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_agency_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.agency_id_by_slug(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.contract_template_clauses() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_agency() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.contracts_immutable_after_signed() FROM PUBLIC, anon, authenticated;

-- Keep public-facing definer RPCs callable
GRANT EXECUTE ON FUNCTION public.accept_agency_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_contract(text) TO anon, authenticated;
