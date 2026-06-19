-- Migration: Add trip lifecycle and aggregation fields to public.trips
-- Establishes trip_type, lifecycle_status, group_tour_id, booking_reference, and assigned_agent_id.

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS trip_type text DEFAULT 'individual' CHECK (trip_type IN ('individual', 'group', 'corporate')),
  ADD COLUMN IF NOT EXISTS lifecycle_status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS group_tour_id uuid REFERENCES public.group_tours(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS booking_reference text,
  ADD COLUMN IF NOT EXISTS assigned_agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS portal_enabled boolean DEFAULT true;

-- Indexes for search performance
CREATE INDEX IF NOT EXISTS trips_lifecycle_status_idx ON public.trips(lifecycle_status, agency_id);
CREATE INDEX IF NOT EXISTS trips_type_idx ON public.trips(trip_type, agency_id);
CREATE INDEX IF NOT EXISTS trips_group_tour_idx ON public.trips(group_tour_id) WHERE group_tour_id IS NOT NULL;
