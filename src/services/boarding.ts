import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

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
  notes_internal?: string | null;
  internal_ref?: string | null;
  proposal_details?: ProposedDetails | null;
  briefing_date?: string | null;
  briefing_url?: string | null;
  // Voo
  departure_airport?: string | null;
  arrival_airport?: string | null;
  flight_number?: string | null;
  flight_date?: string | null;
  flight_class?: string | null;
  // Hotel
  hotel_name?: string | null;
  hotel_address?: string | null;
  hotel_checkin?: string | null;
  hotel_checkout?: string | null;
  hotel_phone?: string | null;
  // Transfer
  transfer_provider?: string | null;
  transfer_time?: string | null;
  transfer_vehicle?: string | null;
  // Guia & Emergência
  guide_name?: string | null;
  guide_phone?: string | null;
  guide_whatsapp?: string | null;
  emergency_phone?: string | null;
  // Destino
  destination?: string | null;
  destination_type?: string | null;
  pax_count?: number | null;
  documents_checklist?: unknown[];
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
      `id, agency_id, pnr, airline, status, alerts, trip_id, position, checklist,
       departure_date, passengers_count, tags, notes, internal_ref, briefing_date, briefing_url,
       departure_airport, arrival_airport, flight_number, flight_date, flight_class,
       hotel_name, hotel_address, hotel_checkin, hotel_checkout, hotel_phone,
       transfer_provider, transfer_time, transfer_vehicle,
       emergency_phone, guide_name, guide_phone, guide_whatsapp,
       notes_internal, destination, destination_type, pax_count, documents_checklist`,
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
      | "departure_airport"
      | "arrival_airport"
      | "flight_number"
      | "flight_date"
      | "flight_class"
      | "passengers_count"
      | "pax_count"
      | "tags"
      | "notes"
      | "notes_internal"
      | "internal_ref"
      | "alerts"
      | "briefing_date"
      | "briefing_url"
      | "hotel_name"
      | "hotel_address"
      | "hotel_checkin"
      | "hotel_checkout"
      | "hotel_phone"
      | "transfer_provider"
      | "transfer_time"
      | "transfer_vehicle"
      | "guide_name"
      | "guide_phone"
      | "guide_whatsapp"
      | "emergency_phone"
      | "destination"
      | "destination_type"
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

  const checklist: Json =
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

  const { error } = await supabase.from("boarding_cards").insert({
    agency_id: agencyId,
    trip_id: tripId,
    pnr: pnr || null,
    airline: airline || null,
    status: "pending",
    departure_date: departureDate || null,
    passengers_count: passengersList.length || (paxCount ? parseInt(paxCount) : null),
    alerts: alerts,
    checklist,
  });

  if (error) throw new Error(error.message);
}
