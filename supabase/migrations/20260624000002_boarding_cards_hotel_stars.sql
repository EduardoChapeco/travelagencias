-- Migration: Add hotel_stars to boarding_cards
ALTER TABLE public.boarding_cards
  ADD COLUMN IF NOT EXISTS hotel_stars int CHECK (hotel_stars >= 1 AND hotel_stars <= 5);

COMMENT ON COLUMN public.boarding_cards.hotel_stars IS 'Hotel rating from 1 to 5 stars';
