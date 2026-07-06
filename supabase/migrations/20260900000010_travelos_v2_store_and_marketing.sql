-- ==============================================================================================
-- FASE 2: TRAVELOS V2 - LOJA, VERSIONAMENTO E MARKETING
-- ==============================================================================================

-- 1. Campos de Loja (Vitrine Pública) em group_tours e proposals
ALTER TABLE public.group_tours
ADD COLUMN IF NOT EXISTS visible_in_store BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS store_price DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS store_cover TEXT DEFAULT NULL;

ALTER TABLE public.proposals
ADD COLUMN IF NOT EXISTS visible_in_store BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS store_price DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS store_cover TEXT DEFAULT NULL;

-- 2. Tabela de Versionamento do Portal (portal_page_versions)
-- A tabela já existe, vamos apenas adicionar as colunas necessárias para o V2.
ALTER TABLE public.portal_page_versions
ADD COLUMN IF NOT EXISTS version_number INTEGER,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false;

-- Preencher version_number temporário para registros existentes (se houver)
UPDATE public.portal_page_versions SET version_number = 1 WHERE version_number IS NULL;

-- Criar constraint unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_page_versions_unique ON public.portal_page_versions (page_id, version_number);

-- Garantir que as policies RLS estejam ativas
ALTER TABLE public.portal_page_versions ENABLE ROW LEVEL SECURITY;

-- 3. Campos de Marketing / Pixels em agencies
ALTER TABLE public.agencies
ADD COLUMN IF NOT EXISTS fb_pixel_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS capi_token TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gtm_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ga4_id TEXT DEFAULT NULL;

-- ==============================================================================================
-- Fim da Migration
-- ==============================================================================================
