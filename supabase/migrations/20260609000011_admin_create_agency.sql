-- TravelOS — Master Agency Creation & Invites
-- Migration: 20260609000011_admin_create_agency

-- =========================================================================
-- RPC: admin_create_agency_and_invite
-- =========================================================================
-- Permite que o Super Admin pré-cadastre uma agência e gere um token de 
-- convite seguro para o proprietário (Owner), sem disparar a trigger de 
-- atribuição ao próprio super admin.

CREATE OR REPLACE FUNCTION public.admin_create_agency_and_invite(
  _name text,
  _slug text,
  _owner_email text,
  _cnpj text DEFAULT NULL,
  _phone text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _agency_id uuid;
  _invite_token text;
BEGIN
  -- 1. Validação de segurança pesada
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: Apenas Super Admins podem provisionar agências diretamente.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.agencies WHERE slug = _slug) THEN
    RAISE EXCEPTION 'O slug "%" já está em uso por outra agência.', _slug;
  END IF;

  -- 2. Cria a agência. 
  -- Passamos created_by = NULL de propósito, para a trigger handle_new_agency 
  -- ignorar e NÃO colocar o Super Admin como agency_admin.
  INSERT INTO public.agencies (name, slug, created_by)
  VALUES (_name, _slug, NULL)
  RETURNING id INTO _agency_id;

  -- 3. Insere dados privados (CNPJ, Email, Phone)
  INSERT INTO public.agency_private (agency_id, email, document, phone)
  VALUES (_agency_id, _owner_email, _cnpj, _phone);

  -- 4. Gera o token criptográfico para o Invite PKCE-like
  _invite_token := encode(gen_random_bytes(32), 'hex');

  -- 5. Cria o convite para o Owner (cargo agency_admin)
  INSERT INTO public.agency_invites (agency_id, email, role, token, expires_at)
  VALUES (_agency_id, _owner_email, 'agency_admin', _invite_token, now() + interval '7 days');

  -- Retorna o ID e o Token para o Frontend montar a URL que será enviada
  RETURN json_build_object(
    'agency_id', _agency_id,
    'invite_token', _invite_token
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_agency_and_invite(text, text, text, text, text) TO authenticated;
