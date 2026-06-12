-- Migration: 20260612000009_omnichannel_triggers.sql
-- Descrição: Gatilhos (Webhooks) para disparar Edge Functions via pg_net

-- Ativar extensão pg_net
CREATE EXTENSION IF NOT EXISTS pg_net;

-- NOTA: O Supabase recomenda criar Webhooks diretamente pelo painel (Database -> Webhooks)
-- pois ele já gerencia as chaves de API e URLs automaticamente. 
-- No entanto, caso prefira fazer via SQL, a estrutura abaixo faz o mesmo.
-- IMPORTANTE: Substitua 'SUA_URL_DO_SUPABASE' e 'SUA_SERVICE_ROLE_KEY' pelos seus dados reais 
-- encontrados em Project Settings -> API.

-- 1. Gatilho: whatsapp-sender (Dispara quando há um INSERT outbound na tabela de mensagens)
CREATE OR REPLACE FUNCTION public.trigger_whatsapp_sender()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Apenas processar mensagens do tipo outbound que estejam pendentes
  IF NEW.direction = 'outbound' AND NEW.status = 'pending' THEN
    PERFORM net.http_post(
      url := 'https://ezfgelkamreguhapcgfm.supabase.co/functions/v1/whatsapp-sender',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer SUA_SERVICE_ROLE_KEY'
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'omnichannel_messages',
        'schema', 'public',
        'record', row_to_json(NEW)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS whatsapp_sender_trigger ON public.omnichannel_messages;
CREATE TRIGGER whatsapp_sender_trigger
  AFTER INSERT ON public.omnichannel_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_whatsapp_sender();


-- 2. Gatilho: ai-message-processor (Dispara quando o cliente envia uma mensagem inbound)
CREATE OR REPLACE FUNCTION public.trigger_ai_message_processor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Apenas mensagens recebidas (inbound) ativam a IA
  IF NEW.direction = 'inbound' THEN
    PERFORM net.http_post(
      url := 'https://ezfgelkamreguhapcgfm.supabase.co/functions/v1/ai-message-processor',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer SUA_SERVICE_ROLE_KEY'
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'omnichannel_messages',
        'schema', 'public',
        'record', row_to_json(NEW)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ai_message_processor_trigger ON public.omnichannel_messages;
CREATE TRIGGER ai_message_processor_trigger
  AFTER INSERT ON public.omnichannel_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_ai_message_processor();


-- 3. Gatilho: meta-capi-sync (Dispara quando uma proposta é aprovada)
CREATE OR REPLACE FUNCTION public.trigger_meta_capi_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se a proposta mudou para 'converted', dispara a Edge Function
  IF NEW.status = 'converted' AND (OLD.status IS DISTINCT FROM 'converted') THEN
    PERFORM net.http_post(
      url := 'https://ezfgelkamreguhapcgfm.supabase.co/functions/v1/meta-capi-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer SUA_SERVICE_ROLE_KEY'
      ),
      body := jsonb_build_object(
        'type', 'UPDATE',
        'table', 'proposals',
        'schema', 'public',
        'record', row_to_json(NEW),
        'old_record', row_to_json(OLD)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS meta_capi_sync_trigger ON public.proposals;
CREATE TRIGGER meta_capi_sync_trigger
  AFTER UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_meta_capi_sync();
