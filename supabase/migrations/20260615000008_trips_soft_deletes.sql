-- Migration: 20260615000008_trips_soft_deletes
-- Habilita soft deletes em public.trips alterando as policies de RLS e removendo permissão de delete físico.

-- 1. Remover RLS policies antigas de leitura/atualização/remoção física
DROP POLICY IF EXISTS "agency members read trips" ON public.trips;
DROP POLICY IF EXISTS "agency members update trips" ON public.trips;
DROP POLICY IF EXISTS "agency admins delete trips" ON public.trips;

-- 2. Recriar RLS policies com filtro de soft delete
CREATE POLICY "agency members read trips" ON public.trips
  FOR SELECT TO authenticated
  USING (
    public.is_agency_member(auth.uid(), agency_id) AND
    deleted_at IS NULL AND (
      owner_id = auth.uid() OR
      owner_id IS NULL OR -- viagens sem dono visíveis na esteira comum
      public.has_role(auth.uid(), 'agency_admin', agency_id)
    )
  );

CREATE POLICY "agency members update trips" ON public.trips
  FOR UPDATE TO authenticated
  USING (
    public.is_agency_member(auth.uid(), agency_id) AND
    deleted_at IS NULL AND (
      owner_id = auth.uid() OR
      owner_id IS NULL OR
      public.has_role(auth.uid(), 'agency_admin', agency_id)
    )
  );

-- 3. Criar índice de performance para soft delete
CREATE INDEX IF NOT EXISTS trips_deleted_at_idx ON public.trips (deleted_at)
  WHERE deleted_at IS NULL;
