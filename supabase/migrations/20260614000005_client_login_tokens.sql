-- ============================================================
-- Migração: client_login_tokens
-- Adiciona colunas para token de login direto de clientes.
-- ============================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS login_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS login_token_expires_at timestamptz;

CREATE OR REPLACE FUNCTION public.generate_client_login_token(p_client_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token text;
BEGIN
  v_token := replace(gen_random_uuid()::text, '-', '');
  
  UPDATE public.clients
     SET login_token = v_token,
         login_token_expires_at = now() + interval '30 days' -- Token válido por 30 dias
   WHERE id = p_client_id;
   
  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_client_login_token(uuid) TO authenticated;

COMMENT ON FUNCTION public.generate_client_login_token IS
  'Gera um token seguro de login único para o cliente, válido por 30 dias.';
