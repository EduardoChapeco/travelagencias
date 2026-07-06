-- Migration: 20260900000006_ai_processor_umbler_migration.sql
-- Descrição: Redireciona o trigger da Edge Function ai-message-processor da tabela legada omnichannel_messages para a nova tabela messages do Umbler Inbox.

-- 1. Dropar trigger antigo associado à tabela legada omnichannel_messages
DROP TRIGGER IF EXISTS omnichannel_messages_ai_trigger ON public.omnichannel_messages;

-- 2. Atualizar ou recriar a função de trigger para escutar a nova tabela messages
CREATE OR REPLACE FUNCTION public.trigger_ai_message_processor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead_id uuid;
  v_client_id uuid;
BEGIN
  -- Apenas dispara para mensagens recebidas do cliente (inbound)
  IF NEW.direction = 'inbound' THEN
    -- Buscar o lead_id ou client_id associado ao contato da conversa
    SELECT c.lead_id, c.client_id INTO v_lead_id, v_client_id
    FROM public.conversations conv
    JOIN public.contacts c ON c.id = conv.contact_id
    WHERE conv.id = NEW.conversation_id;

    -- Executar o processador apenas se o contato estiver vinculado a um lead ativo do CRM
    IF v_lead_id IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://esmppoxxnyiscidzsjvy.supabase.co/functions/v1/ai-message-processor',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbXBwb3h4bnlpc2NpZHpzanZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI1Mzg0OCwiZXhwIjoyMDk2ODI5ODQ4fQ.4fKEXQ_ahfmAPep8sXyyYa5gp9uit39bfOJiwPJ1IkQ'
        ),
        body := jsonb_build_object(
          'type', 'INSERT',
          'table', 'messages',
          'schema', 'public',
          'record', jsonb_build_object(
            'id', NEW.id,
            'conversation_id', NEW.conversation_id,
            'agency_id', NEW.agency_id,
            'direction', NEW.direction,
            'body', NEW.body,
            'lead_id', v_lead_id,
            'client_id', v_client_id,
            'created_at', NEW.created_at
          )
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Criar trigger na nova tabela messages
DROP TRIGGER IF EXISTS trg_ai_message_processor ON public.messages;
CREATE TRIGGER trg_ai_message_processor
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.trigger_ai_message_processor();
