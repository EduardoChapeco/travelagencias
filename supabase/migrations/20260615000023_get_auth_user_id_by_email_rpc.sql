-- RPC auxiliar segura para obter o ID do usuário de autenticação pelo e-mail
-- Utilizada por Edge Functions para evitar limitações de paginação do listUsers
CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth
AS $$
  SELECT id FROM auth.users WHERE email = LOWER(p_email) LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_user_id_by_email(TEXT) TO service_role;
