-- Migration: 20260900000002_timeline_actor_profile_fk.sql
-- Purpose: Add foreign key constraint from ticket_timeline.actor_id to public.profiles(id) to enable direct PostgREST joins.

ALTER TABLE public.ticket_timeline
  DROP CONSTRAINT IF EXISTS fk_ticket_timeline_actor_profile;

ALTER TABLE public.ticket_timeline
  ADD CONSTRAINT fk_ticket_timeline_actor_profile FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
