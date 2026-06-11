import { supabase } from "@/integrations/supabase/client";

export type Stage = {
  id: string;
  name: string;
  position: number;
  color: string;
  is_won: boolean;
  is_lost: boolean;
};

export type Lead = {
  id: string;
  stage_id: string;
  owner_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  destination: string | null;
  estimated_value: number;
  pax_count: number;
  source: string | null;
  position: number;
  created_at: string;
  // Extended fields from the DB schema
  agency_id: string;
  client_id: string | null;
  notes: string | null;
  travel_start: string | null;
  travel_end: string | null;
  closed_at: string | null;
  lost_reason: string | null;
  [key: string]: unknown;
};

export type Activity = {
  id: string;
  lead_id: string;
  author_id: string | null;
  agency_id: string;
  type: string;
  content: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function fetchStages(agencyId: string): Promise<Stage[]> {
  const { data, error } = await supabase
    .from("lead_stages")
    .select("*")
    .eq("agency_id", agencyId)
    .order("position");
  if (error) throw error;
  return data as Stage[];
}

export async function fetchLeads(agencyId: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("agency_id", agencyId)
    .is("deleted_at", null);
  if (error) throw error;
  return (data as unknown as Lead[]).sort((a, b) => a.position - b.position);
}

export async function fetchAgencyUsers(agencyId: string) {
  const { data, error } = await supabase
    .from("vw_admin_agents")
    .select("user_id, user_name, role")
    .eq("agency_id", agencyId);
  if (error) throw error;
  return data;
}

export async function initDefaultStages(agencyId: string) {
  const defaults = [
    { name: "Novo Lead", color: "#94A3B8", position: 0 },
    { name: "Em Contato", color: "#60A5FA", position: 1 },
    { name: "Cotação Enviada", color: "#FBBF24", position: 2 },
    { name: "Ganho", color: "#10B981", position: 3, is_won: true },
    { name: "Perdido", color: "#EF4444", position: 4, is_lost: true },
  ];
  for (const s of defaults) {
    const { error } = await supabase.from("lead_stages").insert({ agency_id: agencyId, ...s });
    if (error) throw error;
  }
}

export async function archiveLead(leadId: string) {
  const { error } = await supabase
    .from("leads")
    .update({ deleted_at: new Date().toISOString() } as any)
    .eq("id", leadId);
  if (error) throw error;
}

export async function transferLead(leadId: string, newOwnerId: string) {
  const { error } = await supabase.from("leads").update({ owner_id: newOwnerId }).eq("id", leadId);
  if (error) throw error;
}

export async function persistLeadMove(payload: {
  leadId: string;
  fromStageId: string;
  toStageId: string;
  reorderedIds: string[];
  agencyId: string;
  stages: Stage[];
}) {
  const { error } = await (supabase.rpc as any)("persist_lead_move", {
    _lead_id: payload.leadId,
    _to_stage_id: payload.toStageId,
    _reordered_ids: payload.reorderedIds,
  });
  if (error) throw error;

  if (payload.fromStageId !== payload.toStageId) {
    const fromName = payload.stages.find((s) => s.id === payload.fromStageId)?.name ?? "—";
    const toName = payload.stages.find((s) => s.id === payload.toStageId)?.name ?? "—";
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from("lead_activities").insert({
      lead_id: payload.leadId,
      agency_id: payload.agencyId,
      author_id: user?.id ?? null,
      type: "stage_change",
      content: `Movido de ${fromName} para ${toName}`,
      metadata: { from: payload.fromStageId, to: payload.toStageId },
    });
  }
}

export async function createLead(agencyId: string, f: any) {
  const user = (await supabase.auth.getUser()).data.user;
  const { error } = await supabase.from("leads").insert({
    agency_id: agencyId,
    stage_id: f.stage_id,
    owner_id: user?.id,
    name: f.name,
    email: f.email || null,
    phone: f.phone || null,
    destination: f.destination || null,
    travel_start: f.travel_start || null,
    travel_end: f.travel_end || null,
    pax_count: f.pax_count,
    estimated_value: f.estimated_value,
    source: f.source || null,
    notes: f.notes || null,
  });
  if (error) throw error;
}

export async function saveStageUpdates(agencyId: string, localStages: Stage[]) {
  const { error } = await (supabase.rpc as any)("save_lead_stages_updates", {
    _agency_id: agencyId,
    _stages: localStages as any,
  });
  if (error) throw error;
}

export async function getLeadsCountInStage(stageId: string): Promise<number> {
  const { count, error } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("stage_id", stageId)
    .is("deleted_at", null);
  if (error) throw error;
  return count || 0;
}

export async function moveLeadsToStage(fromStageId: string, toStageId: string) {
  const { error } = await supabase
    .from("leads")
    .update({ stage_id: toStageId })
    .eq("stage_id", fromStageId);
  if (error) throw error;
}

export async function deleteStage(stageId: string) {
  const { error } = await supabase.from("lead_stages").delete().eq("id", stageId);
  if (error) throw error;
}

// ─── Lead Details & Activities ────────────────────────────────────────────────

export async function fetchLeadById(leadId: string): Promise<Lead | null> {
  const { data, error } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
  if (error) throw error;
  return data as Lead | null;
}

export async function fetchLeadActivities(leadId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("lead_activities")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as Activity[];
}

export async function fetchLeadOwnerProfile(ownerId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", ownerId)
    .maybeSingle();
  return data;
}

export async function promoteLeadToClient(leadId: string) {
  const { data, error } = await (supabase.rpc as any)("promote_lead_to_client", {
    _lead_id: leadId,
  });
  if (error) throw error;
  return data;
}

export async function updateLead(leadId: string, payload: Partial<Lead>) {
  const { error } = await supabase
    .from("leads")
    .update(payload as any)
    .eq("id", leadId);
  if (error) throw error;
}

export async function addLeadActivity(payload: {
  leadId: string;
  agencyId: string;
  type: string;
  content: string;
  metadata?: any;
}) {
  const user = (await supabase.auth.getUser()).data.user;
  const { error } = await (supabase as any).from("lead_activities").insert({
    lead_id: payload.leadId,
    agency_id: payload.agencyId,
    author_id: user?.id ?? null,
    type: payload.type,
    content: payload.content,
    metadata: payload.metadata,
  });
  if (error) throw error;
}

export async function updateLeadActivity(activityId: string, content: string | null) {
  const { error } = await supabase
    .from("lead_activities")
    .update({ content } as any)
    .eq("id", activityId);
  if (error) throw error;
}

export async function deleteLeadActivity(activityId: string) {
  const { error } = await supabase.from("lead_activities").delete().eq("id", activityId);
  if (error) throw error;
}
