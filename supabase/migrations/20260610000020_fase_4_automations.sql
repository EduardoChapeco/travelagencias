-- ==============================================================================
-- FASE 4: AUTOMAÇÕES E NOTIFICAÇÕES REALTIME
-- ==============================================================================

-- 1. Blog: Lógica de Visibilidade (Agendados)
-- A política "bp public read" atual permite 'published'. Vamos garantir que 'scheduled' e 'published' 
-- só apareçam se published_at <= now()
DROP POLICY IF EXISTS "bp public read" ON public.blog_posts;
CREATE POLICY "bp public read" ON public.blog_posts 
  FOR SELECT TO anon 
  USING (
    (status = 'published' AND (published_at IS NULL OR published_at <= now())) OR
    (status = 'scheduled' AND published_at <= now())
  );

-- Permitir aos admins/users da agência continuarem vendo tudo
DROP POLICY IF EXISTS "bp member read" ON public.blog_posts;
CREATE POLICY "bp member read" ON public.blog_posts 
  FOR SELECT TO authenticated 
  USING (
    (status = 'published' AND (published_at IS NULL OR published_at <= now())) OR
    (status = 'scheduled' AND published_at <= now()) OR
    public.is_agency_member(auth.uid(), agency_id)
  );

-- 2. Tabela de Notificações In-App (Realtime)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = agência inteira
  title text NOT NULL,
  message text NOT NULL,
  link_url text,
  icon text DEFAULT 'bell', -- bell, calendar, alert, success
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notifications viewable by recipient or agency admins" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR 
    (user_id IS NULL AND public.is_agency_member(auth.uid(), agency_id))
  );

CREATE POLICY "Notifications mark as read by recipient" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (user_id IS NULL AND public.is_agency_member(auth.uid(), agency_id)));

CREATE POLICY "Notifications insertable by triggers" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

-- Triggers de notificação úteis (Ex: Novo Ticket de Suporte para a Agência)
CREATE OR REPLACE FUNCTION public.notify_new_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (agency_id, title, message, link_url, icon)
  VALUES (
    NEW.agency_id, 
    'Novo Ticket: ' || NEW.title, 
    'O cliente ' || COALESCE((SELECT full_name FROM clients WHERE id = NEW.client_id), 'Desconhecido') || ' abriu um ticket.', 
    '/agency/' || (SELECT slug FROM agencies WHERE id = NEW.agency_id) || '/support',
    'alert'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_ticket ON public.support_tickets;
CREATE TRIGGER trg_notify_new_ticket
AFTER INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_ticket();

-- Trigger para nova RFP Corporativa B2B
CREATE OR REPLACE FUNCTION public.notify_new_rfp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (agency_id, title, message, link_url, icon)
  VALUES (
    NEW.agency_id, 
    'Nova Requisição Corporativa B2B', 
    'Uma RFP foi criada para ' || NEW.destination || ' no valor de ' || COALESCE(NEW.budget::text, 'Sob Consulta'), 
    '/agency/' || (SELECT slug FROM agencies WHERE id = NEW.agency_id) || '/corporate',
    'briefcase'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_rfp ON public.corporate_rfps;
CREATE TRIGGER trg_notify_new_rfp
AFTER INSERT ON public.corporate_rfps
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_rfp();
