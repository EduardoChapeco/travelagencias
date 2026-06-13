-- ──────────────────────────────────────────────────────────────
-- RPC: duplicate_trip
-- Copia uma viagem existente e retorna o ID do novo registro.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.duplicate_trip(p_trip_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id UUID;
BEGIN
  INSERT INTO trips (
    agency_id, title, destination, travel_start, travel_end,
    status, currency, total_sale, total_cost, total_paid,
    notes, code, client_id, owner_id, proposal_id
  )
  SELECT
    agency_id,
    title || ' (Cópia)',
    destination, travel_start, travel_end,
    'planning',
    currency, total_sale, total_cost, 0,
    notes, code, client_id, owner_id, NULL
  FROM trips
  WHERE id = p_trip_id
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.duplicate_trip(UUID) TO authenticated;
