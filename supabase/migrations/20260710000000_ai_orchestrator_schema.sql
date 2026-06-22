-- Migration: 20260710000000_ai_orchestrator_schema.sql
-- Description: Unificação de IA/OCR - Tabelas de Provedores, Modelos, Credenciais e Fila de Jobs

-- 1. Tabela de Provedores de IA
CREATE TABLE IF NOT EXISTS public.ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  base_url text,
  auth_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS e criar políticas
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY providers_read ON public.ai_providers 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY providers_write ON public.ai_providers 
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- 2. Tabela de Modelos de IA
CREATE TABLE IF NOT EXISTS public.ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  model_code text NOT NULL UNIQUE,
  modalities text[] NOT NULL DEFAULT '{}',
  context_limit int,
  output_limit int,
  supports_json_schema boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS e criar políticas
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY models_read ON public.ai_models 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY models_write ON public.ai_models 
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- 3. Tabela de Credenciais de API
CREATE TABLE IF NOT EXISTS public.ai_api_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  secret_reference text NOT NULL,
  fingerprint text NOT NULL UNIQUE,
  masked_hint text NOT NULL,
  status text NOT NULL DEFAULT 'healthy',
  priority int NOT NULL DEFAULT 0,
  daily_limit int DEFAULT 1000,
  monthly_limit int DEFAULT 20000,
  cooldown_until timestamptz,
  last_used_at timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error_code text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS e criar políticas
ALTER TABLE public.ai_api_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY api_credentials_select ON public.ai_api_credentials
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role) 
    OR (agency_id IS NOT NULL AND public.has_role(auth.uid(), 'agency_admin', agency_id))
  );

CREATE POLICY api_credentials_insert ON public.ai_api_credentials
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::public.app_role) 
    OR (agency_id IS NOT NULL AND public.has_role(auth.uid(), 'agency_admin', agency_id))
  );

CREATE POLICY api_credentials_update ON public.ai_api_credentials
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role) 
    OR (agency_id IS NOT NULL AND public.has_role(auth.uid(), 'agency_admin', agency_id))
  );

CREATE POLICY api_credentials_delete ON public.ai_api_credentials
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role) 
    OR (agency_id IS NOT NULL AND public.has_role(auth.uid(), 'agency_admin', agency_id))
  );

CREATE TRIGGER ai_api_credentials_touch BEFORE UPDATE ON public.ai_api_credentials 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Tabela de Jobs de IA (Fila Assíncrona)
CREATE TABLE IF NOT EXISTS public.ai_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  feature text NOT NULL,
  input_reference text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  priority int NOT NULL DEFAULT 10,
  idempotency_key text UNIQUE,
  requested_by uuid REFERENCES auth.users(id),
  result_payload jsonb,
  error_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Habilitar RLS e criar políticas
ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY jobs_all ON public.ai_jobs
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role) 
    OR public.is_agency_member(auth.uid(), agency_id)
  );

-- 5. Tabela de Tentativas de Execução do Job
CREATE TABLE IF NOT EXISTS public.ai_job_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.ai_jobs(id) ON DELETE CASCADE,
  attempt int NOT NULL,
  provider_id uuid REFERENCES public.ai_providers(id),
  model_id uuid REFERENCES public.ai_models(id),
  credential_id uuid REFERENCES public.ai_api_credentials(id),
  latency_ms int,
  input_tokens int,
  output_tokens int,
  estimated_cost numeric(10,6),
  http_status int,
  error_message text,
  success boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS e criar políticas
ALTER TABLE public.ai_job_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_attempts_all ON public.ai_job_attempts
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.ai_jobs j 
      WHERE j.id = job_id 
        AND public.is_agency_member(auth.uid(), j.agency_id)
    )
  );

-- 6. RPC pick_active_api_key (Orquestrador de Chaves Seguro e Compatível)
CREATE OR REPLACE FUNCTION public.pick_active_api_key(_provider text, _agency_id uuid)
RETURNS TABLE(id uuid, key_value text, scope text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_provider_id uuid;
BEGIN
  -- Resolver provedor ativo por código
  SELECT p.id INTO v_provider_id 
  FROM public.ai_providers p 
  WHERE p.code = _provider AND p.status = 'active';
  
  IF v_provider_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  (
    SELECT c.id, c.secret_reference AS key_value, 'agency'::text AS scope
    FROM public.ai_api_credentials c
    WHERE c.provider_id = v_provider_id
      AND c.agency_id = _agency_id
      AND c.status = 'healthy'
      AND (c.cooldown_until IS NULL OR c.cooldown_until < now())
    ORDER BY c.priority ASC, c.last_used_at ASC NULLS FIRST
    LIMIT 1
  )
  UNION ALL
  (
    SELECT c.id, c.secret_reference AS key_value, 'global'::text AS scope
    FROM public.ai_api_credentials c
    WHERE c.provider_id = v_provider_id
      AND c.agency_id IS NULL
      AND c.status = 'healthy'
      AND (c.cooldown_until IS NULL OR c.cooldown_until < now())
    ORDER BY c.priority ASC, c.last_used_at ASC NULLS FIRST
    LIMIT 1
  )
  LIMIT 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pick_active_api_key(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pick_active_api_key(text, uuid) TO service_role;

-- 7. Seeds de Provedores Homologados
INSERT INTO public.ai_providers (code, name, status) VALUES
  ('gemini', 'Google Gemini', 'active'),
  ('openai', 'OpenAI', 'active'),
  ('groq', 'GroqCloud', 'active'),
  ('openrouter', 'OpenRouter', 'active'),
  ('firecrawl', 'Firecrawl Web Scraper', 'active'),
  ('stell', 'Stell.dev', 'active')
ON CONFLICT (code) DO NOTHING;

-- 8. Seeds de Modelos Homologados e Capacidades
INSERT INTO public.ai_models (provider_id, model_code, modalities, supports_json_schema)
SELECT id, 'gemini-2.5-flash', ARRAY['text', 'vision', 'pdf'], true 
  FROM public.ai_providers WHERE code = 'gemini'
ON CONFLICT (model_code) DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_code, modalities, supports_json_schema)
SELECT id, 'gpt-4o-mini', ARRAY['text', 'vision'], true 
  FROM public.ai_providers WHERE code = 'openai'
ON CONFLICT (model_code) DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_code, modalities, supports_json_schema)
SELECT id, 'gpt-4-turbo-preview', ARRAY['text'], true 
  FROM public.ai_providers WHERE code = 'openai'
ON CONFLICT (model_code) DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_code, modalities, supports_json_schema)
SELECT id, 'dall-e-3', ARRAY['image'], false 
  FROM public.ai_providers WHERE code = 'openai'
ON CONFLICT (model_code) DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_code, modalities, supports_json_schema)
SELECT id, 'llama3-70b-8192', ARRAY['text'], false 
  FROM public.ai_providers WHERE code = 'groq'
ON CONFLICT (model_code) DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_code, modalities, supports_json_schema)
SELECT id, 'llama-3.2-11b-vision-preview', ARRAY['text', 'vision'], false 
  FROM public.ai_providers WHERE code = 'groq'
ON CONFLICT (model_code) DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_code, modalities, supports_json_schema)
SELECT id, 'anthropic/claude-3-haiku', ARRAY['text'], false 
  FROM public.ai_providers WHERE code = 'openrouter'
ON CONFLICT (model_code) DO NOTHING;

INSERT INTO public.ai_models (provider_id, model_code, modalities, supports_json_schema)
SELECT id, 'stabilityai/stable-diffusion-xl', ARRAY['image'], false 
  FROM public.ai_providers WHERE code = 'openrouter'
ON CONFLICT (model_code) DO NOTHING;

-- 9. Migração de dados legados existentes de api_keys
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys' AND table_schema = 'public') THEN
    INSERT INTO public.ai_api_credentials (
      agency_id,
      provider_id,
      secret_reference,
      fingerprint,
      masked_hint,
      status,
      monthly_limit,
      created_by,
      created_at,
      updated_at
    )
    SELECT 
      k.agency_id,
      p.id AS provider_id,
      k.key_value AS secret_reference,
      coalesce(
        encode(digest(k.key_value::bytea, 'sha256'), 'hex'), 
        k.id::text
      ) AS fingerprint,
      coalesce(
        substring(k.key_value from 1 for 8) || '...' || substring(k.key_value from length(k.key_value) - 4),
        'masked_key'
      ) AS masked_hint,
      CASE WHEN k.is_active THEN 'healthy'::text ELSE 'disabled'::text END AS status,
      k.monthly_limit,
      k.created_by,
      k.created_at,
      k.updated_at
    FROM public.api_keys k
    JOIN public.ai_providers p ON p.code = k.provider
    ON CONFLICT (fingerprint) DO NOTHING;
  END IF;
END $$;
