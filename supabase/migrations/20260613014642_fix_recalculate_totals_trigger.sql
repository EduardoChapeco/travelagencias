-- Migration: 20260613014642_fix_recalculate_totals_trigger.sql
-- Descrição: Corrige o recálculo automático de totais no servidor (Supabase trigger).
-- Inclui o cálculo de custom_payments obrigatórios, preserva o desconto fixo (discount) e atualiza os gatilhos para escutar alterações em discount e custom_payments.

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
  -- 1. Somar voos
  IF NEW.flights IS NOT NULL AND jsonb_typeof(NEW.flights) = 'array' THEN
    FOR v_item IN SELECT jsonb_array_elements(NEW.flights) LOOP
      v_subtotal := v_subtotal + coalesce((v_item->>'price')::numeric, 0);
    END LOOP;
  END IF;

  -- 2. Somar hotéis
  IF NEW.hotels IS NOT NULL AND jsonb_typeof(NEW.hotels) = 'array' THEN
    FOR v_item IN SELECT jsonb_array_elements(NEW.hotels) LOOP
      v_subtotal := v_subtotal + coalesce((v_item->>'price')::numeric, 0);
    END LOOP;
  END IF;

  -- 3. Somar transfers
  IF NEW.transfers IS NOT NULL AND jsonb_typeof(NEW.transfers) = 'array' THEN
    FOR v_item IN SELECT jsonb_array_elements(NEW.transfers) LOOP
      v_subtotal := v_subtotal + coalesce((v_item->>'price')::numeric, 0);
    END LOOP;
  END IF;

  -- 4. Somar passeios
  IF NEW.tours IS NOT NULL AND jsonb_typeof(NEW.tours) = 'array' THEN
    FOR v_item IN SELECT jsonb_array_elements(NEW.tours) LOOP
      v_subtotal := v_subtotal + coalesce((v_item->>'price')::numeric, 0);
    END LOOP;
  END IF;

  -- 5. Somar pagamentos customizados obrigatórios (não opcionais)
  IF NEW.custom_payments IS NOT NULL AND jsonb_typeof(NEW.custom_payments) = 'array' THEN
    FOR v_item IN SELECT jsonb_array_elements(NEW.custom_payments) LOOP
      IF NOT coalesce((v_item->>'is_optional')::boolean, false) THEN
        v_subtotal := v_subtotal + coalesce((v_item->>'price')::numeric, 0);
      END IF;
    END LOOP;
  END IF;

  -- 6. Calcular total da proposta subtraindo apenas o desconto fixo (discount)
  -- Mantemos NEW.discount como o desconto fixo em valor da cotação
  v_total := v_subtotal - coalesce(NEW.discount, 0);
  IF v_total < 0 THEN
    v_total := 0;
  END IF;

  -- Atualizar colunas no registro
  NEW.subtotal := v_subtotal;
  NEW.total := v_total;

  RETURN NEW;
END;
$$;

-- Recriar trigger para escutar atualizações de custom_payments e discount além das originais
DROP TRIGGER IF EXISTS trg_proposals_recalculate_totals ON public.proposals;
CREATE TRIGGER trg_proposals_recalculate_totals
BEFORE INSERT OR UPDATE OF flights, hotels, transfers, tours, pix_discount_percent, custom_payments, discount ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.trg_recalculate_proposal_totals();
