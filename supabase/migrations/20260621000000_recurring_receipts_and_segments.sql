-- Migration: 20260621000000_recurring_receipts_and_segments.sql
-- Goal: Add support for monthly receipt uploads, daily reconciliation workflows, and dynamic group passenger segmentations.

-- 1. Add receipt columns to payment_installments
ALTER TABLE public.payment_installments
  ADD COLUMN IF NOT EXISTS receipt_url text,
  ADD COLUMN IF NOT EXISTS receipt_status text NOT NULL DEFAULT 'none' CHECK (receipt_status IN ('none', 'pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS receipt_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'pix';

-- 2. Add logistic segments and payment routing to group_tour_enrollments
ALTER TABLE public.group_tour_enrollments
  ADD COLUMN IF NOT EXISTS segment_type text NOT NULL DEFAULT 'bus' CHECK (segment_type IN ('bus', 'flight', 'cruise', 'land_only')),
  ADD COLUMN IF NOT EXISTS payment_routing text NOT NULL DEFAULT 'agency' CHECK (payment_routing IN ('agency', 'operator'));
