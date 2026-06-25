import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Trip = Database["public"]["Tables"]["trips"]["Row"];
export type Passenger = Database["public"]["Tables"]["trip_passengers"]["Row"];
export type BoardingCard = Database["public"]["Tables"]["boarding_cards"]["Row"];
export type FinancialRecord = Database["public"]["Tables"]["financial_records"]["Row"];

export interface TripAggregate {
  trip: Trip;
  passengers: Passenger[];
  boardingCards: BoardingCard[];
  financialRecords: FinancialRecord[];
}

/**
 * Fetch a unified view of a trip and all its children/associated aggregates
 */
export async function fetchTripAggregate(tripId: string): Promise<TripAggregate> {
  // Fetch trip
  const { data: trip, error: tripErr } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .maybeSingle();

  if (tripErr) throw new Error(`Error fetching trip: ${tripErr.message}`);
  if (!trip) throw new Error("Trip not found");

  // Fetch passengers
  const { data: passengers, error: paxErr } = await supabase
    .from("trip_passengers")
    .select("*")
    .eq("trip_id", tripId);

  if (paxErr) throw new Error(`Error fetching passengers: ${paxErr.message}`);

  // Fetch boarding cards
  const { data: boardingCards, error: cardErr } = await supabase
    .from("boarding_cards")
    .select("*")
    .eq("trip_id", tripId);

  if (cardErr) throw new Error(`Error fetching boarding cards: ${cardErr.message}`);

  // Fetch financial records
  const { data: financialRecords, error: finErr } = await supabase
    .from("financial_records")
    .select("*")
    .eq("trip_id", tripId);

  if (finErr) throw new Error(`Error fetching financial records: ${finErr.message}`);

  return {
    trip,
    passengers: passengers ?? [],
    boardingCards: boardingCards ?? [],
    financialRecords: financialRecords ?? [],
  };
}

/**
 * Update the operational and lifecycle status of a trip
 */
export async function updateTripLifecycleStatus(
  tripId: string,
  lifecycleStatus: string,
  operationalStatus?: Database["public"]["Enums"]["trip_status"],
): Promise<void> {
  const updatePayload: Partial<Trip> = {
    lifecycle_status: lifecycleStatus,
  };

  if (operationalStatus) {
    updatePayload.status = operationalStatus;
  }

  const { error } = await supabase
    .from("trips")
    .update(updatePayload as any)
    .eq("id", tripId);

  if (error) throw new Error(`Error updating trip status: ${error.message}`);
}
