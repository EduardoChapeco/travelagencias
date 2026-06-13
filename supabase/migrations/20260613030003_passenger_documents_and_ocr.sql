-- Migration: 20260613030003_passenger_documents_and_ocr.sql
-- FASE 7: Gestão de Documentos de Passageiro & OCR

-- 1. Adicionar coluna metadata à tabela clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS metadata jsonb not null default '{}'::jsonb;

-- 2. Criar a tabela passenger_documents
CREATE TABLE IF NOT EXISTS public.passenger_documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  passenger_id uuid not null references public.trip_passengers(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  document_type text not null check (document_type in ('passport', 'visa', 'ticket', 'other')),
  file_path text not null, -- Caminho do arquivo no storage
  extracted_metadata jsonb not null default '{}'::jsonb,
  expiration_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexar para busca rápida
CREATE INDEX IF NOT EXISTS passenger_documents_trip_idx ON public.passenger_documents(trip_id);
CREATE INDEX IF NOT EXISTS passenger_documents_passenger_idx ON public.passenger_documents(passenger_id);
CREATE INDEX IF NOT EXISTS passenger_documents_agency_idx ON public.passenger_documents(agency_id);

-- 3. Habilitar RLS e criar políticas
ALTER TABLE public.passenger_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency members read passenger_documents" ON public.passenger_documents;
CREATE POLICY "agency members read passenger_documents" ON public.passenger_documents
  FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "agency members create passenger_documents" ON public.passenger_documents;
CREATE POLICY "agency members create passenger_documents" ON public.passenger_documents
  FOR INSERT TO authenticated WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "agency members update passenger_documents" ON public.passenger_documents;
CREATE POLICY "agency members update passenger_documents" ON public.passenger_documents
  FOR UPDATE TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "agency members delete passenger_documents" ON public.passenger_documents;
CREATE POLICY "agency members delete passenger_documents" ON public.passenger_documents
  FOR DELETE TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

-- Trigger de updated_at
CREATE TRIGGER passenger_documents_touch
  BEFORE UPDATE ON public.passenger_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.passenger_documents TO authenticated;
GRANT ALL ON public.passenger_documents TO service_role;

-- 4. Função e trigger para propagar os metadados extraídos para o cliente
CREATE OR REPLACE FUNCTION public.propagate_passenger_document_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _client_id uuid;
BEGIN
  -- Encontrar o client_id associado ao passenger_id
  SELECT client_id INTO _client_id
  FROM public.trip_passengers
  WHERE id = NEW.passenger_id;

  IF _client_id IS NOT NULL THEN
    -- Atualizar o metadata do client mesclando as informações novas
    UPDATE public.clients
    SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'doc_' || NEW.document_type, NEW.extracted_metadata,
      'last_document_update', now()
    )
    WHERE id = _client_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS propagate_passenger_document_metadata_trig ON public.passenger_documents;
CREATE TRIGGER propagate_passenger_document_metadata_trig
  AFTER INSERT OR UPDATE ON public.passenger_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.propagate_passenger_document_metadata();

-- 5. Criar bucket no storage para os documentos dos passageiros
INSERT INTO storage.buckets (id, name, public) 
VALUES ('passenger-documents', 'passenger-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS para o bucket
DROP POLICY IF EXISTS "Agency members manage passenger documents in storage" ON storage.objects;
CREATE POLICY "Agency members manage passenger documents in storage"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'passenger-documents'
  AND (storage.foldername(name))[1] = (auth.jwt()->>'agency_id')
)
WITH CHECK (
  bucket_id = 'passenger-documents'
  AND (storage.foldername(name))[1] = (auth.jwt()->>'agency_id')
);
