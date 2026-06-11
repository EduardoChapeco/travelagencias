import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChecklistItem = { label: string; done: boolean; passenger_id?: string };

export type BoardingCard = {
  id: string;
  pnr: string | null;
  airline: string | null;
  status: string;
  alerts: string[];
  trip_id: string;
  position: number;
  checklist: ChecklistItem[];
  departure_date?: string | null;
  passengers_count?: number | null;
  trip_title?: string;
  trip_destination?: string;
};

export type MinTrip = {
  id: string;
  code: string | null;
  title: string;
};

export type PassengerMin = {
  id: string;
  full_name: string;
  document: string | null;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function fetchBoardingCards(agencyId: string): Promise<BoardingCard[]> {
  const { data, error } = await supabase
    .from("boarding_cards")
    .select(
      "id, pnr, airline, status, alerts, trip_id, position, checklist, departure_date, passengers_count",
    )
    .eq("agency_id", agencyId)
    .order("position");
  if (error) throw new Error(error.message);

  const tripIds = [...new Set((data ?? []).map((c: any) => c.trip_id))];
  const tripMap: Record<string, { title: string; destination?: string }> = {};

  if (tripIds.length > 0) {
    const { data: trips } = await supabase
      .from("trips")
      .select("id, title, destination")
      .in("id", tripIds);
    (trips ?? []).forEach((t: any) => {
      tripMap[t.id] = { title: t.title, destination: t.destination };
    });
  }

  return (data ?? []).map((c: any) => ({
    ...c,
    checklist: c.checklist ?? [],
    trip_title: tripMap[c.trip_id]?.title,
    trip_destination: tripMap[c.trip_id]?.destination,
  })) as BoardingCard[];
}

export async function fetchBoardingTrips(agencyId: string): Promise<MinTrip[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("id, code, title")
    .eq("agency_id", agencyId)
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as MinTrip[];
}

export async function fetchTripPassengersMin(tripId: string): Promise<PassengerMin[]> {
  const { data, error } = await supabase
    .from("trip_passengers")
    .select("id, full_name, document")
    .eq("trip_id", tripId);
  if (error) throw new Error(error.message);
  return (data ?? []) as PassengerMin[];
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function updateBoardingCardPositions(
  cardId: string,
  toStatus: string,
  reorderedIds: string[],
): Promise<void> {
  const { error } = await (supabase.rpc as any)("persist_boarding_card_move", {
    _card_id: cardId,
    _to_status: toStatus,
    _reordered_ids: reorderedIds,
  });
  if (error) throw new Error(error.message);
}

export async function updateBoardingCardChecklist(
  cardId: string,
  checklist: ChecklistItem[],
): Promise<void> {
  const { error } = await supabase
    .from("boarding_cards")
    .update({ checklist: checklist as never })
    .eq("id", cardId);
  if (error) throw new Error(error.message);
}

export type CreateBoardingCardPayload = {
  agencyId: string;
  tripId: string;
  pnr: string | null;
  airline: string | null;
  departureDate: string | null;
  paxCount: string | null;
  alerts: string[];
  passengersList: PassengerMin[];
};

export async function createBoardingCard(payload: CreateBoardingCardPayload): Promise<void> {
  const { agencyId, tripId, pnr, airline, departureDate, paxCount, alerts, passengersList } =
    payload;
  const { data: u } = await supabase.auth.getUser();

  const checklist =
    passengersList.length > 0
      ? passengersList.map((p) => ({
          label: `Check-in: ${p.full_name} (${p.document || "S/Doc"})`,
          done: false,
          passenger_id: p.id,
        }))
      : [
          { label: "Bilhetes emitidos", done: false },
          { label: "Check-in online realizado", done: false },
          { label: "Documentos verificados", done: false },
        ];

  const { error } = await (supabase as any).from("boarding_cards").insert({
    agency_id: agencyId,
    trip_id: tripId,
    pnr: pnr || null,
    airline: airline || null,
    status: "pending",
    created_by: u.user?.id,
    departure_date: departureDate || null,
    passengers_count: passengersList.length || (paxCount ? parseInt(paxCount) : null),
    alerts: alerts,
    checklist: checklist,
  });

  if (error) throw new Error(error.message);
}
