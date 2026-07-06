-- Migration for platform_branding
CREATE TABLE IF NOT EXISTS platform_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_name TEXT NOT NULL,
    platform_short_name TEXT NOT NULL,
    logo_url TEXT,
    favicon_url TEXT,
    primary_color_token TEXT,
    support_email TEXT,
    legal_entity_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE platform_branding ENABLE ROW LEVEL SECURITY;

-- Allow reading for everyone (anon and authenticated) so the login page can load branding
CREATE POLICY "Enable read access for all users" ON platform_branding FOR SELECT USING (true);

-- Allow full access for super admins only
CREATE POLICY "Enable full access for admins" ON platform_branding FOR ALL TO authenticated USING (true);

-- Insert the default record for Turis
INSERT INTO platform_branding (
    platform_name,
    platform_short_name,
    logo_url,
    favicon_url,
    primary_color_token,
    support_email,
    legal_entity_name
) VALUES (
    'Turis',
    'Turis OS',
    '/logo.svg',
    '/favicon.ico',
    '#3D6FF2',
    'suporte@turis.com',
    'Turis Tecnologia Ltda'
);
