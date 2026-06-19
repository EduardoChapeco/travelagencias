-- Fase B: Consolidação da Rooming List
-- Remove dupla fonte de verdade: JSONB em group_tours → tabela normalizada boarding_rooming_list
-- Data: 2026-06-25

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Adicionar group_tour_id (FK para group_tours)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.boarding_rooming_list
  ADD COLUMN IF NOT EXISTS group_tour_id uuid
    REFERENCES public.group_tours(id) ON DELETE CASCADE;

-- Tornar card_id nullable para suportar quartos vinculados apenas ao tour
ALTER TABLE public.boarding_rooming_list
  ALTER COLUMN card_id DROP NOT NULL;

-- Índice para busca rápida por tour
CREATE INDEX IF NOT EXISTS rooming_list_group_tour_idx
  ON public.boarding_rooming_list(group_tour_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Migrar dados existentes do JSONB para linhas normalizadas se a coluna existir
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'group_tours' 
      AND column_name = 'rooming_list'
  ) THEN
    INSERT INTO public.boarding_rooming_list (
      agency_id,
      group_tour_id,
      card_id,
      room_number,
      room_type,
      hotel_name,
      checkin_date,
      checkout_date,
      notes,
      is_confirmed,
      passengers,
      order_index
    )
    SELECT
      gt.agency_id,
      gt.id                                                    AS group_tour_id,
      NULL                                                     AS card_id,
      COALESCE(room->>'room_number', 'Quarto')::text,
      COALESCE(room->>'room_type', 'double'),
      room->>'hotel_name',
      NULLIF(room->>'checkin_date', '')::date,
      NULLIF(room->>'checkout_date', '')::date,
      room->>'notes',
      COALESCE((room->>'is_confirmed')::boolean, false),
      COALESCE(room->'passengers', '[]'::jsonb),
      (row_number() OVER (PARTITION BY gt.id ORDER BY (room->>'room_number')))::int
    FROM public.group_tours gt,
         jsonb_array_elements(
           CASE
             WHEN jsonb_typeof(gt.rooming_list) = 'array' THEN gt.rooming_list
             ELSE '[]'::jsonb
           END
         ) AS room
    WHERE gt.rooming_list IS NOT NULL
      AND gt.rooming_list != 'null'::jsonb
      AND gt.rooming_list != '[]'::jsonb;

    ALTER TABLE public.group_tours
      DROP COLUMN rooming_list;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Recriar políticas RLS (agora cobrindo ambos card_id e group_tour_id)
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "rooming read"   ON public.boarding_rooming_list;
DROP POLICY IF EXISTS "rooming insert" ON public.boarding_rooming_list;
DROP POLICY IF EXISTS "rooming update" ON public.boarding_rooming_list;
DROP POLICY IF EXISTS "rooming delete" ON public.boarding_rooming_list;

CREATE POLICY "rooming read" ON public.boarding_rooming_list
  FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "rooming insert" ON public.boarding_rooming_list
  FOR INSERT TO authenticated
  WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "rooming update" ON public.boarding_rooming_list
  FOR UPDATE TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "rooming delete" ON public.boarding_rooming_list
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.is_agency_member(auth.uid(), agency_id)
  );
