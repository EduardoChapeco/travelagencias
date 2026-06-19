-- =============================================================================
-- Migration: 20260627000001_reaccommodation_whatsapp_trigger.sql
-- Descrição: Notificações WhatsApp quando status de reacomodação de passageiros muda
--
-- Objetivos:
--   1. Notificar cliente via WhatsApp quando seu status de accommodation_status muda
--      (pendente → confirmado, pendente → realocado, etc.)
--   2. Notificar também em mudanças de status geral do passageiro (cancelled → confirmado)
--
-- Dependências:
--   - Trigger whatsapp_sender_trigger em omnichannel_messages (20260612000009)
--   - Função get_lead_id_for_whatsapp (20260613030005)
--   - Tabela trip_passengers com colunas accommodation_status e status
-- =============================================================================

ALTER TABLE public.trip_passengers
  ADD COLUMN IF NOT EXISTS accommodation_status text
    CHECK (accommodation_status IN ('pending', 'confirmed', 'reallocated', 'cancelled', 'no_show'))
    DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS accommodation_notes text,
  ADD COLUMN IF NOT EXISTS accommodation_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('pending', 'confirmed', 'cancelled')) DEFAULT 'confirmed';

-- =============================================================================
-- FUNÇÃO: trigger_reaccommodation_whatsapp
-- Disparo: AFTER UPDATE ON trip_passengers
-- Condição: accommodation_status IS DISTINCT FROM (antes → depois) 
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trigger_reaccommodation_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id      uuid;
  v_trip_title   text;
  v_agency_id    uuid;
  v_client_id    uuid;
  v_trip_id      uuid;
  v_message      text;
  v_status_label text;
  v_old_label    text;
BEGIN
  -- Processar apenas mudanças reais de accommodation_status
  IF NEW.accommodation_status IS NOT DISTINCT FROM OLD.accommodation_status THEN
    RETURN NEW;
  END IF;

  -- Coletar dados do contexto
  v_trip_id   := NEW.trip_id;
  v_agency_id := NEW.agency_id;
  v_client_id := NEW.client_id;

  -- Obter título da viagem
  SELECT title INTO v_trip_title
    FROM public.trips
   WHERE id = v_trip_id;

  -- Resolver lead_id via função auxiliar existente
  v_lead_id := public.get_lead_id_for_whatsapp(v_agency_id, v_trip_id, v_client_id);

  -- Sem lead_id? Não há como enviar WhatsApp
  IF v_lead_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Mapear label legível do novo status
  v_status_label := CASE NEW.accommodation_status
    WHEN 'confirmed'   THEN 'Confirmada ✅'
    WHEN 'reallocated' THEN 'Realocada 🔄'
    WHEN 'cancelled'   THEN 'Cancelada ❌'
    WHEN 'no_show'     THEN 'No-show registrado ⚠️'
    WHEN 'pending'     THEN 'Pendente de confirmação 🕐'
    ELSE NEW.accommodation_status
  END;

  -- Mapear label do status anterior
  v_old_label := CASE COALESCE(OLD.accommodation_status, 'pending')
    WHEN 'confirmed'   THEN 'Confirmada'
    WHEN 'reallocated' THEN 'Realocada'
    WHEN 'cancelled'   THEN 'Cancelada'
    WHEN 'no_show'     THEN 'No-show'
    WHEN 'pending'     THEN 'Pendente'
    ELSE COALESCE(OLD.accommodation_status, 'Pendente')
  END;

  -- Montar mensagem personalizada por tipo de transição
  v_message := CASE
    WHEN NEW.accommodation_status = 'confirmed' THEN
      '✅ Olá, ' || NEW.full_name || '! Sua acomodação para a viagem "' || COALESCE(v_trip_title, 'sua viagem') || '" foi *confirmada*! Qualquer dúvida, entre em contato com a nossa equipe.'

    WHEN NEW.accommodation_status = 'reallocated' THEN
      '🔄 Olá, ' || NEW.full_name || '! Houve uma *realocação de acomodação* para a viagem "' || COALESCE(v_trip_title, 'sua viagem') || '". Seu novo quarto/alocação foi atualizado. '
      || CASE WHEN NEW.accommodation_notes IS NOT NULL THEN 'Detalhes: ' || NEW.accommodation_notes ELSE 'Entre em contato com a agência para mais detalhes.' END

    WHEN NEW.accommodation_status = 'cancelled' THEN
      '❌ Olá, ' || NEW.full_name || '! Infelizmente sua acomodação para a viagem "' || COALESCE(v_trip_title, 'sua viagem') || '" foi *cancelada*. '
      || CASE WHEN NEW.accommodation_notes IS NOT NULL THEN 'Motivo: ' || NEW.accommodation_notes ELSE 'Entre em contato com a agência para mais informações.' END

    WHEN NEW.accommodation_status = 'no_show' THEN
      '⚠️ Olá! Registramos um *no-show* para ' || NEW.full_name || ' na viagem "' || COALESCE(v_trip_title, 'sua viagem') || '". Caso seja um engano, entre em contato imediatamente.'

    ELSE
      '📋 Olá, ' || NEW.full_name || '! O status da sua acomodação para a viagem "' || COALESCE(v_trip_title, 'sua viagem') || '" mudou de *' || v_old_label || '* para *' || v_status_label || '*.'
  END;

  -- Atualizar timestamp da mudança
  NEW.accommodation_updated_at := now();

  -- Inserir mensagem outbound → o trigger whatsapp_sender_trigger em omnichannel_messages 
  -- vai pegar e processar automaticamente
  INSERT INTO public.omnichannel_messages (
    agency_id,
    lead_id,
    channel,
    direction,
    status,
    content
  ) VALUES (
    v_agency_id,
    v_lead_id,
    'whatsapp',
    'outbound',
    'pending',
    v_message
  );

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Nunca bloquear o UPDATE por falha na notificação
  RAISE WARNING '[trigger_reaccommodation_whatsapp] Erro ao inserir mensagem WhatsApp: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Remover trigger anterior (idempotente) e recriar
DROP TRIGGER IF EXISTS trg_reaccommodation_whatsapp ON public.trip_passengers;

CREATE TRIGGER trg_reaccommodation_whatsapp
  BEFORE UPDATE ON public.trip_passengers
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_reaccommodation_whatsapp();

COMMENT ON FUNCTION public.trigger_reaccommodation_whatsapp() IS
  'Envia notificação WhatsApp automática quando o accommodation_status de um passageiro muda. '
  'Suporta transições: pending → confirmed, reallocated, cancelled, no_show. '
  'Depende do trigger whatsapp_sender_trigger em omnichannel_messages para despacho real.';

-- =============================================================================
-- FUNÇÃO BÔNUS: trigger_trip_passenger_status_whatsapp
-- Disparo: AFTER UPDATE ON trip_passengers WHERE status IS DISTINCT FROM old.status
-- Notifica quando o STATUS GERAL do passageiro muda (confirmed/cancelled)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trigger_trip_passenger_status_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id   uuid;
  v_trip_title text;
  v_message    text;
BEGIN
  -- Processar apenas mudanças reais de status (não accommodation_status)
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Notificar apenas em transições relevantes
  IF NEW.status NOT IN ('confirmed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  -- Obter título da viagem
  SELECT title INTO v_trip_title
    FROM public.trips
   WHERE id = NEW.trip_id;

  -- Resolver lead_id via função auxiliar existente
  v_lead_id := public.get_lead_id_for_whatsapp(NEW.agency_id, NEW.trip_id, NEW.client_id);

  IF v_lead_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Montar mensagem por status
  v_message := CASE NEW.status
    WHEN 'confirmed' THEN
      '🎉 Olá, ' || NEW.full_name || '! Sua participação na viagem "' || COALESCE(v_trip_title, 'sua viagem') || '" foi *confirmada*! Aguarde os próximos comunicados com detalhes de embarque.'
    WHEN 'cancelled' THEN
      '😔 Olá, ' || NEW.full_name || '! Sua inscrição na viagem "' || COALESCE(v_trip_title, 'sua viagem') || '" foi *cancelada*. Entre em contato com a agência para informações sobre reembolso.'
    ELSE ''
  END;

  IF v_message = '' THEN RETURN NEW; END IF;

  -- Inserir mensagem outbound → o trigger whatsapp_sender_trigger vai processar
  INSERT INTO public.omnichannel_messages (
    agency_id,
    lead_id,
    channel,
    direction,
    status,
    content
  ) VALUES (
    NEW.agency_id,
    v_lead_id,
    'whatsapp',
    'outbound',
    'pending',
    v_message
  );

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[trigger_trip_passenger_status_whatsapp] Erro: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Remover trigger anterior (idempotente) e recriar
DROP TRIGGER IF EXISTS trg_trip_passenger_status_whatsapp ON public.trip_passengers;

CREATE TRIGGER trg_trip_passenger_status_whatsapp
  AFTER UPDATE ON public.trip_passengers
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION public.trigger_trip_passenger_status_whatsapp();

COMMENT ON FUNCTION public.trigger_trip_passenger_status_whatsapp() IS
  'Envia notificação WhatsApp quando o status geral de um passageiro muda para confirmed ou cancelled. '
  'Complementa o trigger de accommodation_status.';
