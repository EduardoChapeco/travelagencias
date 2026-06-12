-- =============================================================================
-- FIX: knowledge_article_votes has RLS enabled but ZERO policies
-- The table uses ip_address for identifying voters (no user_id column)
-- Without policies, the table is completely inaccessible.
-- =============================================================================

-- Allow anyone (anon + authenticated) to read vote counts
CREATE POLICY "knowledge_votes_select"
ON public.knowledge_article_votes
FOR SELECT
USING (true);

-- Allow anyone to insert a vote (ip-based throttling is done in the RPC)
CREATE POLICY "knowledge_votes_insert"
ON public.knowledge_article_votes
FOR INSERT
WITH CHECK (true);
