-- Migration: 20260711000000_add_label_to_credentials.sql
-- Description: Add label column to ai_api_credentials table to support custom names for API keys

ALTER TABLE public.ai_api_credentials ADD COLUMN IF NOT EXISTS label text;
