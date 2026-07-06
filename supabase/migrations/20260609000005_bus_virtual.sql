-- Migration para o Motor de Ônibus Virtual (Turis Fase B)

CREATE TABLE IF NOT EXISTS bus_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    vehicle_type TEXT DEFAULT 'bus', -- bus | van | plane
    rows INTEGER NOT NULL DEFAULT 14,
    cols INTEGER NOT NULL DEFAULT 5,
    seat_map JSONB DEFAULT '[]'::jsonb, -- Array de objetos com {label, type: 'seat'|'aisle'|'door'|'wc'}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Atribuir um layout a uma viagem específica
ALTER TABLE group_trips ADD COLUMN bus_layout_id UUID REFERENCES bus_layouts(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS bus_seat_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_trip_id UUID NOT NULL REFERENCES group_trips(id) ON DELETE CASCADE,
    seat_label TEXT NOT NULL,
    booking_id UUID REFERENCES group_bookings(id) ON DELETE SET NULL,
    traveler_name TEXT,
    is_blocked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_trip_id, seat_label)
);

-- Policies
ALTER TABLE bus_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_seat_assignments ENABLE ROW LEVEL SECURITY;

-- Agency admins can manage bus layouts
CREATE POLICY "Manage bus layouts" ON bus_layouts
FOR ALL USING (public.is_agency_member(auth.uid(), agency_id));

-- Public can read bus layouts if attached to a published trip
CREATE POLICY "Public read bus layouts" ON bus_layouts
FOR SELECT USING (id IN (
    SELECT bus_layout_id FROM group_trips WHERE is_public = true AND status = 'published'
));

-- Agency admins can manage assignments
CREATE POLICY "Manage seat assignments" ON bus_seat_assignments
FOR ALL USING (group_trip_id IN (
    SELECT id FROM group_trips WHERE public.is_agency_member(auth.uid(), agency_id)
));

-- Public can insert or update assignments during booking process
CREATE POLICY "Public manage their own assignments" ON bus_seat_assignments
FOR ALL USING (group_trip_id IN (
    SELECT id FROM group_trips WHERE is_public = true AND status = 'published'
));
