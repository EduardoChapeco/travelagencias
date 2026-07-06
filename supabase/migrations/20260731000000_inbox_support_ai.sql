-- =========================================================================
-- Turis — Modulo de Inbox, Rastreamento Inteligente e Suporte Avancado
-- =========================================================================

-- ─── 1. EXTENSIONS E SEQUENCES ───────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;
CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1000 INCREMENT 1;

-- ─── 2. CONTAS DE EMAIL (EMAIL_ACCOUNTS) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type      TEXT NOT NULL CHECK (account_type IN ('general', 'personal', 'module')),
  
  email_address     TEXT NOT NULL,
  display_name      TEXT,
  profile_picture   TEXT,
  purpose           TEXT,
  
  access_token_enc  TEXT NOT NULL,
  refresh_token_enc TEXT NOT NULL,
  token_expires_at  TIMESTAMPTZ NOT NULL,
  scopes            TEXT[] NOT NULL DEFAULT '{}',
  
  gmail_history_id  TEXT,
  pubsub_topic      TEXT,
  watch_expiry      TIMESTAMPTZ,
  
  status            TEXT DEFAULT 'active' CHECK (status IN ('active', 'disconnected', 'error', 'pending')),
  last_error        TEXT,
  last_sync_at      TIMESTAMPTZ,
  
  allowed_user_ids  UUID[],
  can_send          BOOL DEFAULT true,
  
  connected_by      UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(org_id, email_address)
);

CREATE TRIGGER email_accounts_updated_at BEFORE UPDATE ON public.email_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contas gerais visiveis para permitidos, pessoais pro dono" ON public.email_accounts FOR SELECT TO authenticated
  USING (
    org_id = public.get_my_agency_id()
    AND (
      public.has_role(auth.uid(), 'agency_admin', org_id)
      OR user_id = auth.uid()
      OR (account_type = 'general' AND (allowed_user_ids IS NULL OR auth.uid() = ANY(allowed_user_ids)))
    )
  );
CREATE POLICY "Contas podem ser criadas pelo admin ou pelo proprio usuario" ON public.email_accounts FOR INSERT TO authenticated
  WITH CHECK (
    org_id = public.get_my_agency_id()
    AND (
      public.has_role(auth.uid(), 'agency_admin', org_id)
      OR (account_type = 'personal' AND user_id = auth.uid())
    )
  );

-- ─── 3. REESTRUTURAÇÃO DO SUPPORT TICKETS ─────────────────────────────────
-- Deletando o codigo obsoleto e adicionando campos robustos de SLA, IA e Hashes
ALTER TABLE public.support_tickets DROP COLUMN IF EXISTS code CASCADE;
DROP SEQUENCE IF EXISTS public.support_tickets_code_seq;

ALTER TABLE public.support_tickets 
  ADD COLUMN IF NOT EXISTS ticket_hash TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_breached BOOL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sla_breached_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reported_by_email TEXT,
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS loc_codes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS flight_numbers TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS passenger_names TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cia_aerea TEXT,
  ADD COLUMN IF NOT EXISTS booking_refs TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS financial_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS internal_notes JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_deleted BOOL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Function para gerar hash unico (ex: SUP-20250115-K7X2)
CREATE OR REPLACE FUNCTION generate_ticket_hash() RETURNS TEXT AS $$
BEGIN
  RETURN 'SUP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 4));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_ticket_hash() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_hash IS NULL OR NEW.ticket_hash = '' THEN
    LOOP
      NEW.ticket_hash := generate_ticket_hash();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.support_tickets WHERE ticket_hash = NEW.ticket_hash);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_ticket_insert ON public.support_tickets;
CREATE TRIGGER before_ticket_insert BEFORE INSERT ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION set_ticket_hash();

-- Retropreencher tickets antigos que ficaram com hash nulo
UPDATE public.support_tickets SET ticket_hash = generate_ticket_hash() WHERE ticket_hash IS NULL;
ALTER TABLE public.support_tickets ALTER COLUMN ticket_hash SET NOT NULL;

-- ─── 4. EMAILS CENTRALIZADOS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.emails (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  email_account_id      UUID NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  
  gmail_message_id      TEXT NOT NULL UNIQUE,
  gmail_thread_id       TEXT NOT NULL,
  gmail_labels          TEXT[] DEFAULT '{}',
  
  subject               TEXT,
  snippet               TEXT,
  body_html             TEXT,
  body_text             TEXT,
  body_vector           VECTOR(768),
  
  from_email            TEXT NOT NULL,
  from_name             TEXT,
  to_emails             JSONB DEFAULT '[]',
  cc_emails             JSONB DEFAULT '[]',
  bcc_emails            JSONB DEFAULT '[]',
  reply_to              TEXT,
  
  sent_at               TIMESTAMPTZ,
  received_at           TIMESTAMPTZ,
  direction             TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  
  ai_category           TEXT,
  ai_confidence         FLOAT,
  ai_extracted_entities JSONB DEFAULT '{}',
  ai_summary            TEXT,
  ai_suggested_action   TEXT,
  ai_processed_at       TIMESTAMPTZ,
  
  linked_ticket_id      UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  linked_embarque_id    UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  linked_contact_id     UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  linked_task_id        UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  
  link_confidence       FLOAT,
  link_method           TEXT,
  link_verified         BOOL DEFAULT false,
  linked_at             TIMESTAMPTZ,
  linked_by             UUID REFERENCES auth.users(id),
  
  read_by               JSONB DEFAULT '{}',
  
  has_attachments       BOOL DEFAULT false,
  attachments_count     INT DEFAULT 0,
  
  is_deleted            BOOL DEFAULT false,
  deleted_at            TIMESTAMPTZ,
  deleted_by            UUID REFERENCES auth.users(id),
  
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emails_org ON public.emails(org_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_emails_thread ON public.emails(gmail_thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_vector ON public.emails USING ivfflat (body_vector vector_cosine_ops) WITH (lists = 100);

CREATE TRIGGER emails_updated_at BEFORE UPDATE ON public.emails FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Emails visiveis para agencia" ON public.emails FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid(), org_id));
CREATE POLICY "Emails update para agencia" ON public.emails FOR UPDATE TO authenticated USING (public.is_agency_member(auth.uid(), org_id));

-- ─── 5. EMAIL ATTACHMENTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id        UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  filename        TEXT NOT NULL,
  content_type    TEXT,
  size_bytes      INT,
  storage_path    TEXT,
  storage_bucket  TEXT,
  gmail_attach_id TEXT,
  is_downloaded   BOOL DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Attachments visiveis para agencia" ON public.email_attachments FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid(), org_id));

-- ─── 6. HISTÓRICO DE VÍNCULOS (CONCILIAÇÃO) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_link_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id        UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  old_ticket_id   UUID,
  old_embarque_id UUID,
  old_contact_id  UUID,
  old_task_id     UUID,
  old_method      TEXT,
  old_confidence  FLOAT,
  new_ticket_id   UUID,
  new_embarque_id UUID,
  new_contact_id  UUID,
  new_task_id     UUID,
  new_method      TEXT,
  corrected_by    UUID REFERENCES auth.users(id),
  reason          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.email_link_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "History visivel para agencia" ON public.email_link_history FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid(), org_id));

-- ─── 7. TIMELINE DE TICKETS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ticket_timeline (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  actor_id        UUID REFERENCES auth.users(id),
  actor_type      TEXT DEFAULT 'user',
  old_value       JSONB,
  new_value       JSONB,
  description     TEXT,
  email_id        UUID REFERENCES public.emails(id) ON DELETE SET NULL,
  attachments     JSONB DEFAULT '[]',
  is_internal     BOOL DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.ticket_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Timeline visivel para agencia" ON public.ticket_timeline FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid(), org_id));
CREATE POLICY "Timeline insere para agencia" ON public.ticket_timeline FOR INSERT TO authenticated WITH CHECK (public.is_agency_member(auth.uid(), org_id));

-- ─── 8. RASTREAMENTO EM EMBARQUES (TRIPS) ─────────────────────────────────
ALTER TABLE public.trips 
  ADD COLUMN IF NOT EXISTS tracking_hash TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS ticket_ids UUID[] DEFAULT '{}';

CREATE OR REPLACE FUNCTION generate_embarque_hash() RETURNS TEXT AS $$
BEGIN
  RETURN 'EMB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 4));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_embarque_hash() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_hash IS NULL OR NEW.tracking_hash = '' THEN
    LOOP
      NEW.tracking_hash := generate_embarque_hash();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.trips WHERE tracking_hash = NEW.tracking_hash);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_trip_insert ON public.trips;
CREATE TRIGGER before_trip_insert BEFORE INSERT ON public.trips FOR EACH ROW EXECUTE FUNCTION set_embarque_hash();

UPDATE public.trips SET tracking_hash = generate_embarque_hash() WHERE tracking_hash IS NULL;
ALTER TABLE public.trips ALTER COLUMN tracking_hash SET NOT NULL;
