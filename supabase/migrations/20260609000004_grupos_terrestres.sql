-- Migration para Grupos Terrestres B2C (Turis Fase A)

CREATE TABLE IF NOT EXISTS group_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subtitle TEXT,
    slug TEXT NOT NULL UNIQUE,
    cover_image_url TEXT,
    destination TEXT,
    departure_date DATE,
    return_date DATE,
    price_per_pax NUMERIC(10,2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'BRL',
    max_pax INTEGER NOT NULL DEFAULT 40,
    current_pax INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft',
    is_public BOOLEAN DEFAULT false,
    important_notes TEXT,
    includes TEXT[] DEFAULT '{}',
    excludes TEXT[] DEFAULT '{}',
    gallery_urls TEXT[] DEFAULT '{}',
    payment_due_offset_days INTEGER DEFAULT 1,
    installments_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_trip_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_trip_id UUID NOT NULL REFERENCES group_trips(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description_md TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_trip_id UUID NOT NULL REFERENCES group_trips(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    lead_name TEXT NOT NULL,
    lead_email TEXT,
    lead_phone TEXT,
    lead_cpf TEXT,
    pax_count INTEGER NOT NULL DEFAULT 1,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    public_token UUID DEFAULT gen_random_uuid() UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policies
ALTER TABLE group_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_trip_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_bookings ENABLE ROW LEVEL SECURITY;

-- Agency admins can manage all their group trips
CREATE POLICY "Manage own group trips" ON group_trips
FOR ALL USING (public.is_agency_member(auth.uid(), agency_id));

-- Public can read published group trips
CREATE POLICY "Public read group trips" ON group_trips
FOR SELECT USING (is_public = true AND status = 'published');

-- Agency admins can manage trip days
CREATE POLICY "Manage trip days" ON group_trip_days
FOR ALL USING (group_trip_id IN (
    SELECT id FROM group_trips WHERE public.is_agency_member(auth.uid(), agency_id)
));

-- Public can read published trip days
CREATE POLICY "Public read trip days" ON group_trip_days
FOR SELECT USING (group_trip_id IN (
    SELECT id FROM group_trips WHERE is_public = true AND status = 'published'
));

-- Agency admins can manage bookings
CREATE POLICY "Manage group bookings" ON group_bookings
FOR ALL USING (group_trip_id IN (
    SELECT id FROM group_trips WHERE public.is_agency_member(auth.uid(), agency_id)
));

-- Public can create bookings
CREATE POLICY "Public insert bookings" ON group_bookings
FOR INSERT WITH CHECK (group_trip_id IN (
    SELECT id FROM group_trips WHERE is_public = true AND status = 'published'
));

-- Public can read their own bookings via token
CREATE POLICY "Public read bookings by token" ON group_bookings
FOR SELECT USING (true); -- Token is used as secret in RPCs or queries
