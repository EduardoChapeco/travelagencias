-- Fase G.3: Refinamento da Central de Ajuda B2C (Knowledge Articles)

-- 1. Adicionar slug e views
ALTER TABLE public.knowledge_articles ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.knowledge_articles ADD COLUMN IF NOT EXISTS views int NOT NULL DEFAULT 0;

-- 2. Gerar slugs automaticamente para artigos existentes
UPDATE public.knowledge_articles 
SET slug = lower(regexp_replace(regexp_replace(title, '[^\w\s]', '', 'g'), '\s+', '-', 'g')) || '-' || substring(id::text from 1 for 4)
WHERE slug IS NULL;

-- 3. Adicionar constraint UNIQUE para slug (por agência)
ALTER TABLE public.knowledge_articles ADD CONSTRAINT knowledge_articles_agency_slug_key UNIQUE (agency_id, slug);

-- 4. Criar política pública de leitura (apenas para is_internal = false)
DROP POLICY IF EXISTS "ka public read" ON public.knowledge_articles;
CREATE POLICY "ka public read" ON public.knowledge_articles
    FOR SELECT TO public
    USING (is_internal = false);

-- 5. RPC para incrementar visualizações
CREATE OR REPLACE FUNCTION public.increment_ka_views(p_article_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.knowledge_articles
  SET views = views + 1
  WHERE id = p_article_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_ka_views(uuid) TO public;
