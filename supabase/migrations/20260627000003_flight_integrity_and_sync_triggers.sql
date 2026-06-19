-- =============================================================================
-- Migration: 20260627000003_flight_integrity_and_sync_triggers.sql
-- Descrição: Triggers de integridade de voo e sincronização automática de segments
--
-- Objetivos:
--   1. Atualizar handle_flight_itinerary_sync para monitorar type = 'confirmed'
--   2. Criar trigger trg_flight_segment_sync para sincronizar trechos em flight_segments
--   3. Criar trigger trg_prevent_active_flight_deletion para impedir deleção de voo ativo/vigente
-- =============================================================================

-- 1. Atualizar a trigger function de sincronização do itinerário para monitorar tipo e status
CREATE OR REPLACE FUNCTION public.handle_flight_itinerary_sync()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND (NEW.status = 'active' OR NEW.type = 'confirmed')) OR 
     (TG_OP = 'UPDATE' AND (
        (NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active') OR
        (NEW.type = 'confirmed' AND OLD.type IS DISTINCT FROM 'confirmed')
     )) THEN
    PERFORM public.sync_flight_to_boarding_ticket(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger function para sincronizar bilhetes quando segmentos do itinerário ativo/confirmado mudam
CREATE OR REPLACE FUNCTION public.handle_flight_segment_sync()
RETURNS trigger AS $$
DECLARE
  v_itinerary_id uuid;
  v_itinerary_status text;
  v_itinerary_type text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_itinerary_id := OLD.itinerary_id;
  ELSE
    v_itinerary_id := NEW.itinerary_id;
  END IF;

  -- Obter status e tipo do itinerário associado
  SELECT status, type INTO v_itinerary_status, v_itinerary_type
  FROM public.flight_itineraries
  WHERE id = v_itinerary_id;

  -- Se for um itinerário ativo ou confirmado, sincronizar bilhetes
  IF v_itinerary_status = 'active' OR v_itinerary_type = 'confirmed' THEN
    PERFORM public.sync_flight_to_boarding_ticket(v_itinerary_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger de sincronização em flight_segments
DROP TRIGGER IF EXISTS trg_flight_segment_sync ON public.flight_segments;
CREATE TRIGGER trg_flight_segment_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.flight_segments
  FOR EACH ROW EXECUTE FUNCTION public.handle_flight_segment_sync();

-- 3. Trigger function para impedir deleção órfã de itinerários ativos/confirmados
CREATE OR REPLACE FUNCTION public.prevent_active_flight_deletion()
RETURNS trigger AS $$
BEGIN
  IF OLD.type = 'confirmed' OR OLD.status = 'active' THEN
    IF EXISTS (
      SELECT 1 FROM public.boarding_cards bc
      WHERE bc.trip_id = OLD.trip_id AND bc.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Não é permitido excluir um itinerário de voo confirmado ou ativo que possua cartões de embarque vinculados.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger de integridade em flight_itineraries
DROP TRIGGER IF EXISTS trg_prevent_active_flight_deletion ON public.flight_itineraries;
CREATE TRIGGER trg_prevent_active_flight_deletion
  BEFORE DELETE ON public.flight_itineraries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_active_flight_deletion();
