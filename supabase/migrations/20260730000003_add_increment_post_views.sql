-- ==============================================================================
-- Migração: 20260730000003_add_increment_post_views
-- Criação de RPC para incrementar visualizações de posts do blog.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.increment_post_views(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.blog_posts
  SET views = COALESCE(views, 0) + 1
  WHERE id = p_post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_post_views(uuid) TO anon, authenticated;
