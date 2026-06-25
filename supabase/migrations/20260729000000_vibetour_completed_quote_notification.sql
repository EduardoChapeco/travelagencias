-- Migration: 20260729000000_vibetour_completed_quote_notification.sql
-- Description: Disparar notificação WhatsApp ao cliente/lead quando a cotação é concluída

CREATE OR REPLACE FUNCTION public.trigger_quote_completed_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id      uuid;
  v_destination  text;
  v_agency_id    uuid;
  v_message      text;
  v_intent       jsonb;
BEGIN
  -- Processar apenas quando o status muda para 'completed'
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'completed' THEN
    v_lead_id   := NEW.lead_id;
    v_agency_id := NEW.agency_id;
    v_intent    := NEW.normalized_intent;

    -- Sem lead_id, não há sessão/destino para enviar WhatsApp
    IF v_lead_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Extrair o nome ou código do destino a partir da intenção da cotação
    IF v_intent IS NOT NULL AND jsonb_typeof(v_intent->'destinations') = 'array' AND jsonb_array_length(v_intent->'destinations') > 0 THEN
      v_destination := COALESCE(
        v_intent->'destinations'->0->>'name',
        v_intent->'destinations'->0->>'code',
        'seu destino'
      );
    ELSE
      v_destination := 'seu destino';
    END IF;

    -- Montar mensagem informativa premium para o cliente
    v_message := '✈️ Olá! Temos excelentes notícias: o planejamento e a cotação multicenários para a sua viagem a *' 
                 || v_destination || '* foram concluídos com sucesso! Nossa equipe comparou voos, hotéis e conexões para desenhar a melhor logística. Fale com seu agente para comparar os cenários ou acesse o seu portal de cliente.';

    -- Inserir mensagem outbound para que o microsserviço de WhatsApp processe o envio
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
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Evitar que falhas na fila de notificações abortem a transição de status da cotação
  RAISE WARNING '[trigger_quote_completed_whatsapp] Falha ao enfileirar mensagem de notificação: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Criar trigger de disparo após atualização de status na tabela quote_requests
DROP TRIGGER IF EXISTS trg_quote_completed_whatsapp ON public.quote_requests;

CREATE TRIGGER trg_quote_completed_whatsapp
  AFTER UPDATE ON public.quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_quote_completed_whatsapp();

COMMENT ON FUNCTION public.trigger_quote_completed_whatsapp() IS
  'Envia notificação WhatsApp automática ao cliente quando a cotação muda de status para completed.';
