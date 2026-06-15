-- =============================================================================
-- Migration: 20260615000012_proposals_reconcile_conversion
-- Goal: 
-- 1. Sync fields from proposals to trips
-- 2. DRE/Cash ignoring third-party installments
-- 3. Extend payment_installments with OCR/barcode fields
-- 4. Incorporate insurance_price into proposals recalculate totals
-- =============================================================================

-- 1. Update Trips Table
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS itinerary jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS includes jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS excludes jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS flights jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS hotels jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS transfers jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS tours jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS insurance jsonb DEFAULT '{}'::jsonb;

-- 2. Update Payment Installments
ALTER TABLE public.payment_installments ADD COLUMN IF NOT EXISTS is_third_party boolean DEFAULT false;
ALTER TABLE public.payment_installments ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE public.payment_installments ADD COLUMN IF NOT EXISTS boleto_url text;
ALTER TABLE public.payment_installments ADD COLUMN IF NOT EXISTS payment_warning text;
ALTER TABLE public.payment_installments ADD COLUMN IF NOT EXISTS ocr_data jsonb;

-- 3. Update Financial Records
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS is_third_party boolean DEFAULT false;

-- 4. Update Financial RPCs
CREATE OR REPLACE FUNCTION public.calculate_cash_summary(
  _agency_id uuid,
  _filter text DEFAULT 'all'
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _income numeric := 0;
  _expense numeric := 0;
  _pending numeric := 0;
BEGIN
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0)
  INTO _income, _expense, _pending
  FROM public.financial_records
  WHERE agency_id = _agency_id
    AND status != 'cancelled'
    AND deleted_at IS NULL
    AND COALESCE(is_third_party, false) = false;

  RETURN json_build_object(
    'income', _income,
    'expense', _expense,
    'pending', _pending,
    'net', _income - _expense
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_dre_summary(
  _agency_id uuid,
  _period text 
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _from timestamptz;
  _income numeric := 0;
  _expense numeric := 0;
  _by_cat json;
BEGIN
  IF _period = 'month' THEN
    _from := now() - interval '1 month';
  ELSIF _period = 'quarter' THEN
    _from := now() - interval '3 months';
  ELSIF _period = 'year' THEN
    _from := now() - interval '1 year';
  ELSE
    _from := '1970-01-01'::timestamptz;
  END IF;

  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO _income, _expense
  FROM public.financial_records
  WHERE agency_id = _agency_id
    AND status != 'cancelled'
    AND deleted_at IS NULL
    AND created_at >= _from
    AND COALESCE(is_third_party, false) = false;

  SELECT json_object_agg(
    cat_name, 
    json_build_object('income', income_sum, 'expense', expense_sum)
  ) INTO _by_cat
  FROM (
    SELECT 
      COALESCE(category, 'Sem categoria') as cat_name,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income_sum,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense_sum
    FROM public.financial_records
    WHERE agency_id = _agency_id
      AND status != 'cancelled'
      AND deleted_at IS NULL
      AND created_at >= _from
      AND COALESCE(is_third_party, false) = false
    GROUP BY COALESCE(category, 'Sem categoria')
  ) sub;

  IF _by_cat IS NULL THEN
    _by_cat := '{}'::json;
  END IF;

  RETURN json_build_object(
    'income', _income,
    'expense', _expense,
    'net', _income - _expense,
    'byCat', _by_cat
  );
END;
$$;

-- 5. Update Convert Proposal to Trip RPC
CREATE OR REPLACE FUNCTION convert_proposal_to_trip(
  p_proposal_id uuid,
  p_agency_id   uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trip_id  uuid;
  v_proposal proposals%ROWTYPE;
  v_number   bigint;
BEGIN
  SELECT * INTO v_proposal
    FROM proposals
   WHERE id = p_proposal_id
     AND agency_id = p_agency_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposta % não encontrada ou não pertence à agência.', p_proposal_id;
  END IF;

  SELECT COALESCE(MAX(number), 0) + 1
    INTO v_number
    FROM trips
   WHERE agency_id = p_agency_id;

  INSERT INTO trips (
    agency_id,
    proposal_id,
    client_id,
    number,
    title,
    destination,
    travel_start,
    travel_end,
    currency,
    total_sale,
    status,
    flights,
    hotels,
    transfers,
    tours,
    insurance,
    itinerary,
    includes,
    excludes,
    notes
  )
  VALUES (
    p_agency_id,
    p_proposal_id,
    v_proposal.client_id,
    v_number,
    v_proposal.title,
    v_proposal.destination,
    v_proposal.travel_start,
    v_proposal.travel_end,
    COALESCE(v_proposal.currency, 'BRL'),
    COALESCE(v_proposal.total, 0),
    'confirmed',
    COALESCE(v_proposal.flights, '[]'::jsonb),
    COALESCE(v_proposal.hotels, '[]'::jsonb),
    COALESCE(v_proposal.transfers, '[]'::jsonb),
    COALESCE(v_proposal.tours, '[]'::jsonb),
    COALESCE(v_proposal.insurance, '{}'::jsonb),
    COALESCE(v_proposal.itinerary, '[]'::jsonb),
    COALESCE(v_proposal.includes, '[]'::jsonb),
    COALESCE(v_proposal.excludes, '[]'::jsonb),
    v_proposal.notes
  )
  RETURNING id INTO v_trip_id;

  UPDATE proposals
     SET status   = 'converted',
         trip_id  = v_trip_id
   WHERE id = p_proposal_id;

  IF COALESCE(v_proposal.total, 0) > 0 THEN
    INSERT INTO financial_records (
      agency_id,
      client_id,
      trip_id,
      type,
      category,
      description,
      amount,
      currency,
      status,
      due_date
    ) VALUES (
      p_agency_id,
      v_proposal.client_id,
      v_trip_id,
      'income',
      'Vendas',
      'Faturamento referente à Proposta #' || v_proposal.number,
      v_proposal.total,
      COALESCE(v_proposal.currency, 'BRL'),
      'pending',
      COALESCE(v_proposal.travel_start, CURRENT_DATE) 
    );
  END IF;

  RETURN v_trip_id;
END;
$$;

-- 6. Update Proposal Totals Trigger
CREATE OR REPLACE FUNCTION public.trg_recalculate_proposal_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_item jsonb;
BEGIN
  IF NEW.flights IS NOT NULL AND jsonb_typeof(NEW.flights) = 'array' THEN
    FOR v_item IN SELECT jsonb_array_elements(NEW.flights) LOOP
      v_subtotal := v_subtotal + coalesce((v_item->>'price')::numeric, 0);
    END LOOP;
  END IF;

  IF NEW.hotels IS NOT NULL AND jsonb_typeof(NEW.hotels) = 'array' THEN
    FOR v_item IN SELECT jsonb_array_elements(NEW.hotels) LOOP
      v_subtotal := v_subtotal + coalesce((v_item->>'price')::numeric, 0);
    END LOOP;
  END IF;

  IF NEW.transfers IS NOT NULL AND jsonb_typeof(NEW.transfers) = 'array' THEN
    FOR v_item IN SELECT jsonb_array_elements(NEW.transfers) LOOP
      v_subtotal := v_subtotal + coalesce((v_item->>'price')::numeric, 0);
    END LOOP;
  END IF;

  IF NEW.tours IS NOT NULL AND jsonb_typeof(NEW.tours) = 'array' THEN
    FOR v_item IN SELECT jsonb_array_elements(NEW.tours) LOOP
      v_subtotal := v_subtotal + coalesce((v_item->>'price')::numeric, 0);
    END LOOP;
  END IF;

  IF NEW.custom_payments IS NOT NULL AND jsonb_typeof(NEW.custom_payments) = 'array' THEN
    FOR v_item IN SELECT jsonb_array_elements(NEW.custom_payments) LOOP
      IF NOT coalesce((v_item->>'is_optional')::boolean, false) THEN
        v_subtotal := v_subtotal + coalesce((v_item->>'price')::numeric, 0);
      END IF;
    END LOOP;
  END IF;

  IF NEW.insurance IS NOT NULL AND jsonb_typeof(NEW.insurance) = 'object' THEN
    v_subtotal := v_subtotal + coalesce((NEW.insurance->>'price')::numeric, 0);
  END IF;

  v_total := v_subtotal - coalesce(NEW.discount, 0);
  IF v_total < 0 THEN
    v_total := 0;
  END IF;

  NEW.subtotal := v_subtotal;
  NEW.total := v_total;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proposals_recalculate_totals ON public.proposals;
CREATE TRIGGER trg_proposals_recalculate_totals
BEFORE INSERT OR UPDATE OF flights, hotels, transfers, tours, insurance, pix_discount_percent, custom_payments, discount ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.trg_recalculate_proposal_totals();
