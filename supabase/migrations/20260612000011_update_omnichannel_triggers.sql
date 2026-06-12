-- Migration: 20260612000011_update_omnichannel_triggers.sql
-- Descrição: Atualiza os gatilhos (Webhooks) de Edge Functions com o project_ref e service_role_key reais.

-- 1. Gatilho: whatsapp-sender
CREATE OR REPLACE FUNCTION public.trigger_whatsapp_sender()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.direction = 'outbound' AND NEW.status = 'pending' THEN
    PERFORM net.http_post(
      url := 'https://esmppoxxnyiscidzsjvy.supabase.co/functions/v1/whatsapp-sender',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbXBwb3h4bnlpc2NpZHpzanZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI1Mzg0OCwiZXhwIjoyMDk2ODI5ODQ4fQ.4fKEXQ_ahfmAPep8sXyyYa5gp9uit39bfOJiwPJ1IkQ'
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


-- 2. Gatilho: ai-message-processor
CREATE OR REPLACE FUNCTION public.trigger_ai_message_processor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.direction = 'inbound' THEN
    PERFORM net.http_post(
      url := 'https://esmppoxxnyiscidzsjvy.supabase.co/functions/v1/ai-message-processor',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbXBwb3h4bnlpc2NpZHpzanZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI1Mzg0OCwiZXhwIjoyMDk2ODI5ODQ4fQ.4fKEXQ_ahfmAPep8sXyyYa5gp9uit39bfOJiwPJ1IkQ'
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


-- 3. Gatilho: meta-capi-sync
CREATE OR REPLACE FUNCTION public.trigger_meta_capi_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'converted' AND (OLD.status IS DISTINCT FROM 'converted') THEN
    PERFORM net.http_post(
      url := 'https://esmppoxxnyiscidzsjvy.supabase.co/functions/v1/meta-capi-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbXBwb3h4bnlpc2NpZHpzanZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI1Mzg0OCwiZXhwIjoyMDk2ODI5ODQ4fQ.4fKEXQ_ahfmAPep8sXyyYa5gp9uit39bfOJiwPJ1IkQ'
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
