-- =============================================================================
-- MICROFASE 3: Settings & Company Profiles IDOR Protection RPCs
-- =============================================================================

-- 1. Save Company Profile (IDOR Protected)
CREATE OR REPLACE FUNCTION public.save_company_profile_rpc(
  p_agency_id       uuid,
  p_company_payload jsonb,
  p_agency_payload  jsonb,
  p_private_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Unauthenticated'; END IF;

  -- Only agency admins can save company profile and settings
  IF NOT public.has_role(v_caller_id, 'agency_admin', p_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized: only agency admins can update settings';
  END IF;

  -- Update or insert company_profiles
  IF p_company_payload IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.company_profiles WHERE agency_id = p_agency_id) THEN
      UPDATE public.company_profiles
      SET
        trading_name       = COALESCE((p_company_payload->>'trading_name'), trading_name),
        corporate_name     = COALESCE((p_company_payload->>'corporate_name'), corporate_name),
        cnpj               = COALESCE((p_company_payload->>'cnpj'), cnpj),
        cadastur           = COALESCE((p_company_payload->>'cadastur'), cadastur),
        phone              = COALESCE((p_company_payload->>'phone'), phone),
        email              = COALESCE((p_company_payload->>'email'), email),
        website            = COALESCE((p_company_payload->>'website'), website),
        address            = COALESCE((p_company_payload->>'address'), address),
        city               = COALESCE((p_company_payload->>'city'), city),
        state              = COALESCE((p_company_payload->>'state'), state),
        zip_code           = COALESCE((p_company_payload->>'zip_code'), zip_code),
        logo_url           = CASE WHEN p_company_payload ? 'logo_url' THEN p_company_payload->>'logo_url' ELSE logo_url END,
        primary_color      = CASE WHEN p_company_payload ? 'primary_color' THEN p_company_payload->>'primary_color' ELSE primary_color END,
        updated_at         = NOW()
      WHERE agency_id = p_agency_id;
    ELSE
      INSERT INTO public.company_profiles (
        agency_id, trading_name, corporate_name, cnpj, cadastur, phone, email, website, address, city, state, zip_code, logo_url, primary_color
      ) VALUES (
        p_agency_id,
        p_company_payload->>'trading_name',
        p_company_payload->>'corporate_name',
        p_company_payload->>'cnpj',
        p_company_payload->>'cadastur',
        p_company_payload->>'phone',
        p_company_payload->>'email',
        p_company_payload->>'website',
        p_company_payload->>'address',
        p_company_payload->>'city',
        p_company_payload->>'state',
        p_company_payload->>'zip_code',
        p_company_payload->>'logo_url',
        p_company_payload->>'primary_color'
      );
    END IF;
  END IF;

  -- Update agencies table
  IF p_agency_payload IS NOT NULL THEN
    UPDATE public.agencies
    SET
      name = COALESCE((p_agency_payload->>'name'), name),
      slug = COALESCE((p_agency_payload->>'slug'), slug),
      updated_at = NOW()
    WHERE id = p_agency_id;
  END IF;

  -- Update or insert agency_private
  IF p_private_payload IS NOT NULL THEN
    INSERT INTO public.agency_private (agency_id, default_markup, default_commission, updated_at)
    VALUES (
      p_agency_id,
      COALESCE((p_private_payload->>'default_markup')::numeric, 0),
      COALESCE((p_private_payload->>'default_commission')::numeric, 0),
      NOW()
    )
    ON CONFLICT (agency_id) DO UPDATE SET
      default_markup = EXCLUDED.default_markup,
      default_commission = EXCLUDED.default_commission,
      updated_at = NOW();
  END IF;

  -- Audit log
  INSERT INTO public.audit_log (agency_id, actor_id, action, metadata)
  VALUES (
    p_agency_id,
    v_caller_id,
    'update_company_profile',
    jsonb_build_object('company', p_company_payload, 'agency', p_agency_payload)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 2. Toggle API Key (IDOR Protected)
CREATE OR REPLACE FUNCTION public.toggle_api_key_rpc(p_key_id uuid, p_status text)
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
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Unauthenticated'; END IF;

  SELECT agency_id INTO v_agency_id FROM public.ai_api_credentials WHERE id = p_key_id;
  IF v_agency_id IS NULL THEN RAISE EXCEPTION 'API Key not found'; END IF;

  IF NOT public.has_role(v_caller_id, 'agency_admin', v_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.ai_api_credentials
  SET status = p_status
  WHERE id = p_key_id AND agency_id = v_agency_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. Change Team Member Role (IDOR Protected)
CREATE OR REPLACE FUNCTION public.change_team_member_role_rpc(p_target_user_id uuid, p_new_role text)
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
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Unauthenticated'; END IF;

  -- Assuming caller is managing roles in the agency where target_user is
  -- Wait, a user could be in multiple agencies. We need the agency_id.
  -- To be absolutely safe, let's pass p_agency_id.
  -- But we must verify caller is admin of p_agency_id.
  RAISE EXCEPTION 'Use change_team_member_role_with_agency_rpc instead.';
END;
$$;

CREATE OR REPLACE FUNCTION public.change_team_member_role_with_agency_rpc(p_agency_id uuid, p_target_user_id uuid, p_new_role public.app_role)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Unauthenticated'; END IF;

  IF NOT public.has_role(v_caller_id, 'agency_admin', p_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized: only admins can change roles';
  END IF;

  UPDATE public.user_roles
  SET role = p_new_role
  WHERE agency_id = p_agency_id AND user_id = p_target_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_company_profile_rpc(uuid, jsonb, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_api_key_rpc(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_team_member_role_with_agency_rpc(uuid, uuid, public.app_role) TO authenticated;
