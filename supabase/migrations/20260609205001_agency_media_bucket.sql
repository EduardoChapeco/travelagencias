-- Migration: Centralização de Media Library para as Agências
-- Cria o bucket unificado 'agency-media'

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agency-media',
  'agency-media',
  true,
  20971520, -- 20MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de RLS para o bucket agency-media
-- 1. Leitura: Como o bucket é público (public=true), o Supabase já libera GET se configurado.
-- Mas, para garantir em storage.objects, precisamos da policy de select.
CREATE POLICY "agency_media_public_read" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'agency-media');

-- 2. Escrita: Apenas usuários autenticados que pertencem à agência correspondente ao path.
-- Path Structure: {agency_id}/...
CREATE POLICY "agency_media_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'agency-media' AND
  (storage.foldername(name))[1] = public.get_my_agency_id()::text
);

-- 3. Atualização
CREATE POLICY "agency_media_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'agency-media' AND
  (storage.foldername(name))[1] = public.get_my_agency_id()::text
);

-- 4. Exclusão
CREATE POLICY "agency_media_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'agency-media' AND
  (storage.foldername(name))[1] = public.get_my_agency_id()::text
);
