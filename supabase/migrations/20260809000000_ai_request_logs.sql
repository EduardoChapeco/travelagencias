-- ============================================================================
-- Migration: 20260809000000_ai_request_logs.sql
-- Objetivo: Criar a tabela ai_request_logs para observabilidade da IA,
--           desativar OpenAI/Anthropic, e homologar modelos gratuitos no OpenRouter.
-- ============================================================================

-- 1. Desativar provedor OpenAI na tabela ai_providers
UPDATE public.ai_providers
SET status = 'disabled'
WHERE code IN ('openai');

-- 2. Remover chaves e modelos associados a provedores/modelos restritos
UPDATE public.ai_models
SET status = 'disabled'
WHERE model_code IN ('gpt-4o-mini', 'gpt-4-turbo-preview', 'dall-e-3', 'anthropic/claude-3-haiku');

-- 3. Homologar modelos gratuitos permitidos no OpenRouter
INSERT INTO public.ai_models (provider_id, model_code, modalities, supports_json_schema, status)
SELECT id, 'google/gemma-3-27b-it:free', ARRAY['text'], true, 'active'
  FROM public.ai_providers WHERE code = 'openrouter'
ON CONFLICT (model_code) DO UPDATE
SET status = 'active';

INSERT INTO public.ai_models (provider_id, model_code, modalities, supports_json_schema, status)
SELECT id, 'meta-llama/llama-3-8b-instruct:free', ARRAY['text'], false, 'active'
  FROM public.ai_providers WHERE code = 'openrouter'
ON CONFLICT (model_code) DO UPDATE
SET status = 'active';

INSERT INTO public.ai_models (provider_id, model_code, modalities, supports_json_schema, status)
SELECT id, 'qwen/qwen-2-7b-instruct:free', ARRAY['text'], true, 'active'
  FROM public.ai_providers WHERE code = 'openrouter'
ON CONFLICT (model_code) DO UPDATE
SET status = 'active';

-- 4. Criar tabela de observabilidade de solicitações de IA
CREATE TABLE IF NOT EXISTS public.ai_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  module text NOT NULL,
  capability text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  key_fingerprint text,
  attempt int NOT NULL DEFAULT 1,
  fallback_used boolean NOT NULL DEFAULT false,
  latency_ms int NOT NULL,
  input_tokens int,
  output_tokens int,
  estimated_cost numeric(10,6),
  success boolean NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Habilitar RLS na tabela de logs de requisições de IA
ALTER TABLE public.ai_request_logs ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de RLS para leitura segura (Somente super_admin ou membros da própria agência)
DROP POLICY IF EXISTS request_logs_read ON public.ai_request_logs;
CREATE POLICY request_logs_read ON public.ai_request_logs
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR (agency_id IS NOT NULL AND public.is_agency_member(auth.uid(), agency_id))
  );

-- Permitir inserção pela aplicação (usuários autenticados ou service_role)
DROP POLICY IF EXISTS request_logs_insert ON public.ai_request_logs;
CREATE POLICY request_logs_insert ON public.ai_request_logs
  FOR INSERT TO authenticated WITH CHECK (true);
