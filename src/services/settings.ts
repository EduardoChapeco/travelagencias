import { supabase } from "@/integrations/supabase/client";

// ─── Settings / Company Profile ────────────────────────────────────────────────

export async function fetchAgencySettings(agencyId: string) {
  const [a, p] = await Promise.all([
    supabase.from("agencies").select("*").eq("id", agencyId).maybeSingle(),
    supabase.from("agency_private").select("*").eq("agency_id", agencyId).maybeSingle(),
  ]);
  return { agency: a.data, priv: p.data };
}

export async function fetchCompanyProfile(agencyId: string) {
  const { data } = await supabase.from("company_profiles").select("*").eq("agency_id", agencyId).maybeSingle();
  return data;
}

export async function saveCompanyProfile(agencyId: string, payload: any, agencyPayload: any, privatePayload: any) {
  const existing = await fetchCompanyProfile(agencyId);
  const u = (await supabase.auth.getUser()).data.user;

  if (existing) {
    await supabase.from("company_profiles").update(payload).eq("agency_id", agencyId);
  } else {
    await supabase.from("company_profiles").insert({ ...payload, agency_id: agencyId });
  }

  if (agencyPayload) {
    await supabase.from("agencies").update(agencyPayload).eq("id", agencyId);
  }
  
  if (privatePayload) {
    await supabase.from("agency_private").upsert({ agency_id: agencyId, ...privatePayload });
  }

  await (supabase as any).from("audit_log").insert({
    agency_id: agencyId, user_id: u?.id, action: "update_company_profile", details: payload
  });
}

export async function saveSettings(agencyId: string, payload: any, agencyPayload: any, privatePayload: any) {
  // Aliased to saveCompanyProfile as they share logic
  return saveCompanyProfile(agencyId, payload, agencyPayload, privatePayload);
}

// ─── API Keys ────────────────────────────────────────────────────────────────

export async function fetchApiKeys(agencyId: string, provider?: string) {
  let q = supabase.from("api_keys").select("*").eq("agency_id", agencyId);
  if (provider) q = q.eq("provider", provider);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function saveApiKey(agencyId: string, payload: any) {
  const existing = await supabase.from("api_keys").select("id").eq("agency_id", agencyId).eq("provider", payload.provider).maybeSingle();
  if (existing.data) {
    const { error } = await supabase.from("api_keys").update(payload).eq("id", existing.data.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("api_keys").insert({ ...payload, agency_id: agencyId });
    if (error) throw error;
  }
}

export async function createApiKey(payload: any) {
  const { error } = await supabase.from("api_keys").insert(payload);
  if (error) throw error;
}

export async function toggleApiKey(id: string, is_active: boolean) {
  const { error } = await supabase.from("api_keys").update({ is_active }).eq("id", id);
  if (error) throw error;
}

export async function deleteApiKey(id: string) {
  const { error } = await supabase.from("api_keys").delete().eq("id", id);
  if (error) throw error;
}

// ─── Team ─────────────────────────────────────────────────────────────────────

export async function fetchTeamMembers(agencyId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("id, user_id, role, created_at")
    .eq("agency_id", agencyId);
  if (error) throw error;
  const ids = (data ?? []).map((r) => r.user_id);
  if (ids.length === 0) return [];
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", ids);
  const byId = new Map((profs ?? []).map((p) => [p.id, p]));
  return (data ?? []).map((r) => ({ ...r, profile: byId.get(r.user_id) ?? null }));
}

export async function fetchTeamInvites(agencyId: string) {
  const { data, error } = await supabase
    .from("agency_invites")
    .select("id, email, role, token, expires_at, accepted_at, created_at")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function inviteTeamMember(agencyId: string, email: string, role: string) {
  const { data, error } = await supabase
    .from("agency_invites")
    .insert({ agency_id: agencyId, email, role: role as "agency_admin" | "agent" })
    .select("token")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTeamInvite(id: string) {
  const { error } = await supabase.from("agency_invites").delete().eq("id", id);
  if (error) throw error;
}

export async function removeTeamMember(agencyId: string, userId: string) {
  const { error } = await supabase.from("user_roles").delete().eq("agency_id", agencyId).eq("user_id", userId);
  if (error) throw error;
}

export async function changeTeamMemberRole(agencyId: string, userId: string, role: string) {
  const { error } = await (supabase as any).from("user_roles").update({ role }).eq("agency_id", agencyId).eq("user_id", userId);
  if (error) throw error;
}



