-- =============================================================================
-- FIX: Grant schema public usage to all Supabase roles
-- In Postgres 15+, the public schema no longer auto-grants USAGE to PUBLIC.
-- This migration restores the expected Supabase default permissions.
-- =============================================================================

-- 1. Schema access
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. All existing tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. All existing sequences (for serial/identity columns)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 4. All existing functions / procedures
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 5. Default privileges for FUTURE objects created by postgres role
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 6. Explicitly grant EXECUTE on the onboarding function to authenticated
GRANT EXECUTE ON FUNCTION public.create_agency_onboarding(
  text, text, text, text, text, text, text,
  text, text, text, text, text, text, text,
  text, jsonb, boolean
) TO authenticated;

-- 7. Ensure get_my_agency_id is callable by authenticated
GRANT EXECUTE ON FUNCTION public.get_my_agency_id() TO authenticated, anon;
