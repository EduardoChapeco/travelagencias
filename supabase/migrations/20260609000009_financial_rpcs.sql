-- =============================================================================
-- TravelOS — Financial Aggregation RPCs (Phase 7)
-- Migration: 20260609000007_financial_rpcs
-- =============================================================================

-- 1. Cash Flow Summary (Entradas, Saídas, Pendente e Saldo)
CREATE OR REPLACE FUNCTION public.calculate_cash_summary(
  _agency_id uuid,
  _filter text DEFAULT 'all' -- 'all', 'income', 'expense', 'pending'
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _income numeric := 0;
  _expense numeric := 0;
  _pending numeric := 0;
BEGIN
  -- We only sum records that are NOT cancelled and NOT soft-deleted
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0)
  INTO _income, _expense, _pending
  FROM public.financial_records
  WHERE agency_id = _agency_id
    AND status != 'cancelled'
    AND deleted_at IS NULL;

  -- The filter parameter could be used to restrict totals, but typically totals ignore UI filters
  -- to show the big picture. We return global cash balance.

  RETURN json_build_object(
    'income', _income,
    'expense', _expense,
    'pending', _pending,
    'net', _income - _expense
  );
END;
$$;

-- 2. DRE Summary (Agrupado por Categoria)
CREATE OR REPLACE FUNCTION public.calculate_dre_summary(
  _agency_id uuid,
  _period text -- 'month', 'quarter', 'year'
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
  -- Determine time range
  IF _period = 'month' THEN
    _from := now() - interval '1 month';
  ELSIF _period = 'quarter' THEN
    _from := now() - interval '3 months';
  ELSIF _period = 'year' THEN
    _from := now() - interval '1 year';
  ELSE
    _from := '1970-01-01'::timestamptz;
  END IF;

  -- Global Totals
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO _income, _expense
  FROM public.financial_records
  WHERE agency_id = _agency_id
    AND status != 'cancelled'
    AND deleted_at IS NULL
    AND created_at >= _from;

  -- Grouped by Category
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
