-- Fase G: CMS, Blog e SEO

-- 1. Criação da tabela de versionamento de páginas do CMS (G1)
CREATE TABLE IF NOT EXISTS public.portal_page_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id uuid NOT NULL REFERENCES public.portal_pages(id) ON DELETE CASCADE,
    agency_id uuid NOT NULL,
    title text NOT NULL,
    blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
    seo jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portal_page_versions_page_idx ON public.portal_page_versions(page_id);

GRANT SELECT, INSERT ON public.portal_page_versions TO authenticated;
GRANT ALL ON public.portal_page_versions TO service_role;
ALTER TABLE public.portal_page_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ppv read" ON public.portal_page_versions FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "ppv insert" ON public.portal_page_versions FOR INSERT TO authenticated WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

-- 2. Atualizações no Blog (G2)
-- Adicionar scheduled_at em blog_posts caso não exista (na verdade já existe scheduled_for, vamos usar esse)
-- tags text[] já existe em blog_posts
-- views int já existe em blog_posts

-- 3. Função para duplicar portal page
CREATE OR REPLACE FUNCTION public.duplicate_portal_page(p_page_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_id uuid;
    v_agency_id uuid;
    v_slug text;
    v_title text;
    v_blocks jsonb;
    v_template text;
    v_seo jsonb;
    v_suffix text;
BEGIN
    SELECT agency_id, slug, title, blocks, template, seo
    INTO v_agency_id, v_slug, v_title, v_blocks, v_template, v_seo
    FROM public.portal_pages
    WHERE id = p_page_id;

    IF v_agency_id IS NULL THEN
        RAISE EXCEPTION 'Page not found';
    END IF;
    
    IF NOT public.is_agency_member(auth.uid(), v_agency_id) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Gerar slug unico com timestamp
    v_suffix := '-' || extract(epoch from now())::int;
    v_slug := v_slug || v_suffix;
    v_title := v_title || ' (Cópia)';

    INSERT INTO public.portal_pages (agency_id, slug, title, blocks, is_published, template, seo)
    VALUES (v_agency_id, v_slug, v_title, v_blocks, false, v_template, v_seo)
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.duplicate_portal_page(uuid) TO authenticated;

-- 4. Full Text Search na Base de Conhecimento (G4)
ALTER TABLE public.knowledge_articles ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('portuguese', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('portuguese', coalesce(category, '')), 'B') ||
  setweight(to_tsvector('portuguese', coalesce(array_to_string(tags, ' '), '')), 'C') ||
  setweight(to_tsvector('portuguese', coalesce(content, '')), 'D')
) STORED;

CREATE INDEX IF NOT EXISTS knowledge_articles_search_idx ON public.knowledge_articles USING GIN (search_vector);

CREATE OR REPLACE FUNCTION public.search_knowledge_articles(
  p_agency_id uuid,
  p_query text,
  p_is_internal boolean DEFAULT false
)
RETURNS SETOF public.knowledge_articles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.knowledge_articles
  WHERE agency_id = p_agency_id
    AND (is_internal = p_is_internal OR p_is_internal = true)
    AND search_vector @@ websearch_to_tsquery('portuguese', p_query)
  ORDER BY ts_rank(search_vector, websearch_to_tsquery('portuguese', p_query)) DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.search_knowledge_articles(uuid, text, boolean) TO public;

-- Colunas de votação
ALTER TABLE public.knowledge_articles ADD COLUMN IF NOT EXISTS votes_up int NOT NULL DEFAULT 0;
ALTER TABLE public.knowledge_articles ADD COLUMN IF NOT EXISTS votes_down int NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.vote_knowledge_article(p_article_id uuid, p_is_upvote boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_is_upvote THEN
    UPDATE public.knowledge_articles SET votes_up = votes_up + 1 WHERE id = p_article_id;
  ELSE
    UPDATE public.knowledge_articles SET votes_down = votes_down + 1 WHERE id = p_article_id;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.vote_knowledge_article(uuid, boolean) TO public;
