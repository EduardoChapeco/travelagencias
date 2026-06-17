-- Add status column to public.agencies table to support administrative suspensions (blocked state)
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked'));

COMMENT ON COLUMN public.agencies.status IS 'Status da agência no sistema (active para normal, blocked para suspensa)';
