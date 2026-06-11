import { supabase } from "@/integrations/supabase/client";

export async function fetchGroupTours(agencyId: string) {
  const { data, error } = await supabase
    .from("group_tours")
    .select(
      "id, title, destination, departure_date, return_date, base_price, total_seats, reserved_seats, status, is_public, slug, bus_layout_id",
    )
    .eq("agency_id", agencyId)
    .order("departure_date", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data;
}
