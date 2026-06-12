INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'proposals-exports',
  'proposals-exports',
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage.objects
CREATE POLICY "proposals_exports_public_read" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'proposals-exports');

CREATE POLICY "proposals_exports_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'proposals-exports' AND
  (storage.foldername(name))[1] = public.get_my_agency_id()::text
);

CREATE POLICY "proposals_exports_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'proposals-exports' AND
  (storage.foldername(name))[1] = public.get_my_agency_id()::text
);

CREATE POLICY "proposals_exports_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'proposals-exports' AND
  (storage.foldername(name))[1] = public.get_my_agency_id()::text
);
