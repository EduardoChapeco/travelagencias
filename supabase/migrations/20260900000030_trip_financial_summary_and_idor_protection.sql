-- =============================================================================
-- MICROFASE F-005: RPC get_trip_financial_summary — KPIs financeiros server-side
--
-- PROBLEMA: agency.$slug.trips.$id.financial.tsx calculava no frontend:
--   - totalIncome, totalExpense, totalThirdParty (soma de registros)
--   - margin = totalIncome - totalExpense
--   - marginPct = (margin / totalIncome * 100).toFixed(1)
--   - outstanding = trip.total_sale - trip.total_paid
--
-- Esses são indicadores de negócio, não formatação visual.
-- A soma de financial_records no cliente pode divergir do estado real do banco
-- se houver concorrência, se o cache estiver desatualizado ou se registros
-- forem alterados em paralelo.
--
-- SOLUÇÃO: RPC SECURITY DEFINER que:
--   1. Autentica e verifica membership server-side
--   2. Agrega financial_records no banco (autoridade canônica)
--   3. Calcula margem, percentual e saldo server-side
--   4. Retorna snapshot consistente e transacional
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_trip_financial_summary(
  p_trip_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id    uuid;
  v_agency_id    uuid;
  v_trip_sale    numeric(12,2);
  v_trip_cost    numeric(12,2);
  v_trip_paid    numeric(12,2);
  v_total_income     numeric(12,2) := 0;
  v_total_expense    numeric(12,2) := 0;
  v_total_3party     numeric(12,2) := 0;
  v_margin           numeric(12,2);
  v_margin_pct       numeric(8,2);
  v_outstanding      numeric(12,2);
BEGIN
  -- 1. Auth
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  -- 2. Resolve trip + agency (server-side, never trust client input)
  SELECT agency_id, total_sale, total_cost, total_paid
  INTO v_agency_id, v_trip_sale, v_trip_cost, v_trip_paid
  FROM public.trips
  WHERE id = p_trip_id
    AND deleted_at IS NULL;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Trip not found or deleted: %', p_trip_id;
  END IF;

  -- 3. Verify membership
  IF NOT public.is_agency_member(v_caller_id, v_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized: not a member of agency %', v_agency_id;
  END IF;

  -- 4. Aggregate financial records in the DB (authoritative sum)
  SELECT
    COALESCE(SUM(CASE WHEN type = 'income'  AND NOT COALESCE(is_third_party, false) THEN COALESCE(amount_brl, amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' AND NOT COALESCE(is_third_party, false) THEN COALESCE(amount_brl, amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'income'  AND     COALESCE(is_third_party, false) THEN COALESCE(amount_brl, amount) ELSE 0 END), 0)
  INTO v_total_income, v_total_expense, v_total_3party
  FROM public.financial_records
  WHERE trip_id = p_trip_id
    AND status != 'cancelled';

  -- 5. Calculate business metrics server-side
  v_margin     := v_total_income - v_total_expense;
  v_margin_pct := CASE WHEN v_total_income > 0 THEN ROUND((v_margin / v_total_income) * 100, 1) ELSE 0 END;
  v_outstanding := COALESCE(v_trip_sale, 0) - COALESCE(v_trip_paid, 0);

  RETURN jsonb_build_object(
    'trip_id',         p_trip_id,
    'agency_id',       v_agency_id,
    'total_sale',      COALESCE(v_trip_sale,  0),
    'total_cost',      COALESCE(v_trip_cost,  0),
    'total_paid',      COALESCE(v_trip_paid,  0),
    'total_income',    v_total_income,
    'total_expense',   v_total_expense,
    'total_3rdparty',  v_total_3party,
    'margin',          v_margin,
    'margin_pct',      v_margin_pct,
    'outstanding',     v_outstanding
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'get_trip_financial_summary failed: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_trip_financial_summary(uuid)
  TO authenticated;

COMMENT ON FUNCTION public.get_trip_financial_summary IS
  'Server-side authoritative financial KPIs for a trip.
   Replaces client-side reduce() calculations in trips/$id/financial.tsx.
   Returns margin, outstanding balance and third-party income as server
   aggregates with tenant verification.
   Microfase F-005 — 2026-08-03';

-- =============================================================================
-- MICROFASE SEC-001: Adicionar agency_id ao filtro de leitura de trips
-- no contexto da rota /agency/$slug/trips/$id
--
-- PROBLEMA: O query de leitura da viagem em agency.$slug.trips.$id.tsx faz:
--   supabase.from("trips").select("*").eq("id", id).is("deleted_at", null)
-- Sem verificação de agency_id. A proteção depende exclusivamente do RLS.
--
-- SOLUÇÃO: RPC get_trip_for_agency que garante:
--   1. Tenant resolvido server-side (auth.uid → agency_id)
--   2. Viagem deve pertencer ao mesmo tenant do slug
--   3. Não revela viagem de outro tenant (mesmo que o ID exista)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_trip_for_agency(
  p_trip_id   uuid,
  p_agency_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_trip      public.trips%ROWTYPE;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  -- Verify caller membership in the specified agency
  IF NOT public.is_agency_member(v_caller_id, p_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized: not a member of agency %', p_agency_id;
  END IF;

  -- Fetch trip filtered by BOTH id AND agency_id (double-key isolation)
  SELECT * INTO v_trip
  FROM public.trips
  WHERE id = p_trip_id
    AND agency_id = p_agency_id
    AND deleted_at IS NULL;

  IF v_trip.id IS NULL THEN
    -- Do not reveal if trip exists in another agency
    RETURN NULL;
  END IF;

  RETURN to_jsonb(v_trip);

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'get_trip_for_agency failed: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_trip_for_agency(uuid, uuid)
  TO authenticated;

COMMENT ON FUNCTION public.get_trip_for_agency IS
  'IDOR-protected trip read. Double-key filter (id + agency_id) ensures
   a trip from Agency B cannot be accessed by Agency A even if the UUID
   is known. Tenant verified server-side.
   Microfase SEC-001 — 2026-08-03';
