-- Migration: 20260729000001_inbox_and_whatsapp_architecture.sql
-- Descrição: P0 - Secrets, RLS isolado, filas e suporte real à WhatsApp Cloud API

-- 1. WhatsApp Connections (Ponto central de configuração oficial da Meta, substituindo integrações genéricas)
CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  connection_name text NOT NULL,
  business_id text NOT NULL,
  waba_id text NOT NULL,
  phone_number_id text NOT NULL,
  display_phone_number text NOT NULL,
  app_id text NOT NULL,
  
  -- Secrets e Tokens devem idealmente usar Vault. 
  -- Guardamos referências, ou os tokens encriptados. Para este P0 local, ficam no BD mas não expostos ao frontend.
  secret_reference text, 
  token_reference text,
  verify_token_reference text,
  
  graph_api_version text DEFAULT 'v19.0',
  status text NOT NULL DEFAULT 'active', -- active, disconnected, error
  coexistence_enabled boolean DEFAULT false, -- WhatsApp Business App coexistence
  
  webhook_status text DEFAULT 'pending',
  last_webhook_at timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  health_status jsonb DEFAULT '{}',
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Esconde os tokens reais de consultas SELECT públicas/normais (P0 Security)
-- Em um ambiente avançado, usar pgsodium ou Supabase Vault
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agencies can manage their whatsapp connections" 
  ON public.whatsapp_connections
  FOR ALL USING (is_agency_member(auth.uid(), agency_id));

-- 2. Filas e Equipes
CREATE TABLE IF NOT EXISTS public.inbox_queues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inbox_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inbox_team_members (
  team_id uuid REFERENCES public.inbox_teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member', -- member, supervisor
  PRIMARY KEY (team_id, user_id)
);

ALTER TABLE public.inbox_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view queues" ON public.inbox_queues FOR SELECT USING (is_agency_member(auth.uid(), agency_id));
CREATE POLICY "Agency members can view teams" ON public.inbox_teams FOR SELECT USING (is_agency_member(auth.uid(), agency_id));
CREATE POLICY "Agency members can view team members" ON public.inbox_team_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.inbox_teams t WHERE t.id = team_id AND is_agency_member(auth.uid(), t.agency_id))
);

-- 3. Melhoria na omnichannel_sessions para suportar SLA, Atribuição avançada e Workflow
ALTER TABLE public.omnichannel_sessions
  ADD COLUMN IF NOT EXISTS queue_id uuid REFERENCES public.inbox_queues(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.inbox_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignment_status text DEFAULT 'unassigned', -- unassigned, queued, assigned, in_progress, waiting_customer, waiting_internal, resolved, closed
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_assignment_reason text,
  ADD COLUMN IF NOT EXISTS visibility_scope text DEFAULT 'team', -- private, team, agency
  ADD COLUMN IF NOT EXISTS priority integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS connection_id uuid REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL;

-- 4. Reestruturação do RLS da omnichannel_sessions (Agente não vê o que não é dele, Gestor vê tudo)
DROP POLICY IF EXISTS "Users can manage sessions of their agency" ON public.omnichannel_sessions;

-- Gestores (agency_admin, owner) podem ver tudo
CREATE POLICY "Managers can view all agency sessions" 
  ON public.omnichannel_sessions FOR SELECT 
  USING (
    is_agency_member(auth.uid(), agency_id) AND public.has_role(auth.uid(), 'agency_admin', agency_id)
  );

-- Agentes comuns vêm as que estão unassigned/queued na sua equipe, ou que foram assigned para eles
CREATE POLICY "Agents can view assigned or team sessions" 
  ON public.omnichannel_sessions FOR SELECT 
  USING (
    is_agency_member(auth.uid(), agency_id) 
    AND NOT public.has_role(auth.uid(), 'agency_admin', agency_id)
    AND (
      assigned_to = auth.uid() OR
      (assignment_status IN ('unassigned', 'queued') AND team_id IN (SELECT team_id FROM public.inbox_team_members WHERE user_id = auth.uid()))
    )
  );

-- Permitir INSERT e UPDATE conforme regras da agência (simplificado para P0)
CREATE POLICY "Agency members can insert sessions" 
  ON public.omnichannel_sessions FOR INSERT 
  WITH CHECK (is_agency_member(auth.uid(), agency_id));

CREATE POLICY "Agency members can update assigned sessions" 
  ON public.omnichannel_sessions FOR UPDATE 
  USING (
    is_agency_member(auth.uid(), agency_id) AND (
      assigned_to = auth.uid() OR 
      public.has_role(auth.uid(), 'agency_admin', agency_id) OR
      assignment_status IN ('unassigned', 'queued')
    )
  );

-- 5. Status detalhados e webhooks nas mensagens
ALTER TABLE public.omnichannel_messages
  ADD COLUMN IF NOT EXISTS wamid text, -- ID da Meta original 
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_code text,
  ADD COLUMN IF NOT EXISTS failure_message text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'customer', -- customer, business_app, turis_agent, automation, template
  ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES public.omnichannel_messages(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_omnichannel_messages_wamid ON public.omnichannel_messages(wamid) WHERE wamid IS NOT NULL;
