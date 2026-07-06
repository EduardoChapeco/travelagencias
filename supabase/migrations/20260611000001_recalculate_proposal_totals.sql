-- =============================================================================
-- Turis — Recalculo de Totais de Propostas (Segurança Comercial)
-- Migration: 20260611000001_recalculate_proposal_totals
-- =============================================================================

-- 1. Função de trigger para recalcular totais de propostas automaticamente no banco
CREATE OR REPLACE FUNCTION public.trg_recalculate_proposal_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_total numeric := 0;
  v_item jsonb;
BEGIN
  -- Somar voos
  IF NEW.flights IS NOT NULL AND jsonb_typeof(NEW.flights) = 'array' THEN
    FOR v_item IN SELECT jsonb_array_elements(NEW.flights) LOOP
      v_subtotal := v_subtotal + coalesce((v_item->>'price')::numeric, 0);
    END LOOP;
  END IF;

  -- Somar hotéis
  IF NEW.hotels IS NOT NULL AND jsonb_typeof(NEW.hotels) = 'array' THEN
    FOR v_item IN SELECT jsonb_array_elements(NEW.hotels) LOOP
      v_subtotal := v_subtotal + coalesce((v_item->>'price')::numeric, 0);
    END LOOP;
  END IF;

  -- Somar transfers
  IF NEW.transfers IS NOT NULL AND jsonb_typeof(NEW.transfers) = 'array' THEN
    FOR v_item IN SELECT jsonb_array_elements(NEW.transfers) LOOP
      v_subtotal := v_subtotal + coalesce((v_item->>'price')::numeric, 0);
    END LOOP;
  END IF;

  -- Somar passeios
  IF NEW.tours IS NOT NULL AND jsonb_typeof(NEW.tours) = 'array' THEN
    FOR v_item IN SELECT jsonb_array_elements(NEW.tours) LOOP
      v_subtotal := v_subtotal + coalesce((v_item->>'price')::numeric, 0);
    END LOOP;
  END IF;

  -- Calcular desconto Pix e total final
  v_discount := v_subtotal * (coalesce(NEW.pix_discount_percent, 0) / 100.0);
  v_total := v_subtotal - v_discount;
  IF v_total < 0 THEN
    v_total := 0;
  END IF;

  -- Atualizar colunas do registro NEW
  NEW.subtotal := v_subtotal;
  NEW.discount := v_discount;
  NEW.total := v_total;

  RETURN NEW;
END;
$$;

-- 2. Vincular trigger à tabela de proposals
DROP TRIGGER IF EXISTS trg_proposals_recalculate_totals ON public.proposals;
CREATE TRIGGER trg_proposals_recalculate_totals
BEFORE INSERT OR UPDATE OF flights, hotels, transfers, tours, pix_discount_percent ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.trg_recalculate_proposal_totals();

-- 3. Função RPC para acionar recalculação explícita
CREATE OR REPLACE FUNCTION public.recalculate_proposal_totals(_proposal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas executa um UPDATE vazio para forçar o disparo do trigger BEFORE UPDATE
  UPDATE public.proposals
  SET updated_at = now()
  WHERE id = _proposal_id;
END;
$$;

-- 4. Grant permissões para perfis autenticados
GRANT EXECUTE ON FUNCTION public.recalculate_proposal_totals(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_proposal_totals(uuid) TO service_role;
