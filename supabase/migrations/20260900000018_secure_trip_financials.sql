-- =========================================================================================
-- Microfase 1: Autoridade Server-Side para Financeiro da Viagem
-- Evita que o frontend sobrescreva total_sale e total_cost via API REST
-- Exige o uso da RPC `update_trip_financials` para qualquer mudança manual.
-- =========================================================================================

-- 1. Trigger para bloquear atualizações diretas de total_sale e total_cost pelo PostgREST
CREATE OR REPLACE FUNCTION public.protect_trip_financials()
RETURNS trigger AS $$
BEGIN
  -- Se o current_user não for o postgres (ou um admin de banco de dados similar),
  -- nós impedimos a alteração das colunas financeiras (PostgREST usa roles como 'authenticated')
  IF current_user NOT IN ('postgres', 'supabase_admin') THEN
    NEW.total_sale = OLD.total_sale;
    NEW.total_cost = OLD.total_cost;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_trip_financials ON public.trips;
CREATE TRIGGER trg_protect_trip_financials
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_trip_financials();

-- 2. RPC Segura para atualização explícita (Server-Side Authority)
CREATE OR REPLACE FUNCTION public.update_trip_financials(
  p_trip_id uuid,
  p_total_sale numeric,
  p_total_cost numeric
)
RETURNS void AS $$
DECLARE
  v_agency_id uuid;
BEGIN
  -- Validação de existência e extração do tenant
  SELECT agency_id INTO v_agency_id FROM public.trips WHERE id = p_trip_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Viagem não encontrada.';
  END IF;

  -- Validação de permissão (segurança multi-tenant)
  IF NOT public.is_agency_member(auth.uid(), v_agency_id) THEN
    RAISE EXCEPTION 'Acesso negado para modificar esta viagem.';
  END IF;

  -- Update direto, que funcionará porque esta função é SECURITY DEFINER 
  -- e executa como postgres, burlando a trigger protect_trip_financials.
  UPDATE public.trips 
  SET 
    total_sale = p_total_sale,
    total_cost = p_total_cost,
    updated_at = now()
  WHERE id = p_trip_id;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que a função possa ser chamada pelos usuários logados
GRANT EXECUTE ON FUNCTION public.update_trip_financials(uuid, numeric, numeric) TO authenticated;
