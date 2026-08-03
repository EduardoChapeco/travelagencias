-- =============================================================================
-- MICROFASE F-002: RPC update_client_profile_rpc — Fix IDOR em clients
--
-- PROBLEMA: updateClientProfile() em src/services/clients.ts fazia:
--   supabase.from("clients").update(patch).eq("id", clientId)
-- Sem verificação de agency_id no filtro. A proteção dependia 100% do RLS.
-- Se houver qualquer falha de policy (e.g. nova tabela sem RLS, policy permissiva),
-- qualquer agente pode atualizar cliente de outra agência.
--
-- SOLUÇÃO: RPC SECURITY DEFINER que:
--   1. Autentica o chamador via auth.uid()
--   2. Resolve o tenant server-side (sem confiar no client_id enviado)
--   3. Verifica membership na agência ANTES de atualizar
--   4. Filtra sempre por agency_id + id (dupla chave)
--   5. Bloqueia alteração de campos sistêmicos (agency_id, deleted_at)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_client_profile_rpc(
  p_client_id  uuid,
  p_patch      jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id  uuid;
  v_agency_id  uuid;
  v_safe_patch jsonb;
BEGIN
  -- 1. Resolve caller from JWT
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  -- 2. Resolve the client's actual agency_id from the database (never from client input)
  SELECT agency_id INTO v_agency_id
  FROM public.clients
  WHERE id = p_client_id
    AND deleted_at IS NULL;

  IF v_agency_id IS NULL THEN
    -- Do not reveal if client exists in another agency (IDOR mitigation)
    RAISE EXCEPTION 'Client not found: %', p_client_id;
  END IF;

  -- 3. Verify caller is a member of this agency
  IF NOT public.is_agency_member(v_caller_id, v_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized: caller is not a member of agency %', v_agency_id;
  END IF;

  -- 4. Build safe patch — remove immutable/systemic fields from user-supplied patch
  v_safe_patch := p_patch
    - 'id'
    - 'agency_id'
    - 'deleted_at'
    - 'created_at';

  -- 5. Apply the update with double key (id + agency_id) for defense-in-depth
  UPDATE public.clients
  SET
    full_name        = COALESCE((v_safe_patch->>'full_name'),        full_name),
    email            = COALESCE((v_safe_patch->>'email'),            email),
    phone            = COALESCE((v_safe_patch->>'phone'),            phone),
    document         = COALESCE((v_safe_patch->>'document'),         document),
    cpf              = COALESCE((v_safe_patch->>'cpf'),              cpf),
    rg               = COALESCE((v_safe_patch->>'rg'),               rg),
    passport_number  = COALESCE((v_safe_patch->>'passport_number'),  passport_number),
    passport_expiry  = COALESCE((v_safe_patch->>'passport_expiry'),  passport_expiry),
    birth_date       = COALESCE((v_safe_patch->>'birth_date'),        birth_date),
    notes            = COALESCE((v_safe_patch->>'notes'),             notes),
    kind             = COALESCE((v_safe_patch->>'kind')::text,        kind::text)::varchar,
    tags             = COALESCE(
                        CASE WHEN v_safe_patch ? 'tags'
                          THEN ARRAY(SELECT jsonb_array_elements_text(v_safe_patch->'tags'))
                          ELSE NULL
                        END,
                        tags
                      ),
    preferences      = COALESCE(
                        CASE WHEN v_safe_patch ? 'preferences'
                          THEN v_safe_patch->'preferences'
                          ELSE NULL
                        END,
                        preferences
                      )
  WHERE id = p_client_id
    AND agency_id = v_agency_id;  -- double-filter for defense-in-depth

  RETURN jsonb_build_object(
    'success', true,
    'client_id', p_client_id,
    'agency_id', v_agency_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'update_client_profile_rpc failed: %', SQLERRM;
END;
$$;

-- RPC for archive_client (soft-delete) — also IDOR-protected
CREATE OR REPLACE FUNCTION public.archive_client_rpc(
  p_client_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_agency_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  -- Resolve actual agency from DB
  SELECT agency_id INTO v_agency_id
  FROM public.clients
  WHERE id = p_client_id AND deleted_at IS NULL;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Client not found: %', p_client_id;
  END IF;

  -- Only agency_admin can archive clients
  IF NOT public.has_role(v_caller_id, 'agency_admin', v_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized: only agency admins can archive clients';
  END IF;

  UPDATE public.clients
  SET deleted_at = NOW()
  WHERE id = p_client_id
    AND agency_id = v_agency_id;

  RETURN jsonb_build_object('success', true, 'client_id', p_client_id, 'agency_id', v_agency_id);
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'archive_client_rpc failed: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_client_profile_rpc(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_client_rpc(uuid) TO authenticated;

COMMENT ON FUNCTION public.update_client_profile_rpc IS
  'IDOR-protected client update. Resolves agency_id server-side, verifies
   membership, strips systemic fields from patch. Replaces direct
   supabase.from("clients").update() in clients.ts. Microfase F-002 — 2026-08-03';

COMMENT ON FUNCTION public.archive_client_rpc IS
  'IDOR-protected client soft-delete. Admin-only. Microfase F-002 — 2026-08-03';
