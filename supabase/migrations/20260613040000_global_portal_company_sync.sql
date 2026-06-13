-- Migration: 20260613040000_global_portal_company_sync.sql
-- Unificação Portal + Minha Empresa + Google Business + Omnichannel

-- ─────────────────────────────────────────────────────────────────
-- 1. company_profiles — novos campos
-- ─────────────────────────────────────────────────────────────────

-- Tema e configurações do portal público (cores, seções visíveis, analytics)
ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS portal_theme jsonb DEFAULT '{}' NOT NULL,
  ADD COLUMN IF NOT EXISTS google_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS google_review_url text,
  ADD COLUMN IF NOT EXISTS tiktok text;

COMMENT ON COLUMN public.company_profiles.portal_theme IS
  'Configurações visuais e de conteúdo do portal público: header_style, visible_sections, analytics_id, footer_text';

COMMENT ON COLUMN public.company_profiles.google_synced_at IS
  'Última vez que os dados foram sincronizados com o Google Business Profile';

-- ─────────────────────────────────────────────────────────────────
-- 2. blog_posts — rastreio de publicações no Google Business
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS google_posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS google_post_id text;

COMMENT ON COLUMN public.blog_posts.google_posted_at IS
  'Data/hora em que o post foi publicado no Google Business Profile';

COMMENT ON COLUMN public.blog_posts.google_post_id IS
  'ID do post no Google Business Profile para gerenciamento/deleção futura';

-- ─────────────────────────────────────────────────────────────────
-- 3. portal_pages — ordenação manual
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.portal_pages
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0 NOT NULL;

-- ─────────────────────────────────────────────────────────────────
-- 4. omnichannel_sessions — campo de nome do contato e canal
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.omnichannel_sessions
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_avatar_url text,
  ADD COLUMN IF NOT EXISTS unread_count integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_message_preview text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

COMMENT ON COLUMN public.omnichannel_sessions.unread_count IS
  'Número de mensagens não lidas pelo agente';

COMMENT ON COLUMN public.omnichannel_sessions.last_message_preview IS
  'Preview da última mensagem para exibição no kanban de conversas';

-- ─────────────────────────────────────────────────────────────────
-- 5. Índices de performance
-- ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_omnichannel_sessions_agency_last_msg
  ON public.omnichannel_sessions(agency_id, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_portal_pages_sort
  ON public.portal_pages(agency_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_cms_posts_agency_published
  ON public.cms_posts(agency_id, is_published, published_at DESC NULLS LAST);

-- ─────────────────────────────────────────────────────────────────
-- 6. Function: Atualizar last_message_at e preview na sessão
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_session_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.omnichannel_sessions
  SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 120),
    unread_count = CASE
      WHEN NEW.direction = 'inbound' THEN unread_count + 1
      ELSE unread_count
    END
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_session_last_message ON public.omnichannel_messages;
CREATE TRIGGER trg_update_session_last_message
  AFTER INSERT ON public.omnichannel_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_session_last_message();

-- ─────────────────────────────────────────────────────────────────
-- 7. RPC: mark_session_read — zerar unread_count de uma sessão
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.mark_session_read(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar acesso via membership
  IF NOT EXISTS (
    SELECT 1
    FROM public.omnichannel_sessions s
    JOIN public.agency_members m ON m.agency_id = s.agency_id
    WHERE s.id = p_session_id AND m.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  UPDATE public.omnichannel_sessions
  SET unread_count = 0
  WHERE id = p_session_id;
END;
$$;
