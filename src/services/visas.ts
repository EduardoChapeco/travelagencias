import { supabase } from "@/integrations/supabase/client";

export async function fetchVisaStages(agencyId: string) {
  await supabase.rpc("seed_default_visa_stages", { p_agency_id: agencyId });
  const { data, error } = await supabase
    .from("visa_stages")
    .select("*")
    .eq("agency_id", agencyId)
    .order("position");
  if (error) throw error;
  return data;
}

export async function fetchVisas(agencyId: string) {
  const { data, error } = await supabase
    .from("visas")
    .select("*, client:clients(full_name)")
    .eq("agency_id", agencyId)
    .is("deleted_at", null);
  if (error) throw error;
  return data;
}

export async function persistVisaMove(payload: {
  visaId: string;
  toStageId: string;
  reorderedIds: string[];
}) {
  const { error } = await supabase.rpc("persist_visa_move", {
    _visa_id: payload.visaId,
    _to_stage_id: payload.toStageId,
    _reordered_ids: payload.reorderedIds,
  });
  if (error) throw error;
}
