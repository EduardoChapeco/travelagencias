import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type FlightSegment = Database["public"]["Tables"]["flight_segments"]["Row"];

export type FlightItinerary = Database["public"]["Tables"]["flight_itineraries"]["Row"] & {
  segments: FlightSegment[];
};

export type InsertFlightItinerary = Database["public"]["Tables"]["flight_itineraries"]["Insert"];
export type InsertFlightSegment = Database["public"]["Tables"]["flight_segments"]["Insert"];

export const ITINERARY_TYPE_LABELS: Record<string, string> = {
  original: "Itinerário Original",
  operator_suggestion: "Alteração Sugerida pela Operadora",
  customer_selected: "Escolha do Cliente",
  confirmed: "Itinerário Confirmado",
};

export const ITINERARY_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativo / Vigente",
  archived: "Arquivado",
};

/** Busca todos os itinerários de voo de uma viagem, incluindo seus segmentos */
export async function fetchFlightItineraries(tripId: string): Promise<FlightItinerary[]> {
  const { data: itineraries, error } = await supabase
    .from("flight_itineraries")
    .select(
      `
      *,
      segments:flight_segments(*)
    `,
    )
    .eq("trip_id", tripId)
    .order("version", { ascending: false });

  if (error) throw new Error(`Erro ao carregar itinerários: ${error.message}`);

  // Sort segments inside each itinerary by segment_order
  return (itineraries ?? []).map((it) => ({
    ...it,
    segments: ((it.segments as FlightSegment[]) ?? []).sort(
      (a, b) => a.segment_order - b.segment_order,
    ),
  }));
}

/** Cria um novo itinerário com seus respectivos segmentos de voo */
export async function createFlightItinerary(
  itinerary: Omit<InsertFlightItinerary, "id" | "created_at" | "updated_at">,
  segments: Omit<InsertFlightSegment, "id" | "itinerary_id" | "created_at" | "updated_at">[],
): Promise<FlightItinerary> {
  // Get current max version for the trip
  const { data: existing } = await supabase
    .from("flight_itineraries")
    .select("version")
    .eq("trip_id", itinerary.trip_id)
    .order("version", { ascending: false })
    .limit(1);

  const nextVersion = existing && existing.length > 0 ? existing[0].version + 1 : 1;

  // Insert itinerary
  const { data: newItinerary, error: itError } = await supabase
    .from("flight_itineraries")
    .insert({
      ...itinerary,
      version: nextVersion,
    })
    .select()
    .single();

  if (itError) throw new Error(`Erro ao salvar itinerário: ${itError.message}`);

  // Insert segments
  if (segments.length > 0) {
    const segmentsToInsert = segments.map((seg, index) => ({
      ...seg,
      itinerary_id: newItinerary.id,
      segment_order: seg.segment_order || index + 1,
    }));

    const { error: segError } = await supabase.from("flight_segments").insert(segmentsToInsert);

    if (segError) {
      // Rollback itinerary if segments fail
      await supabase.from("flight_itineraries").delete().eq("id", newItinerary.id);
      throw new Error(`Erro ao salvar trechos de voo: ${segError.message}`);
    }
  }

  // Fetch full aggregate
  const { data: fullItinerary, error: fetchError } = await supabase
    .from("flight_itineraries")
    .select(
      `
      *,
      segments:flight_segments(*)
    `,
    )
    .eq("id", newItinerary.id)
    .single();

  if (fetchError) throw fetchError;
  return {
    ...fullItinerary,
    segments: ((fullItinerary.segments as FlightSegment[]) ?? []).sort(
      (a, b) => a.segment_order - b.segment_order,
    ),
  };
}

/** Atualiza o status de um itinerário e faz a manutenção dos vigentes */
export async function setItineraryActive(itineraryId: string, tripId: string): Promise<void> {
  // First, set all other itineraries for this trip as archived
  const { error: archiveError } = await supabase
    .from("flight_itineraries")
    .update({ status: "archived" })
    .eq("trip_id", tripId)
    .eq("status", "active");

  if (archiveError) throw archiveError;

  // Set the selected one as active
  const { error: activeError } = await supabase
    .from("flight_itineraries")
    .update({ status: "active" })
    .eq("id", itineraryId);

  if (activeError) throw activeError;
}

/** Remove um itinerário */
export async function deleteFlightItinerary(itineraryId: string): Promise<void> {
  const { error } = await supabase.from("flight_itineraries").delete().eq("id", itineraryId);

  if (error) throw new Error(`Erro ao remover itinerário: ${error.message}`);
}

// ─── Motor de Comparação Determinística (Diff) ──────────────────────────────

export interface SegmentDiff {
  segment_order: number;
  airline_changed: boolean;
  flight_number_changed: boolean;
  origin_changed: boolean;
  destination_changed: boolean;
  departure_changed: boolean;
  arrival_changed: boolean;
  departure_delta_minutes: number;
  arrival_delta_minutes: number;
  baggage_changed: boolean;
  cabin_changed: boolean;
  record_locator_changed: boolean;
}

export interface ItineraryDiff {
  segmentsDiff: SegmentDiff[];
  segment_count_delta: number;
  has_changes: boolean;
}

export function compareItineraries(
  original: FlightSegment[],
  comparison: FlightSegment[],
): ItineraryDiff {
  const sortedOrig = [...original].sort((a, b) => a.segment_order - b.segment_order);
  const sortedComp = [...comparison].sort((a, b) => a.segment_order - b.segment_order);

  const segmentsDiff: SegmentDiff[] = [];
  const maxLen = Math.max(sortedOrig.length, sortedComp.length);
  let has_changes = false;

  for (let i = 0; i < maxLen; i++) {
    const orig = sortedOrig[i];
    const comp = sortedComp[i];

    if (!orig || !comp) {
      has_changes = true;
      continue;
    }

    const depOrig = new Date(orig.departure_at).getTime();
    const depComp = new Date(comp.departure_at).getTime();
    const arrOrig = new Date(orig.arrival_at).getTime();
    const arrComp = new Date(comp.arrival_at).getTime();

    const depDelta = Math.round((depComp - depOrig) / 60000);
    const arrDelta = Math.round((arrComp - arrOrig) / 60000);

    const airlineChanged = orig.airline_code !== comp.airline_code;
    const flightNumChanged = orig.flight_number !== comp.flight_number;
    const originChanged = orig.origin_iata !== comp.origin_iata;
    const destChanged = orig.destination_iata !== comp.destination_iata;
    const depChanged = depDelta !== 0;
    const arrChanged = arrDelta !== 0;
    const bagChanged = (orig.baggage || "") !== (comp.baggage || "");
    const cabinChanged = (orig.cabin || "") !== (comp.cabin || "");
    const locatorChanged = (orig.record_locator || "") !== (comp.record_locator || "");

    if (
      airlineChanged ||
      flightNumChanged ||
      originChanged ||
      destChanged ||
      depChanged ||
      arrChanged ||
      bagChanged ||
      cabinChanged ||
      locatorChanged
    ) {
      has_changes = true;
    }

    segmentsDiff.push({
      segment_order: comp.segment_order || i + 1,
      airline_changed: airlineChanged,
      flight_number_changed: flightNumChanged,
      origin_changed: originChanged,
      destination_changed: destChanged,
      departure_changed: depChanged,
      arrival_changed: arrChanged,
      departure_delta_minutes: depDelta,
      arrival_delta_minutes: arrDelta,
      baggage_changed: bagChanged,
      cabin_changed: cabinChanged,
      record_locator_changed: locatorChanged,
    });
  }

  return {
    segmentsDiff,
    segment_count_delta: sortedComp.length - sortedOrig.length,
    has_changes: has_changes || sortedComp.length !== sortedOrig.length,
  };
}
