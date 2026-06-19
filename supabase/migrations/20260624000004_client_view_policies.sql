-- Migration: Add client view policies for trip confirmation items and flight itineraries/segments

CREATE POLICY "Clients can view their trip confirmation items"
  ON public.trip_confirmation_items FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM public.trips
      WHERE client_id IN (
        SELECT id FROM public.clients
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Clients can view their flight itineraries"
  ON public.flight_itineraries FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM public.trips
      WHERE client_id IN (
        SELECT id FROM public.clients
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Clients can view their flight segments"
  ON public.flight_segments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.flight_itineraries i
      WHERE i.id = flight_segments.itinerary_id
        AND i.trip_id IN (
          SELECT id FROM public.trips
          WHERE client_id IN (
            SELECT id FROM public.clients
            WHERE user_id = auth.uid()
          )
        )
    )
  );
