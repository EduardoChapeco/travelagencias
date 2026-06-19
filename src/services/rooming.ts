import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type RoomRecord = Database["public"]["Tables"]["boarding_rooming_list"]["Row"];
export type InsertRoomRecord = Database["public"]["Tables"]["boarding_rooming_list"]["Insert"];

export interface RoomingPassenger {
  id: string;
  name: string;
  document?: string | null;
}

/**
 * Fetch all rooms/allocations for a given boarding card (which represents the group tour hotel)
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

/**
 * Add a new room/allocation record
 */
export async function createRoomRecord(payload: Omit<InsertRoomRecord, "id" | "created_at" | "updated_at">): Promise<RoomRecord> {
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
 * Update an existing room record
 */
export async function updateRoomRecord(
  roomId: string,
  patch: Partial<Omit<RoomRecord, "id" | "created_at" | "updated_at">>
): Promise<void> {
  const { error } = await supabase
    .from("boarding_rooming_list")
    .update(patch as any)
    .eq("id", roomId);

  if (error) throw new Error(`Error updating room: ${error.message}`);
}

/**
 * Delete a room record
 */
export async function deleteRoomRecord(roomId: string): Promise<void> {
  const { error } = await supabase
    .from("boarding_rooming_list")
    .delete()
    .eq("id", roomId);

  if (error) throw new Error(`Error deleting room: ${error.message}`);
}

/**
 * Allocate a passenger to a specific room
 */
export async function allocatePassengerToRoom(
  roomId: string,
  currentPassengers: RoomingPassenger[],
  newPassenger: RoomingPassenger
): Promise<void> {
  // Prevent duplicate allocations in the same room
  if (currentPassengers.some((p) => p.id === newPassenger.id)) {
    return;
  }

  const updatedPassengers = [...currentPassengers, newPassenger];

  await updateRoomRecord(roomId, {
    passengers: updatedPassengers as any,
  });
}

/**
 * Deallocate a passenger from a specific room
 */
export async function deallocatePassengerFromRoom(
  roomId: string,
  currentPassengers: RoomingPassenger[],
  passengerId: string
): Promise<void> {
  const updatedPassengers = currentPassengers.filter((p) => p.id !== passengerId);

  await updateRoomRecord(roomId, {
    passengers: updatedPassengers as any,
  });
}
