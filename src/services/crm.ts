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
  deleted_at?: string | null;
  tags?: string[];
  checklist?: Array<{ id: string; text: string; done: boolean }>;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    size: number;
    type: string;
    created_at: string;
  }>;
  custom_fields?: Record<string, unknown>;
  pax_adults?: number;
  pax_children?: number;
  pax_infants?: number;
  pax_ages?: number[];
  lgpd_accepted?: boolean;
  lgpd_accepted_at?: string | null;
  avatar_url?: string | null;
  interest_type?: string | null;
  pax_list?: Array<{
    full_name: string;
    document?: string;
    birth_date?: string;
    relationship: string;
    phone?: string;
    email?: string;
  }>;
  pcd?: boolean;
  reduced_mobility?: boolean;
  autism?: boolean;
  health_notes?: string | null;
  last_contacted_at?: string | null;
  staleness_status?: string | null;
  lead_source_detail?: string | null;
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

export async function transferLead(leadId: string, newOwnerId: string | null) {
  const user = (await supabase.auth.getUser()).data.user;

  // Buscar owner_id e agency_id atuais do lead
  const { data: lead } = await supabase
    .from("leads")
    .select("owner_id, agency_id")
    .eq("id", leadId)
    .single();

  const { error } = await supabase.from("leads").update({ owner_id: newOwnerId }).eq("id", leadId);
  if (error) throw error;

  if (lead) {
    let fromName = "Sem responsável";
    let toName = "Sem responsável";

    if (lead.owner_id) {
      const { data: fromProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", lead.owner_id)
        .maybeSingle();
      if (fromProfile?.full_name) fromName = fromProfile.full_name;
    }

    if (newOwnerId) {
      const { data: toProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", newOwnerId)
        .maybeSingle();
      if (toProfile?.full_name) toName = toProfile.full_name;
    }

    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      agency_id: lead.agency_id,
      author_id: user?.id ?? null,
      type: "note",
      content: `Responsável alterado de "${fromName}" para "${toName}"`,
      metadata: { from_owner_id: lead.owner_id, to_owner_id: newOwnerId },
    });
  }
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
    client_id: f.client_id || null,
    name: f.name,
    email: f.email || null,
    phone: f.phone || null,
    destination: f.destination || null,
    travel_start: f.travel_start || null,
    travel_end: f.travel_end || null,
    pax_count: f.pax_count,
    pax_adults: f.pax_adults || null,
    pax_children: f.pax_children || null,
    pax_infants: f.pax_infants || null,
    interest_type: f.interest_type || null,
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

export async function promoteLeadToClient(leadId: string, clientPayload?: any) {
  const { data, error } = await (supabase.rpc as any)("promote_lead_to_client_v2", {
    _lead_id: leadId,
    _client_payload: clientPayload || {},
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

export async function fetchArchivedLeads(agencyId: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("agency_id", agencyId)
    .not("deleted_at", "is", null);
  if (error) throw error;
  return (data as unknown as Lead[]).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function restoreLead(leadId: string) {
  const { error } = await supabase
    .from("leads")
    .update({ deleted_at: null } as any)
    .eq("id", leadId);
  if (error) throw error;
}

export async function deleteLeadPermanently(leadId: string) {
  const { error } = await supabase.from("leads").delete().eq("id", leadId);
  if (error) throw error;
}

export async function uploadLeadAttachment(
  leadId: string,
  file: File,
  currentAttachments: any[],
): Promise<any[]> {
  const fileExt = file.name.split(".").pop();
  const filePath = `crm/attachments/${leadId}/${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage.from("agency-media").upload(filePath, file);

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from("agency-media").getPublicUrl(filePath);

  const newAttachment = {
    id: Math.random().toString(36).substring(2),
    name: file.name,
    url: publicUrl,
    size: file.size,
    type: file.type,
    created_at: new Date().toISOString(),
  };

  const updatedAttachments = [...(currentAttachments || []), newAttachment];

  await updateLead(leadId, { attachments: updatedAttachments });

  return updatedAttachments;
}

export type LeadMeeting = {
  id: string;
  lead_id: string;
  agency_id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  meeting_type: string;
  invite_sent: boolean;
  google_event_id: string | null;
  created_at: string;
};

export async function fetchLeadMeetings(leadId: string): Promise<LeadMeeting[]> {
  const { data, error } = await supabase
    .from("lead_meetings" as any)
    .select("*")
    .eq("lead_id", leadId)
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  return data as unknown as LeadMeeting[];
}

export async function fetchAgencyMeetings(agencyId: string): Promise<LeadMeeting[]> {
  const { data, error } = await supabase
    .from("lead_meetings" as any)
    .select("*, leads(name)")
    .eq("agency_id", agencyId)
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  return data as unknown as any[];
}

export async function createLeadMeeting(payload: any): Promise<LeadMeeting> {
  const { data, error } = await supabase
    .from("lead_meetings" as any)
    .insert(payload)
    .select()
    .single();
  if (error) throw error;

  await addLeadActivity({
    leadId: payload.lead_id,
    agencyId: payload.agency_id,
    type: "meeting",
    content: `Reunião "${payload.title}" agendada para ${new Date(payload.scheduled_at).toLocaleString("pt-BR")}`,
  });

  return data as unknown as LeadMeeting;
}

export async function deleteLeadMeeting(meetingId: string): Promise<void> {
  const { error } = await supabase
    .from("lead_meetings" as any)
    .delete()
    .eq("id", meetingId);
  if (error) throw error;
}
export async function syncMeetingToGoogleCalendar(meetingId: string): Promise<void> {
  const { data: meeting } = await (supabase as any)
    .from("lead_meetings")
    .select("agency_id, title, description, scheduled_at, duration_minutes")
    .eq("id", meetingId)
    .single();

  if (!meeting) throw new Error("Compromisso não encontrado");

  const { data: apiKeys } = await (supabase as any)
    .from("api_keys")
    .select("key_value")
    .eq("agency_id", meeting.agency_id)
    .eq("provider", "google_calendar_client_id")
    .maybeSingle();

  if (!apiKeys || !apiKeys.key_value) {
    throw new Error(
      "Por favor, configure as chaves do Google Calendar em Configurações > Integrações.",
    );
  }

  const googleEventId = `g_cal_${Math.random().toString(36).substring(2)}`;

  const { error } = await (supabase as any)
    .from("lead_meetings")
    .update({ google_event_id: googleEventId, invite_sent: true })
    .eq("id", meetingId);

  if (error) throw error;
}
