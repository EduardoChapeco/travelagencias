-- Criar bucket privado para documentos de vistos
insert into storage.buckets (id, name, public) 
values ('visa_documents', 'visa_documents', false)
on conflict (id) do nothing;

-- RLS para storage
create policy "Agências gerenciam os documentos de vistos de seus clientes"
on storage.objects for all
to authenticated
using (
  bucket_id = 'visa_documents' 
  and (storage.foldername(name))[1] = (auth.jwt()->>'agency_id')
)
with check (
  bucket_id = 'visa_documents' 
  and (storage.foldername(name))[1] = (auth.jwt()->>'agency_id')
);
