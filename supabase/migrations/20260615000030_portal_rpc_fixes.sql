-- 1. Adicionar colunas slug e template à tabela de versionamento
ALTER TABLE public.portal_page_versions
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS template TEXT;

-- 2. Redefinir RPC para duplicar páginas com suporte total a blocks, seo e template
CREATE OR REPLACE FUNCTION public.duplicate_portal_page(p_page_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id UUID;
  v_new_id UUID;
  v_original RECORD;
  v_new_slug TEXT;
  v_suffix INT := 1;
BEGIN
  -- Buscar a página original
  SELECT * INTO v_original FROM public.portal_pages WHERE id = p_page_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Page not found: %', p_page_id;
  END IF;
  
  v_agency_id := v_original.agency_id;
  
  -- Verificar se o chamador é membro da agência
  IF NOT public.is_agency_member(auth.uid(), v_agency_id) THEN
    RAISE EXCEPTION 'Unauthorized: caller is not a member of this agency';
  END IF;

  -- Gerar um slug único anexando -copia-N
  v_new_slug := v_original.slug || '-copia';
  WHILE EXISTS (SELECT 1 FROM public.portal_pages WHERE agency_id = v_agency_id AND slug = v_new_slug) LOOP
    v_suffix := v_suffix + 1;
    v_new_slug := v_original.slug || '-copia-' || v_suffix;
  END LOOP;

  -- Inserir o registro duplicado
  INSERT INTO public.portal_pages (
    agency_id, slug, title, description, cover_image_url, category,
    content, canvas_format, status, blocks, seo, template
  )
  VALUES (
    v_agency_id,
    v_new_slug,
    v_original.title || ' (Cópia)',
    v_original.description,
    v_original.cover_image_url,
    v_original.category,
    v_original.content,
    v_original.canvas_format,
    'draft', -- Sempre inicia como rascunho
    v_original.blocks,
    v_original.seo,
    v_original.template
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.duplicate_portal_page(UUID) TO authenticated;

-- 3. Redefinir RPC de publicar páginas sincronizando rascunho -> produção e salvando snapshot histórico
CREATE OR REPLACE FUNCTION public.publish_portal_page(p_page_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page RECORD;
BEGIN
  -- Buscar a página para obter valores e validar
  SELECT * INTO v_page FROM public.portal_pages WHERE id = p_page_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Page not found: %', p_page_id;
  END IF;

  -- Verificar se o chamador é membro da agência
  IF NOT public.is_agency_member(auth.uid(), v_page.agency_id) THEN
    RAISE EXCEPTION 'Unauthorized: caller is not a member of this agency';
  END IF;

  -- Atualizar para published e copiar rascunhos para produção
  UPDATE public.portal_pages
  SET 
    status = 'published',
    published_title = title,
    published_blocks = blocks,
    published_seo = seo,
    published_at = NOW(),
    updated_at = NOW()
  WHERE id = p_page_id;

  -- Salvar o Snapshot no histórico de versões
  INSERT INTO public.portal_page_versions (page_id, agency_id, title, slug, template, blocks, seo, created_by)
  VALUES (v_page.id, v_page.agency_id, v_page.title, v_page.slug, v_page.template, v_page.blocks, v_page.seo, auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_portal_page(UUID) TO authenticated;

-- 4. Redefinir RPC para reverter para uma versão antiga com suporte a template e slug
CREATE OR REPLACE FUNCTION public.revert_portal_page(p_page_id UUID, p_version_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version RECORD;
BEGIN
  -- Buscar a versão desejada
  SELECT * INTO v_version FROM public.portal_page_versions WHERE id = p_version_id AND page_id = p_page_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  -- Verificar se o chamador é membro da agência
  IF NOT public.is_agency_member(auth.uid(), v_version.agency_id) THEN
    RAISE EXCEPTION 'Unauthorized: caller is not a member of this agency';
  END IF;

  -- Atualizar os dados de rascunho com a versão selecionada
  UPDATE public.portal_pages
  SET title = v_version.title,
      slug = COALESCE(v_version.slug, slug),
      template = COALESCE(v_version.template, template),
      blocks = v_version.blocks,
      seo = v_version.seo,
      updated_at = NOW()
  WHERE id = p_page_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revert_portal_page(UUID, UUID) TO authenticated;
