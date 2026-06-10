-- Fase F.1: Perfil 360 & Gestão de Dados do Cliente

-- 1. Adicionar tags e soft delete à tabela clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2. Atualizar RPC get_crm_leads para evitar leads de clientes deletados? (Opcional, mas como leads já tem deleted_at, fica ok).

-- 3. Criar a RPC para Merge de Clientes
CREATE OR REPLACE FUNCTION public.merge_clients(p_target_id uuid, p_source_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_agency uuid;
  v_source_agency uuid;
BEGIN
  -- Validar que ambos existem e pertencem à mesma agência
  SELECT agency_id INTO v_target_agency FROM public.clients WHERE id = p_target_id;
  SELECT agency_id INTO v_source_agency FROM public.clients WHERE id = p_source_id;

  IF v_target_agency IS NULL OR v_source_agency IS NULL THEN
    RAISE EXCEPTION 'Um dos clientes não foi encontrado.';
  END IF;

  IF v_target_agency <> v_source_agency THEN
    RAISE EXCEPTION 'Não é permitido mesclar clientes de agências diferentes.';
  END IF;

  -- Mover Propostas
  UPDATE public.proposals SET client_id = p_target_id WHERE client_id = p_source_id;

  -- Mover Viagens
  UPDATE public.trips SET client_id = p_target_id WHERE client_id = p_source_id;

  -- Mover Leads
  UPDATE public.leads SET client_id = p_target_id WHERE client_id = p_source_id;

  -- Mover Gift Cards
  UPDATE public.gift_cards SET purchased_by_client_id = p_target_id WHERE purchased_by_client_id = p_source_id;
  UPDATE public.gift_cards SET redeemed_by_client_id = p_target_id WHERE redeemed_by_client_id = p_source_id;

  -- Mover Reservas de Grupos Terrestres (se existir a tabela)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'group_tour_bookings') THEN
    EXECUTE 'UPDATE public.group_tour_bookings SET client_id = $1 WHERE client_id = $2' USING p_target_id, p_source_id;
  END IF;

  -- Mover Aceites Legais (LGPD)
  UPDATE public.legal_acceptances SET client_id = p_target_id WHERE client_id = p_source_id;

  -- Mover Tickets de Suporte
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'support_tickets') THEN
    EXECUTE 'UPDATE public.support_tickets SET client_id = $1 WHERE client_id = $2' USING p_target_id, p_source_id;
  END IF;

  -- Mover passageiros de viagens (se houver vínculo via passenger.client_id)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'trip_passengers' AND column_name = 'client_id'
  ) THEN
    EXECUTE 'UPDATE public.trip_passengers SET client_id = $1 WHERE client_id = $2' USING p_target_id, p_source_id;
  END IF;

  -- Soft delete no cliente antigo (mantendo rastreabilidade)
  UPDATE public.clients SET deleted_at = now() WHERE id = p_source_id;

END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_clients(uuid, uuid) TO authenticated;
