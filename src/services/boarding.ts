import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChecklistItem = { label: string; done: boolean; passenger_id?: string };

export type ProposedFlight = {
  origin: string;
  destination: string;
  date: string;
  departure_time: string;
  arrival_time: string;
  airline: string;
  flight_number: string;
};

export type ProposedHotel = {
  name: string;
  city: string;
  checkin: string;
  checkout: string;
};

export type ProposedDetails = {
  id: string;
  title: string;
  flights: ProposedFlight[];
  hotels: ProposedHotel[];
};

export type BoardingCard = {
  id: string;
  agency_id?: string;
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
  tags?: string[];
  notes?: string | null;
  internal_ref?: string | null;
  proposal_details?: ProposedDetails | null;
  briefing_date?: string | null;
  briefing_url?: string | null;
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
      "id, pnr, airline, status, alerts, trip_id, position, checklist, departure_date, passengers_count, tags, notes, internal_ref, briefing_date, briefing_url",
    )
    .eq("agency_id", agencyId)
    .order("position");
  if (error) throw new Error(error.message);

  const tripIds = [...new Set((data ?? []).map((c: any) => c.trip_id))];
  const tripMap: Record<
    string,
    { title: string; destination?: string; proposal_id?: string | null }
  > = {};
  const proposalMap: Record<string, ProposedDetails> = {};

  if (tripIds.length > 0) {
    const { data: trips } = await supabase
      .from("trips")
      .select("id, title, destination, proposal_id")
      .in("id", tripIds);
    (trips ?? []).forEach((t: any) => {
      tripMap[t.id] = { title: t.title, destination: t.destination, proposal_id: t.proposal_id };
    });

    const proposalIds = [...new Set((trips ?? []).map((t: any) => t.proposal_id).filter(Boolean))];
    if (proposalIds.length > 0) {
      const { data: proposals } = await supabase
        .from("proposals")
        .select("id, title, flights, hotels")
        .in("id", proposalIds);
      (proposals ?? []).forEach((p: any) => {
        proposalMap[p.id] = {
          id: p.id,
          title: p.title,
          flights: (p.flights ?? []) as ProposedFlight[],
          hotels: (p.hotels ?? []) as ProposedHotel[],
        };
      });
    }
  }

  return (data ?? []).map((c: any) => {
    const t = tripMap[c.trip_id];
    const pId = t?.proposal_id;
    return {
      ...c,
      checklist: c.checklist ?? [],
      trip_title: t?.title,
      trip_destination: t?.destination,
      proposal_details: pId ? proposalMap[pId] : null,
    };
  }) as BoardingCard[];
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

export async function updateBoardingCard(
  cardId: string,
  patch: Partial<
    Pick<
      BoardingCard,
      | "pnr"
      | "airline"
      | "departure_date"
      | "passengers_count"
      | "tags"
      | "notes"
      | "internal_ref"
      | "alerts"
      | "briefing_date"
      | "briefing_url"
    >
  >,
): Promise<void> {
  const { error } = await supabase
    .from("boarding_cards")
    .update(patch as never)
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
