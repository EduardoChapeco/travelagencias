
-- Fix trigger fn search path
create or replace function public.contracts_immutable_after_signed()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.signed_at is not null then
    raise exception 'Contrato assinado não pode ser modificado.';
  end if;
  return new;
end; $$;

-- Restrict EXECUTE on security definer helpers to authenticated only
revoke execute on function public.get_my_agency_id() from public, anon;
grant execute on function public.get_my_agency_id() to authenticated, service_role;
revoke execute on function public.is_agency_member(uuid, uuid) from public, anon;
grant execute on function public.is_agency_member(uuid, uuid) to authenticated, service_role;
revoke execute on function public.has_role(uuid, app_role, uuid) from public, anon;
grant execute on function public.has_role(uuid, app_role, uuid) to authenticated, service_role;

-- =========================================================
-- STORAGE RLS: agency-scoped folder convention {agency_id}/...
-- One generic policy set per bucket. Membership is verified by the
-- agency id encoded as the first path segment.
-- =========================================================
do $$
declare
  b text;
  buckets text[] := array[
    'agency-logos','agency-covers','proposal-covers','proposal-attachments',
    'contract-pdfs','voucher-sources','voucher-pdfs','financial-receipts',
    'passenger-documents','group-tour-gallery','blog-covers','support-attachments',
    'client-avatars'
  ];
begin
  foreach b in array buckets loop
    execute format($f$
      drop policy if exists "%1$s read" on storage.objects;
      drop policy if exists "%1$s insert" on storage.objects;
      drop policy if exists "%1$s update" on storage.objects;
      drop policy if exists "%1$s delete" on storage.objects;
    $f$, b);

    execute format($f$
      create policy "%1$s read" on storage.objects for select to authenticated
        using (bucket_id = %1$L and public.is_agency_member(auth.uid(), ((storage.foldername(name))[1])::uuid));
    $f$, b);
    execute format($f$
      create policy "%1$s insert" on storage.objects for insert to authenticated
        with check (bucket_id = %1$L and public.is_agency_member(auth.uid(), ((storage.foldername(name))[1])::uuid));
    $f$, b);
    execute format($f$
      create policy "%1$s update" on storage.objects for update to authenticated
        using (bucket_id = %1$L and public.is_agency_member(auth.uid(), ((storage.foldername(name))[1])::uuid));
    $f$, b);
    -- contract-pdfs: no DELETE policy (service role only)
    if b <> 'contract-pdfs' then
      execute format($f$
        create policy "%1$s delete" on storage.objects for delete to authenticated
          using (bucket_id = %1$L and public.is_agency_member(auth.uid(), ((storage.foldername(name))[1])::uuid));
      $f$, b);
    end if;
  end loop;
end $$;
