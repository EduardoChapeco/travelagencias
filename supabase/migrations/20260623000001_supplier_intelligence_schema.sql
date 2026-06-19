-- ============================================================
-- Migration: 20260623000001_supplier_intelligence_schema.sql
-- Fase 1: Supplier Intelligence — Banco Global de Fornecedores
-- ============================================================

-- 1. Enriquecer tabela suppliers com campos de inteligência operacional
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS country        text,
  ADD COLUMN IF NOT EXISTS state          text,
  ADD COLUMN IF NOT EXISTS city           text,
  ADD COLUMN IF NOT EXISTS address        text,
  ADD COLUMN IF NOT EXISTS zip            text,
  ADD COLUMN IF NOT EXISTS instagram      text,
  ADD COLUMN IF NOT EXISTS whatsapp       text,
  ADD COLUMN IF NOT EXISTS sla_hours      int NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS payment_terms  text,
  ADD COLUMN IF NOT EXISTS contract_url   text,
  ADD COLUMN IF NOT EXISTS logo_url       text,
  ADD COLUMN IF NOT EXISTS cover_url      text,
  ADD COLUMN IF NOT EXISTS rating         numeric(3,2),
  ADD COLUMN IF NOT EXISTS tags           text[],
  ADD COLUMN IF NOT EXISTS metadata       jsonb NOT NULL DEFAULT '{}';

-- website já pode existir, só garantir
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS website text;

-- ============================================================
-- 2. Contatos múltiplos por fornecedor
-- ============================================================
CREATE TABLE IF NOT EXISTS public.supplier_contacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  agency_id   uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  role        text, -- reservas, financeiro, emergencia, comercial, etc.
  email       text,
  phone       text,
  whatsapp    text,
  is_primary  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supplier_contacts_supplier_idx ON public.supplier_contacts(supplier_id);
CREATE INDEX IF NOT EXISTS supplier_contacts_agency_idx ON public.supplier_contacts(agency_id);

ALTER TABLE public.supplier_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency members select supplier_contacts" ON public.supplier_contacts;
CREATE POLICY "agency members select supplier_contacts" ON public.supplier_contacts
  FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "agency members insert supplier_contacts" ON public.supplier_contacts;
CREATE POLICY "agency members insert supplier_contacts" ON public.supplier_contacts
  FOR INSERT TO authenticated WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "agency members update supplier_contacts" ON public.supplier_contacts;
CREATE POLICY "agency members update supplier_contacts" ON public.supplier_contacts
  FOR UPDATE TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "agency members delete supplier_contacts" ON public.supplier_contacts;
CREATE POLICY "agency members delete supplier_contacts" ON public.supplier_contacts
  FOR DELETE TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_contacts TO authenticated;
GRANT ALL ON public.supplier_contacts TO service_role;

-- ============================================================
-- 3. Catálogo de produtos do fornecedor (hotéis, tours, transfers, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.supplier_products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id  uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  agency_id    uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name         text NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('hotel','room_type','tour','transfer','insurance','ticket','cruise','other')),
  destination  text,
  country      text,
  city         text,
  description  text,
  price_from   numeric(12,2),
  currency     text NOT NULL DEFAULT 'BRL',
  duration_days int,
  capacity     int,
  images       text[],
  metadata     jsonb NOT NULL DEFAULT '{}',
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supplier_products_supplier_idx ON public.supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS supplier_products_agency_idx ON public.supplier_products(agency_id);
CREATE INDEX IF NOT EXISTS supplier_products_kind_idx ON public.supplier_products(kind);

ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency members select supplier_products" ON public.supplier_products;
CREATE POLICY "agency members select supplier_products" ON public.supplier_products
  FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "agency members insert supplier_products" ON public.supplier_products;
CREATE POLICY "agency members insert supplier_products" ON public.supplier_products
  FOR INSERT TO authenticated WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "agency members update supplier_products" ON public.supplier_products;
CREATE POLICY "agency members update supplier_products" ON public.supplier_products
  FOR UPDATE TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "agency members delete supplier_products" ON public.supplier_products;
CREATE POLICY "agency members delete supplier_products" ON public.supplier_products
  FOR DELETE TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_products TO authenticated;
GRANT ALL ON public.supplier_products TO service_role;

CREATE OR REPLACE TRIGGER supplier_products_touch
  BEFORE UPDATE ON public.supplier_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. Arquivos e documentos do fornecedor (tarifários, contratos, políticas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.supplier_files (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  agency_id   uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  kind        text CHECK (kind IN ('contract','rate_table','policy','certification','ocr_extracted','other')),
  file_url    text NOT NULL,
  file_path   text, -- caminho no storage
  expires_at  date,
  ocr_data    jsonb, -- dados extraídos por IA (aguardando revisão)
  ocr_reviewed boolean NOT NULL DEFAULT false,
  ocr_reviewed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supplier_files_supplier_idx ON public.supplier_files(supplier_id);
CREATE INDEX IF NOT EXISTS supplier_files_agency_idx ON public.supplier_files(agency_id);

ALTER TABLE public.supplier_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency members select supplier_files" ON public.supplier_files;
CREATE POLICY "agency members select supplier_files" ON public.supplier_files
  FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "agency members insert supplier_files" ON public.supplier_files;
CREATE POLICY "agency members insert supplier_files" ON public.supplier_files
  FOR INSERT TO authenticated WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "agency members update supplier_files" ON public.supplier_files;
CREATE POLICY "agency members update supplier_files" ON public.supplier_files
  FOR UPDATE TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "agency members delete supplier_files" ON public.supplier_files;
CREATE POLICY "agency members delete supplier_files" ON public.supplier_files
  FOR DELETE TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_files TO authenticated;
GRANT ALL ON public.supplier_files TO service_role;

-- ============================================================
-- 5. Avaliações internas de performance do fornecedor
-- ============================================================
CREATE TABLE IF NOT EXISTS public.supplier_reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  agency_id   uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  trip_id     uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rating      int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text,
  tags        text[],
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supplier_reviews_supplier_idx ON public.supplier_reviews(supplier_id);
CREATE INDEX IF NOT EXISTS supplier_reviews_agency_idx ON public.supplier_reviews(agency_id);

ALTER TABLE public.supplier_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency members select supplier_reviews" ON public.supplier_reviews;
CREATE POLICY "agency members select supplier_reviews" ON public.supplier_reviews
  FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "agency members insert supplier_reviews" ON public.supplier_reviews;
CREATE POLICY "agency members insert supplier_reviews" ON public.supplier_reviews
  FOR INSERT TO authenticated WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "agency members update supplier_reviews" ON public.supplier_reviews;
CREATE POLICY "agency members update supplier_reviews" ON public.supplier_reviews
  FOR UPDATE TO authenticated USING (public.is_agency_member(auth.uid(), agency_id) AND user_id = auth.uid());

DROP POLICY IF EXISTS "agency members delete supplier_reviews" ON public.supplier_reviews;
CREATE POLICY "agency members delete supplier_reviews" ON public.supplier_reviews
  FOR DELETE TO authenticated USING (public.is_agency_member(auth.uid(), agency_id) AND user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_reviews TO authenticated;
GRANT ALL ON public.supplier_reviews TO service_role;

-- ============================================================
-- 6. Trigger para atualizar rating médio no supplier
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_supplier_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.suppliers
  SET rating = (
    SELECT ROUND(AVG(rating)::numeric, 2)
    FROM public.supplier_reviews
    WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id)
  )
  WHERE id = COALESCE(NEW.supplier_id, OLD.supplier_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS supplier_rating_update_trig ON public.supplier_reviews;
CREATE TRIGGER supplier_rating_update_trig
  AFTER INSERT OR UPDATE OR DELETE ON public.supplier_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_supplier_rating();

-- ============================================================
-- 7. Bucket storage para arquivos de fornecedores
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-files', 'supplier-files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Agency members manage supplier files" ON storage.objects;
CREATE POLICY "Agency members manage supplier files"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'supplier-files'
  AND public.is_agency_member(auth.uid(), (storage.foldername(name))[1]::uuid)
)
WITH CHECK (
  bucket_id = 'supplier-files'
  AND public.is_agency_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);
