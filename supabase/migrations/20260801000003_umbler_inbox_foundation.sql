-- Migration: 20260801000003_umbler_inbox_foundation.sql
-- Objetivo: Feature flags e tabelas core do Módulo Inbox Omnichannel

-- 1. ENUMS (Idempotentes)
DO $$ BEGIN CREATE TYPE public.conversation_status AS ENUM ('open', 'pending', 'snoozed', 'closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.message_direction AS ENUM ('inbound', 'outbound'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.message_status AS ENUM ('queued', 'sent', 'delivered', 'read', 'failed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.channel_type AS ENUM ('whatsapp', 'email', 'webchat'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. FEATURE FLAGS (Onda 0)
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text primary key,
  enabled boolean default false,
  agency_overrides jsonb default '{}'::jsonb
);

-- Habilita acesso de leitura autenticado para que a UI possa consumir as flags
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated users can read feature_flags" ON public.feature_flags 
  FOR SELECT TO authenticated USING (true);


-- 3. CHANNELS (Onda 1)
CREATE TABLE IF NOT EXISTS public.channels (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  type public.channel_type not null,
  display_name text not null,
  external_id text not null,             
  credentials_encrypted bytea,           
  is_active boolean default true,
  created_at timestamptz default now()
);
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members read channels" ON public.channels 
  FOR SELECT USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "agency members manage channels" ON public.channels 
  FOR ALL USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));


-- 4. CONTACTS (Onda 1)
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text,
  phone text,
  email text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique (agency_id, phone)
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members read contacts" ON public.contacts 
  FOR SELECT USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "agency members manage contacts" ON public.contacts 
  FOR ALL USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));


-- 5. CONVERSATIONS (Onda 1)
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  channel_id uuid not null references public.channels(id),
  contact_id uuid not null references public.contacts(id),
  assigned_user_id uuid references auth.users(id),
  assigned_team text,
  status public.conversation_status not null default 'open',
  ai_mode boolean default false,
  last_message_at timestamptz default now(),
  created_at timestamptz default now()
);
-- Índices para performance da UI
CREATE INDEX IF NOT EXISTS idx_conversations_agency_status ON public.conversations (agency_id, status, last_message_at desc);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members read conversations" ON public.conversations 
  FOR SELECT USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "agency members manage conversations" ON public.conversations 
  FOR ALL USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));


-- 6. MESSAGES (Onda 1)
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  agency_id uuid not null, -- Desnormalizado para não necessitar de JOIN no RLS
  direction public.message_direction not null,
  sender_user_id uuid references auth.users(id),
  body text,
  media_url text,
  status public.message_status default 'queued',
  external_id text,
  created_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_date ON public.messages (conversation_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members read messages" ON public.messages 
  FOR SELECT USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "agency members manage messages" ON public.messages 
  FOR ALL USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

-- Grants de serviço (Obrigatório para Edge Functions REST / Service Role bypassing)
GRANT ALL ON public.feature_flags TO service_role;
GRANT ALL ON public.channels TO service_role;
GRANT ALL ON public.contacts TO service_role;
GRANT ALL ON public.conversations TO service_role;
GRANT ALL ON public.messages TO service_role;
