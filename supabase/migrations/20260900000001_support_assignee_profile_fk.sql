-- Migration: 20260900000001_support_assignee_profile_fk.sql
-- Purpose: Add foreign key constraint from support_tickets.assignee_id to public.profiles(id) so that PostgREST can join profiles directly.

ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS fk_support_tickets_assignee_profile;

ALTER TABLE public.support_tickets
  ADD CONSTRAINT fk_support_tickets_assignee_profile FOREIGN KEY (assignee_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
