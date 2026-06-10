-- Correções de Segurança: Auditoria da Fase F

-- 1. Fechar IDOR na RPC merge_clients
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

  -- CHECK DE SEGURANÇA: Validar se o usuário executor pertence à agência
  IF NOT public.is_agency_member(auth.uid(), v_target_agency) THEN
    RAISE EXCEPTION 'Acesso Negado: Você não possui permissão nesta agência.';
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

  -- Mover Grupos Terrestres
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'group_tour_bookings') THEN
    EXECUTE 'UPDATE public.group_tour_bookings SET client_id = $1 WHERE client_id = $2' USING p_target_id, p_source_id;
  END IF;

  -- Mover Aceites Legais (LGPD)
  UPDATE public.legal_acceptances SET client_id = p_target_id WHERE client_id = p_source_id;

  -- Mover Tickets de Suporte
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'support_tickets') THEN
    EXECUTE 'UPDATE public.support_tickets SET client_id = $1 WHERE client_id = $2' USING p_target_id, p_source_id;
  END IF;

  -- Mover passageiros de viagens
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'trip_passengers' AND column_name = 'client_id'
  ) THEN
    EXECUTE 'UPDATE public.trip_passengers SET client_id = $1 WHERE client_id = $2' USING p_target_id, p_source_id;
  END IF;

  -- Soft delete no cliente antigo
  UPDATE public.clients SET deleted_at = now() WHERE id = p_source_id;
END;
$$;


-- 2. Criar RPC para Cliente (B2C) abrir um ticket de Cancelamento
CREATE OR REPLACE FUNCTION public.request_trip_cancellation(p_trip_id uuid, p_client_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip record;
BEGIN
  -- Validar se o cliente pertence à viagem
  SELECT id, agency_id, code INTO v_trip FROM public.trips WHERE id = p_trip_id AND client_id = p_client_id;
  
  IF v_trip IS NULL THEN
    RAISE EXCEPTION 'Viagem não encontrada ou não pertence ao cliente.';
  END IF;

  -- Validar se o cliente que chama a RPC é dono daquele client_id
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Acesso Negado.';
  END IF;

  -- Criar o ticket
  INSERT INTO public.support_tickets (agency_id, client_id, title, description, status, priority)
  VALUES (
    v_trip.agency_id,
    p_client_id,
    'Solicitação de Cancelamento - Viagem ' || COALESCE(v_trip.code, 'Desconhecida'),
    'Motivo informado: ' || p_reason || E'\n\nSolicitação gerada automaticamente pelo Portal do Cliente.',
    'open',
    'high'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_trip_cancellation(uuid, uuid, text) TO authenticated;


-- 3. Travar RLS de trip_memories para impedir IDOR na Trip ID
DROP POLICY IF EXISTS "client_trip_memories_insert" ON public.trip_memories;

CREATE POLICY "client_trip_memories_insert" ON public.trip_memories
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.user_id = auth.uid()
            AND c.id = trip_memories.client_id
            -- NOVO CHECK: A viagem também deve pertencer a este cliente
            AND EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_memories.trip_id AND t.client_id = c.id)
        )
    );
