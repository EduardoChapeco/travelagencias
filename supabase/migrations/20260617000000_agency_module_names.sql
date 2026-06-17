-- Add module_names jsonb column to public.agencies table to allow custom module names per agency
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS module_names jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.agencies.module_names IS 'Nome personalizado dos módulos definidos pela agência (ex: {"trips": "Pacotes"})';
