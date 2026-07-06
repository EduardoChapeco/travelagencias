-- =============================================================================
-- Turis — Proposals Advanced Features and Tracking
-- Migration: 20260615000009_proposals_advanced_features
-- =============================================================================

-- 1. Add is_public_template column to public.proposals
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS is_public_template BOOLEAN NOT NULL DEFAULT false;

-- 2. Grant permissions on proposals to anon (for public webview access)
GRANT SELECT, UPDATE ON public.proposals TO anon, authenticated, service_role;

-- 3. Create RLS policies for anonymous/public read and update by public_token
DROP POLICY IF EXISTS "public read of proposals by token" ON public.proposals;
CREATE POLICY "public read of proposals by token" ON public.proposals
  FOR SELECT TO anon, authenticated
  USING (public_token IS NOT NULL AND deleted_at IS NULL);

DROP POLICY IF EXISTS "public update of proposals by token" ON public.proposals;
CREATE POLICY "public update of proposals by token" ON public.proposals
  FOR UPDATE TO anon, authenticated
  USING (public_token IS NOT NULL AND deleted_at IS NULL)
  WITH CHECK (public_token IS NOT NULL AND deleted_at IS NULL);

-- 4. Create proposal_history table for auditing and tracking
CREATE TABLE IF NOT EXISTS public.proposal_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_proposal_history_proposal_id ON public.proposal_history(proposal_id);

-- Enable RLS
ALTER TABLE public.proposal_history ENABLE ROW LEVEL SECURITY;

-- Grant permissions to public.proposal_history
GRANT SELECT, INSERT ON public.proposal_history TO anon, authenticated, service_role;

-- RLS policies for proposal_history
DROP POLICY IF EXISTS "agency members read history" ON public.proposal_history;
CREATE POLICY "agency members read history" ON public.proposal_history
  FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "anyone can insert proposal history" ON public.proposal_history;
CREATE POLICY "anyone can insert proposal history" ON public.proposal_history
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
