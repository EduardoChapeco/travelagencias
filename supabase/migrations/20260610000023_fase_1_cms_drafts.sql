-- Fase 1: Fundações do CMS (Rascunho vs Publicado)

-- 1. Adicionar colunas de publicação à tabela portal_pages
ALTER TABLE public.portal_pages 
  ADD COLUMN IF NOT EXISTS published_title text,
  ADD COLUMN IF NOT EXISTS published_blocks jsonb,
  ADD COLUMN IF NOT EXISTS published_seo jsonb;

-- 2. Migrar dados existentes para que páginas publicadas continuem no ar sem quebrar
UPDATE public.portal_pages 
SET 
  published_title = title,
  published_blocks = blocks,
  published_seo = seo
WHERE is_published = true;

-- 3. Criar função para Publicar uma Página (Copia Rascunho -> Produção + Salva Versão)
CREATE OR REPLACE FUNCTION public.publish_portal_page(p_page_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page public.portal_pages%rowtype;
BEGIN
  -- Obter a página
  SELECT * INTO v_page FROM public.portal_pages WHERE id = p_page_id;
  
  IF v_page.id IS NULL THEN
    RAISE EXCEPTION 'Page not found';
  END IF;

  IF NOT public.is_agency_member(auth.uid(), v_page.agency_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Atualizar as colunas de produção
  UPDATE public.portal_pages
  SET published_title = title,
      published_blocks = blocks,
      published_seo = seo,
      is_published = true,
      updated_at = now()
  WHERE id = p_page_id;

  -- Salvar o Snapshot histórico
  INSERT INTO public.portal_page_versions (page_id, agency_id, title, blocks, seo, created_by)
  VALUES (v_page.id, v_page.agency_id, v_page.title, v_page.blocks, v_page.seo, auth.uid());
END;
$$;
GRANT EXECUTE ON FUNCTION public.publish_portal_page(uuid) TO authenticated;

-- 4. Criar função para Reverter para uma Versão Anterior
CREATE OR REPLACE FUNCTION public.revert_portal_page(p_page_id uuid, p_version_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version public.portal_page_versions%rowtype;
BEGIN
  -- Obter a versão
  SELECT * INTO v_version FROM public.portal_page_versions WHERE id = p_version_id AND page_id = p_page_id;

  IF v_version.id IS NULL THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  IF NOT public.is_agency_member(auth.uid(), v_version.agency_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Atualiza APENAS O RASCUNHO com a versão antiga (Não joga pra produção automaticamente)
  UPDATE public.portal_pages
  SET title = v_version.title,
      blocks = v_version.blocks,
      seo = v_version.seo,
      updated_at = now()
  WHERE id = p_page_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.revert_portal_page(uuid, uuid) TO authenticated;
