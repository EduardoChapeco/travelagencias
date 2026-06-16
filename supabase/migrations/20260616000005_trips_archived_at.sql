-- Migration: Add archived_at column to public.trips
-- Add column archived_at to public.trips to support soft archiving separate from operational status.

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create index for performance on filtering by archive state
CREATE INDEX IF NOT EXISTS trips_archived_at_idx ON public.trips(archived_at)
  WHERE archived_at IS NULL;
