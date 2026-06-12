ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS map_image_url TEXT,
  ADD COLUMN IF NOT EXISTS agent_name TEXT,
  ADD COLUMN IF NOT EXISTS agent_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS agent_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS custom_payments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS waypoints JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS extra_pages JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS canvas_format TEXT DEFAULT 'a4-portrait',
  ADD COLUMN IF NOT EXISTS cover_prompt TEXT;
