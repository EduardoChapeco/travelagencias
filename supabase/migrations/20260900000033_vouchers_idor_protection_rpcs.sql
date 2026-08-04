-- =============================================================================
-- MICROFASE 3: Vouchers IDOR Protection RPCs
-- =============================================================================

-- 1. Update Voucher (IDOR Protected)
CREATE OR REPLACE FUNCTION public.update_voucher_rpc(
  p_voucher_id uuid,
  p_patch      jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_agency_id uuid;
  v_safe_patch jsonb;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  SELECT agency_id INTO v_agency_id
  FROM public.vouchers
  WHERE id = p_voucher_id;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Voucher not found';
  END IF;

  IF NOT public.is_agency_member(v_caller_id, v_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Remove system/immutable fields
  v_safe_patch := p_patch 
    - 'id' 
    - 'agency_id' 
    - 'trip_id' 
    - 'created_at' 
    - 'deleted_at';

  UPDATE public.vouchers
  SET
    source_type        = CASE WHEN v_safe_patch ? 'source_type' THEN (v_safe_patch->>'source_type')::text ELSE source_type::text END::varchar,
    source_file_url    = CASE WHEN v_safe_patch ? 'source_file_url' THEN v_safe_patch->>'source_file_url' ELSE source_file_url END,
    destination        = CASE WHEN v_safe_patch ? 'destination' THEN v_safe_patch->>'destination' ELSE destination END,
    general_locator    = CASE WHEN v_safe_patch ? 'general_locator' THEN v_safe_patch->>'general_locator' ELSE general_locator END,
    observations       = CASE WHEN v_safe_patch ? 'observations' THEN v_safe_patch->>'observations' ELSE observations END,
    cover_image_url    = CASE WHEN v_safe_patch ? 'cover_image_url' THEN v_safe_patch->>'cover_image_url' ELSE cover_image_url END,
    template           = CASE WHEN v_safe_patch ? 'template' THEN (v_safe_patch->>'template')::text ELSE template::text END::varchar,
    passengers         = CASE WHEN v_safe_patch ? 'passengers' THEN v_safe_patch->'passengers' ELSE passengers END,
    flights            = CASE WHEN v_safe_patch ? 'flights' THEN v_safe_patch->'flights' ELSE flights END,
    accommodation      = CASE WHEN v_safe_patch ? 'accommodation' THEN v_safe_patch->'accommodation' ELSE accommodation END,
    transfers          = CASE WHEN v_safe_patch ? 'transfers' THEN v_safe_patch->'transfers' ELSE transfers END,
    tours              = CASE WHEN v_safe_patch ? 'tours' THEN v_safe_patch->'tours' ELSE tours END,
    insurance          = CASE WHEN v_safe_patch ? 'insurance' THEN v_safe_patch->'insurance' ELSE insurance END,
    emergency_contacts = CASE WHEN v_safe_patch ? 'emergency_contacts' THEN v_safe_patch->'emergency_contacts' ELSE emergency_contacts END,
    pdf_url            = CASE WHEN v_safe_patch ? 'pdf_url' THEN v_safe_patch->>'pdf_url' ELSE pdf_url END,
    generated_at       = CASE WHEN v_safe_patch ? 'generated_at' THEN (v_safe_patch->>'generated_at')::timestamptz ELSE generated_at END
  WHERE id = p_voucher_id
    AND agency_id = v_agency_id;

  RETURN jsonb_build_object('success', true, 'voucher_id', p_voucher_id);
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'update_voucher_rpc failed: %', SQLERRM;
END;
$$;

-- 2. Archive Voucher (Soft Delete)
CREATE OR REPLACE FUNCTION public.archive_voucher_rpc(p_voucher_id uuid)
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

  SELECT agency_id INTO v_agency_id FROM public.vouchers WHERE id = p_voucher_id;
  IF v_agency_id IS NULL THEN RAISE EXCEPTION 'Voucher not found'; END IF;

  IF NOT public.is_agency_member(v_caller_id, v_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.vouchers
  SET deleted_at = NOW()
  WHERE id = p_voucher_id AND agency_id = v_agency_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_voucher_rpc(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_voucher_rpc(uuid) TO authenticated;
