-- Otimização de Segurança: Restringe a geração de token de login do cliente
-- Apenas permite se o executor for membro da agência dona do registro do cliente ou o próprio cliente.
CREATE OR REPLACE FUNCTION public.generate_client_login_token(p_client_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_client_exists boolean;
BEGIN
  -- Verifica autorização: o executor (auth.uid()) deve ser o próprio cliente (user_id) 
  -- ou membro da agência associada ao cliente (is_agency_member)
  SELECT EXISTS (
    SELECT 1 
    FROM public.clients c
    WHERE c.id = p_client_id
      AND (
        c.user_id = auth.uid()
        OR public.is_agency_member(auth.uid(), c.agency_id)
      )
  ) INTO v_client_exists;

  IF NOT v_client_exists THEN
    RAISE EXCEPTION 'Acesso negado: você não tem permissão para gerar token deste cliente';
  END IF;

  v_token := replace(gen_random_uuid()::text, '-', '');
  
  UPDATE public.clients
     SET login_token = v_token,
         login_token_expires_at = now() + interval '30 days' -- Token válido por 30 dias
   WHERE id = p_client_id;
   
  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_client_login_token(uuid) TO authenticated;
