-- Migration: Add premium details, promotional media, multi-tier pricing, and extra options to group tours
ALTER TABLE public.group_tours
  ADD COLUMN IF NOT EXISTS hotel_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pricing_tiers JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS extra_options JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS promo_media JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.group_tour_enrollments
  ADD COLUMN IF NOT EXISTS selected_pricing_tier JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS selected_extras JSONB DEFAULT '[]'::jsonb;
