-- =============================================================================
-- Migration: 20260627000000_omnichannel_email_triggers.sql
-- Descrição: Triggers de Email Omnichannel
--
-- Objetivos:
--   1. Disparar a Edge Function `gmail-send` após INSERT em `ticket_messages`
--      quando o sender é 'client' — notificando a agência sobre nova mensagem.
--   2. Disparar `gmail-send` quando um `support_ticket` com priority='urgent'
--      é inserido — alertando a agência imediatamente.
--
-- Dependências:
--   - Extensão pg_net (deve estar ativa — já habilitada em 20260612000009)
--   - Edge Function `gmail-send` em supabase/functions/gmail-send/index.ts
--   - Tabela `ticket_messages` (sender: 'agency' | 'client' | 'system')
--   - Tabela `support_tickets` (priority: 'low'|'medium'|'high'|'urgent')
--   - Tabela `clients` (email)
--   - Tabela `agency_members` (para buscar email do agente responsável)
-- =============================================================================

-- Garantir que pg_net está ativo (idempotente)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================================================
-- FUNÇÃO 1: Notifica a agência quando o CLIENTE envia mensagem no ticket
-- Disparo: AFTER INSERT ON ticket_messages WHERE sender = 'client'
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trigger_ticket_message_email_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket         public.support_tickets%ROWTYPE;
  v_client_email   text;
  v_agency_email   text;
  v_agency_name    text;
  v_subject        text;
  v_body           text;
  v_supabase_url   text := 'https://esmppoxxnyiscidzsjvy.supabase.co';
  v_service_key    text := current_setting('app.service_role_key', true);
BEGIN
  -- Somente processar mensagens enviadas pelo cliente (inbound)
  IF NEW.sender <> 'client' OR NEW.is_internal = true THEN
    RETURN NEW;
  END IF;

  -- Carregar ticket completo
  SELECT * INTO v_ticket
    FROM public.support_tickets
   WHERE id = NEW.ticket_id;

  -- Sem ticket? Encerrar silenciosamente
  IF v_ticket.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar e-mail do cliente (via clients)
  SELECT c.email INTO v_client_email
    FROM public.clients c
   WHERE c.id = v_ticket.client_id
   LIMIT 1;

  -- Buscar e-mail da agência (via agency_members → responsável ou owner)
  SELECT u.email INTO v_agency_email
    FROM public.agency_members am
    JOIN auth.users u ON u.id = am.user_id
   WHERE am.agency_id = v_ticket.agency_id
     AND am.role IN ('agency_admin', 'agency_owner')
   ORDER BY am.created_at ASC
   LIMIT 1;

  -- Buscar nome da agência
  SELECT a.name INTO v_agency_name
    FROM public.agencies a
   WHERE a.id = v_ticket.agency_id;

  -- Sem email da agência? Não há para onde notificar
  IF v_agency_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Montar subject e body do email
  v_subject := format('[%s] Nova mensagem no chamado %s: %s',
    COALESCE(v_agency_name, 'Turis'),
    v_ticket.code,
    v_ticket.title
  );

  v_body := format(
    E'Você recebeu uma nova mensagem do cliente no chamado %s.\n\n'
    || E'Chamado: %s\n'
    || E'Prioridade: %s\n'
    || E'Tipo: %s\n\n'
    || E'Mensagem:\n%s\n\n'
    || E'Acesse o painel Turis para responder.',
    v_ticket.code,
    v_ticket.title,
    v_ticket.priority,
    v_ticket.type,
    LEFT(NEW.content, 500)
  );

  -- Chamar Edge Function gmail-send de forma assíncrona via pg_net
  PERFORM net.http_post(
    url     := v_supabase_url || '/functions/v1/gmail-send',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbXBwb3h4bnlpc2NpZHpzanZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI1Mzg0OCwiZXhwIjoyMDk2ODI5ODQ4fQ.4fKEXQ_ahfmAPep8sXyyYa5gp9uit39bfOJiwPJ1IkQ'
    ),
    body    := jsonb_build_object(
      'ticket_id', v_ticket.id::text,
      'agency_id', v_ticket.agency_id::text,
      'to',        v_agency_email,
      'subject',   v_subject,
      'text',      v_body
    )
  );

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Nunca bloquear o INSERT por falha no email
  RAISE WARNING '[trigger_ticket_message_email_notify] Erro ao disparar gmail-send: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Remover trigger anterior (idempotente) e recriar
DROP TRIGGER IF EXISTS trg_ticket_message_email_notify ON public.ticket_messages;

CREATE TRIGGER trg_ticket_message_email_notify
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_ticket_message_email_notify();

COMMENT ON FUNCTION public.trigger_ticket_message_email_notify() IS
  'Dispara gmail-send quando o cliente envia mensagem em um ticket de suporte. '
  'Notifica o e-mail do administrador da agência com o conteúdo da mensagem.';

-- =============================================================================
-- FUNÇÃO 2: Alerta de Ticket URGENTE — notifica agência na criação
-- Disparo: AFTER INSERT ON support_tickets WHERE priority = 'urgent'
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trigger_urgent_ticket_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_email text;
  v_agency_name  text;
  v_client_name  text;
  v_subject      text;
  v_body         text;
  v_supabase_url text := 'https://esmppoxxnyiscidzsjvy.supabase.co';
BEGIN
  -- Somente disparar para tickets marcados como URGENTES
  IF NEW.priority <> 'urgent' THEN
    RETURN NEW;
  END IF;

  -- Buscar e-mail e nome da agência (admin/owner)
  SELECT u.email INTO v_agency_email
    FROM public.agency_members am
    JOIN auth.users u ON u.id = am.user_id
   WHERE am.agency_id = NEW.agency_id
     AND am.role IN ('agency_admin', 'agency_owner')
   ORDER BY am.created_at ASC
   LIMIT 1;

  SELECT a.name INTO v_agency_name
    FROM public.agencies a
   WHERE a.id = NEW.agency_id;

  -- Buscar nome do cliente vinculado ao ticket
  SELECT c.full_name INTO v_client_name
    FROM public.clients c
   WHERE c.id = NEW.client_id
   LIMIT 1;

  -- Sem agência ou email? Encerrar silenciosamente
  IF v_agency_email IS NULL THEN
    RETURN NEW;
  END IF;

  v_subject := format('[URGENTE] %s — Novo chamado crítico: %s',
    COALESCE(v_agency_name, 'Turis'),
    NEW.title
  );

  v_body := format(
    E'⚠ CHAMADO URGENTE ABERTO\n\n'
    || E'Código: %s\n'
    || E'Título: %s\n'
    || E'Tipo: %s\n'
    || E'Prioridade: URGENTE\n'
    || E'Cliente: %s\n\n'
    || E'Descrição:\n%s\n\n'
    || E'Acesse o painel Turis imediatamente para atender este chamado.',
    NEW.code,
    NEW.title,
    NEW.type,
    COALESCE(v_client_name, 'Não identificado'),
    LEFT(COALESCE(NEW.description, '(sem descrição)'), 500)
  );

  -- Chamar Edge Function gmail-send de forma assíncrona via pg_net
  PERFORM net.http_post(
    url     := v_supabase_url || '/functions/v1/gmail-send',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbXBwb3h4bnlpc2NpZHpzanZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI1Mzg0OCwiZXhwIjoyMDk2ODI5ODQ4fQ.4fKEXQ_ahfmAPep8sXyyYa5gp9uit39bfOJiwPJ1IkQ'
    ),
    body    := jsonb_build_object(
      'ticket_id', NEW.id::text,
      'agency_id', NEW.agency_id::text,
      'to',        v_agency_email,
      'subject',   v_subject,
      'text',      v_body
    )
  );

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Nunca bloquear o INSERT por falha no email
  RAISE WARNING '[trigger_urgent_ticket_alert] Erro ao disparar gmail-send: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Remover trigger anterior (idempotente) e recriar
DROP TRIGGER IF EXISTS trg_urgent_ticket_alert ON public.support_tickets;

CREATE TRIGGER trg_urgent_ticket_alert
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_urgent_ticket_alert();

COMMENT ON FUNCTION public.trigger_urgent_ticket_alert() IS
  'Dispara gmail-send quando um ticket de prioridade URGENTE é criado. '
  'Alerta o administrador da agência com detalhes completos do chamado.';

-- =============================================================================
-- FUNÇÃO 3: Notificação de resposta da AGÊNCIA ao CLIENTE
-- Disparo: AFTER INSERT ON ticket_messages WHERE sender = 'agency'
-- Envia email de resposta ao cliente quando a agência responde um ticket
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trigger_ticket_agency_reply_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket       public.support_tickets%ROWTYPE;
  v_client_email text;
  v_agency_name  text;
  v_subject      text;
  v_body         text;
  v_supabase_url text := 'https://esmppoxxnyiscidzsjvy.supabase.co';
BEGIN
  -- Somente mensagens enviadas pela agência (não internas)
  IF NEW.sender <> 'agency' OR NEW.is_internal = true THEN
    RETURN NEW;
  END IF;

  -- Carregar ticket
  SELECT * INTO v_ticket
    FROM public.support_tickets
   WHERE id = NEW.ticket_id;

  IF v_ticket.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar email do cliente
  SELECT c.email INTO v_client_email
    FROM public.clients c
   WHERE c.id = v_ticket.client_id
   LIMIT 1;

  -- Sem email do cliente? Não há para onde notificar
  IF v_client_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar nome da agência
  SELECT a.name INTO v_agency_name
    FROM public.agencies a
   WHERE a.id = v_ticket.agency_id;

  -- Montar email de resposta ao cliente
  v_subject := format('Re: [%s] %s',
    v_ticket.code,
    v_ticket.title
  );

  v_body := format(
    E'Olá!\n\n'
    || E'A equipe de %s respondeu ao seu chamado %s:\n\n'
    || E'"%s"\n\n'
    || E'Para continuar a conversa ou acompanhar seu chamado, entre em contato com a agência.\n\n'
    || E'Atenciosamente,\n%s',
    COALESCE(v_agency_name, 'Turis'),
    v_ticket.code,
    LEFT(NEW.content, 500),
    COALESCE(v_agency_name, 'Equipe Turis')
  );

  -- Disparar gmail-send para o CLIENTE
  PERFORM net.http_post(
    url     := v_supabase_url || '/functions/v1/gmail-send',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbXBwb3h4bnlpc2NpZHpzanZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI1Mzg0OCwiZXhwIjoyMDk2ODI5ODQ4fQ.4fKEXQ_ahfmAPep8sXyyYa5gp9uit39bfOJiwPJ1IkQ'
    ),
    body    := jsonb_build_object(
      'ticket_id', v_ticket.id::text,
      'agency_id', v_ticket.agency_id::text,
      'to',        v_client_email,
      'subject',   v_subject,
      'text',      v_body
    )
  );

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[trigger_ticket_agency_reply_email] Erro ao disparar gmail-send: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Remover trigger anterior (idempotente) e recriar
DROP TRIGGER IF EXISTS trg_ticket_agency_reply_email ON public.ticket_messages;

CREATE TRIGGER trg_ticket_agency_reply_email
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_ticket_agency_reply_email();

COMMENT ON FUNCTION public.trigger_ticket_agency_reply_email() IS
  'Dispara gmail-send quando a agência responde um ticket. '
  'Envia email de resposta ao cliente com o conteúdo da mensagem.';
