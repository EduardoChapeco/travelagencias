-- Add custom_domain to portal_settings table
ALTER TABLE public.portal_settings
  ADD COLUMN IF NOT EXISTS custom_domain text;

-- Drop existing overloads of public.submit_public_lead to avoid conflicts
DROP FUNCTION IF EXISTS public.submit_public_lead(text, text, text, text, text, date, date, integer, numeric, text, text);
DROP FUNCTION IF EXISTS public.submit_public_lead(text, text, text, text, text, date, date, int, numeric, text, text);

-- Create updated submit_public_lead function supporting tags
CREATE OR REPLACE FUNCTION public.submit_public_lead(
  _agency_slug text,
  _name text,
  _email text,
  _phone text,
  _destination text,
  _travel_start date,
  _travel_end date,
  _pax_count int,
  _estimated_value numeric,
  _source text,
  _notes text,
  _tags text[] DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agency_id uuid;
  v_stage_id uuid;
  v_lead_id uuid;
  v_final_tags text[];
BEGIN
  -- Find agency
  SELECT id INTO v_agency_id FROM public.agencies WHERE slug = _agency_slug AND is_active = true;
  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Agência não encontrada ou inativa.';
  END IF;

  -- Find first stage (position = minimum)
  SELECT id INTO v_stage_id FROM public.lead_stages WHERE agency_id = v_agency_id ORDER BY position ASC LIMIT 1;
  IF v_stage_id IS NULL THEN
    RAISE EXCEPTION 'O funil desta agência não possui estágios configurados.';
  END IF;

  -- Determine final tags (append source tag if not exists)
  v_final_tags := COALESCE(_tags, '{}'::text[]);
  IF _source IS NOT NULL AND _source <> '' AND NOT (_source = ANY(v_final_tags)) THEN
    v_final_tags := array_append(v_final_tags, _source);
  END IF;

  -- Insert Lead with tags
  INSERT INTO public.leads (
    agency_id, stage_id, name, email, phone, destination, travel_start, travel_end, pax_count, estimated_value, source, notes, tags
  ) VALUES (
    v_agency_id, v_stage_id, _name, _email, _phone, _destination, _travel_start, _travel_end, COALESCE(_pax_count, 1), COALESCE(_estimated_value, 0), _source, _notes, v_final_tags
  ) RETURNING id INTO v_lead_id;

  RETURN v_lead_id;
END;
$$;

-- Grant execute permission on the new function
GRANT EXECUTE ON FUNCTION public.submit_public_lead(text, text, text, text, text, date, date, int, numeric, text, text, text[]) TO anon, authenticated;
