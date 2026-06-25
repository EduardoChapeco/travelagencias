import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type RoomRecord = Database["public"]["Tables"]["boarding_rooming_list"]["Row"];
export type InsertRoomRecord = Database["public"]["Tables"]["boarding_rooming_list"]["Insert"];

export interface RoomingPassenger {
  passenger_id: string;
  name: string;
  document?: string | null;
  meal_plan?: string | null;
}

// ─── Room type constants ───────────────────────────────────────────────────────
export const ROOM_TYPE_LABEL: Record<string, string> = {
  single: "Single (1 pax)",
  double: "Double (2 pax)",
  triple: "Triple (3 pax)",
  quad: "Quádruplo (4 pax)",
  suite: "Suíte",
};

export const ROOM_CAPACITY: Record<string, number> = {
  single: 1,
  double: 2,
  triple: 3,
  quad: 4,
  suite: 2,
};

// ─── Fetch by boarding card (embarques avulsos) ────────────────────────────────
/**
 * Fetch all rooms for a given boarding card.
 */
export async function fetchRoomingList(cardId: string): Promise<RoomRecord[]> {
  const { data, error } = await supabase
    .from("boarding_rooming_list")
    .select("*")
    .eq("card_id", cardId)
    .order("order_index", { ascending: true });

  if (error) throw new Error(`Error fetching rooming list: ${error.message}`);
  return data ?? [];
}

// ─── Fetch by group tour (excursões de grupo) ──────────────────────────────────
/**
 * Fetch all rooms for a given group tour (normalized table, not JSONB).
 */
export async function fetchRoomingListByTour(tourId: string): Promise<RoomRecord[]> {
  const { data, error } = await (supabase as any)
    .from("boarding_rooming_list")
    .select("*")
    .eq("group_tour_id", tourId)
    .order("order_index", { ascending: true });

  if (error) throw new Error(`Error fetching rooming list for tour: ${error.message}`);
  return data ?? [];
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Add a new room record.
 */
export async function createRoomRecord(
  payload: Omit<InsertRoomRecord, "id" | "created_at" | "updated_at">,
): Promise<RoomRecord> {
  const { data, error } = await supabase
    .from("boarding_rooming_list")
    .insert({
      ...payload,
      passengers: payload.passengers ?? [],
    })
    .select()
    .single();

  if (error) throw new Error(`Error creating room: ${error.message}`);
  return data;
}

/**
 * Update an existing room record (non-versioned — use for metadata changes).
 * For passenger allocation, prefer `allocatePassengerToRoom` which uses versioned RPC.
 */
export async function updateRoomRecord(
  roomId: string,
  patch: Partial<Omit<RoomRecord, "id" | "created_at" | "updated_at">>,
): Promise<void> {
  const { error } = await supabase
    .from("boarding_rooming_list")
    .update(patch as any)
    .eq("id", roomId);

  if (error) throw new Error(`Error updating room: ${error.message}`);
}

/**
 * Delete a room record.
 */
export async function deleteRoomRecord(roomId: string): Promise<void> {
  const { error } = await supabase.from("boarding_rooming_list").delete().eq("id", roomId);

  if (error) throw new Error(`Error deleting room: ${error.message}`);
}

// ─── Versioned Passenger allocation (uses optimistic locking RPC) ─────────────

/**
 * Allocate a passenger to a specific room using the versioned RPC.
 * Uses optimistic locking to prevent the "Lost Update" race condition.
 * Throws a ConflictError if another operator has modified the room concurrently.
 */
export async function allocatePassengerToRoom(
  roomId: string,
  currentPassengers: RoomingPassenger[],
  newPassenger: RoomingPassenger,
  currentVersion: number = 1,
): Promise<void> {
  if (currentPassengers.some((p) => p.passenger_id === newPassenger.passenger_id)) {
    // Already allocated — no-op
    return;
  }
  const updatedPassengers = [...currentPassengers, newPassenger];
  const success = await updatePassengersVersioned(roomId, updatedPassengers, currentVersion);
  if (!success) {
    throw new Error(
      "Conflito de edição: outro operador modificou este quarto ao mesmo tempo. Recarregue a lista e tente novamente.",
    );
  }
}

/**
 * Deallocate a passenger from a specific room using the versioned RPC.
 * Uses optimistic locking to prevent the "Lost Update" race condition.
 */
export async function deallocatePassengerFromRoom(
  roomId: string,
  currentPassengers: RoomingPassenger[],
  passengerId: string,
  currentVersion: number = 1,
): Promise<void> {
  const updatedPassengers = currentPassengers.filter((p) => p.passenger_id !== passengerId);
  const success = await updatePassengersVersioned(roomId, updatedPassengers, currentVersion);
  if (!success) {
    throw new Error(
      "Conflito de edição: outro operador modificou este quarto ao mesmo tempo. Recarregue a lista e tente novamente.",
    );
  }
}

/**
 * Internal: calls the versioned RPC to atomically update passenger list.
 * Returns true on success, false on version conflict.
 */
async function updatePassengersVersioned(
  roomId: string,
  passengers: RoomingPassenger[],
  version: number,
): Promise<boolean> {
  // update_rooming_list_versioned is now in types.ts (regenerated 2026-07-01)
  const { data, error } = await supabase.rpc("update_rooming_list_versioned", {
    _room_id: roomId,
    _passengers: passengers as unknown as ReturnType<typeof JSON.parse>,
    _version: version,
  });

  if (error) throw new Error(`Error in versioned room update: ${error.message}`);
  return data === true;
}
