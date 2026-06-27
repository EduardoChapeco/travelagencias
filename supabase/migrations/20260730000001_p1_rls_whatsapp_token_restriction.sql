-- ============================================================
-- P1.1 — Restrição de acesso ao secret_reference em whatsapp_connections
-- Auditoria identificou: authenticated users podem ler secret_reference
-- que é um ponteiro para o App Secret da Meta. Isso é desnecessário
-- para operadores de agência — somente a Edge Function (service_role) precisa.
-- ============================================================

-- 1. Criar uma view pública sem o campo sensível para uso do frontend
CREATE OR REPLACE VIEW public.whatsapp_connections_public AS
SELECT
  id,
  agency_id,
  waba_id,
  phone_number_id,
  display_name,
  status,
  provider,
  -- verify_token_reference: também sensível, omitido
  -- secret_reference: OMITIDO intencionalmente
  created_at,
  updated_at
FROM public.whatsapp_connections;

-- 2. Habilitar RLS na view (views herdam da tabela base no Supabase, mas
--    garantimos via security_invoker para que as políticas da tabela base se apliquem)
ALTER VIEW public.whatsapp_connections_public SET (security_invoker = true);

-- 3. Revogar SELECT direto na coluna sensível para o papel authenticated
-- Nota: Supabase não suporta REVOKE por coluna via policy, então usamos
-- column-level privileges do PostgreSQL nativo.
REVOKE SELECT (secret_reference, verify_token_reference)
  ON TABLE public.whatsapp_connections
  FROM authenticated;

-- 4. Garantir que service_role ainda tem acesso total (para Edge Functions)
GRANT SELECT ON TABLE public.whatsapp_connections TO service_role;

-- 5. O papel authenticated só pode ler via a view pública (sem secrets)
GRANT SELECT ON public.whatsapp_connections_public TO authenticated;

-- 6. Comentar as colunas sensíveis para documentação
COMMENT ON COLUMN public.whatsapp_connections.secret_reference IS
  'Referência ao App Secret da Meta. RESTRITO a service_role. Nunca expor para authenticated.';
COMMENT ON COLUMN public.whatsapp_connections.verify_token_reference IS
  'Token de verificação de webhook. RESTRITO a service_role. Nunca expor para authenticated.';
