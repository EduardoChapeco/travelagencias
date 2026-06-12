-- P1-3 fix: Add emergency_contacts and insurance fields to proposals
-- These fields are used by SectionEmergency and SectionInsurance components
-- but were missing from the proposals table schema.

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS emergency_contacts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS insurance JSONB DEFAULT '{}'::jsonb;
