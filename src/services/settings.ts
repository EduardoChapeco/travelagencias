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
  const { data } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("agency_id", agencyId)
    .maybeSingle();
  return data;
}

export async function saveCompanyProfile(
  agencyId: string,
  payload: any,
  agencyPayload: any,
  privatePayload: any,
) {
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

  await supabase.from("audit_log").insert({
    agency_id: agencyId,
    actor_id: u?.id,
    action: "update_company_profile",
    metadata: payload,
  });
}

export async function saveSettings(
  agencyId: string,
  payload: any,
  agencyPayload: any,
  privatePayload: any,
) {
  // Aliased to saveCompanyProfile as they share logic
  return saveCompanyProfile(agencyId, payload, agencyPayload, privatePayload);
}

// ─── API Keys para IA (ai-orchestrator → tabela ai_api_credentials) ──────────

export async function fetchApiKeys(agencyId: string, provider?: string) {
  const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
    body: { action: "list-credentials", agency_id: agencyId },
  });
  if (error) throw error;

  const credentials = data?.credentials || [];
  const mapped = credentials.map((c: any) => ({
    id: c.id,
    agency_id: agencyId,
    provider: c.provider_code,
    key_value: c.masked_hint,
    label: c.label,
    is_active: c.status === "healthy",
    created_at: c.created_at,
  }));

  if (provider) {
    return mapped.filter((m: any) => m.provider === provider);
  }
  return mapped;
}

export async function saveApiKey(agencyId: string, payload: any) {
  const { error } = await supabase.functions.invoke("ai-orchestrator", {
    body: {
      action: "save-credential",
      agency_id: agencyId,
      provider: payload.provider,
      key_value: payload.key_value,
      label: payload.label,
      monthly_limit: payload.monthly_limit,
      priority: payload.priority,
      upsert_by: payload.upsert_by,
    },
  });
  if (error) throw error;
}

export async function createApiKey(payload: any) {
  const { error } = await supabase.functions.invoke("ai-orchestrator", {
    body: {
      action: "save-credential",
      agency_id: payload.agency_id,
      provider: payload.provider,
      key_value: payload.key_value,
      label: payload.label,
      monthly_limit: payload.monthly_limit,
      priority: payload.priority,
      upsert_by: payload.upsert_by,
    },
  });
  if (error) throw error;
}

export async function toggleApiKey(id: string, is_active: boolean) {
  const status = is_active ? "healthy" : "disabled";
  const { error } = await supabase
    .from("ai_api_credentials")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteApiKey(id: string) {
  const { error } = await supabase.from("ai_api_credentials").delete().eq("id", id);
  if (error) throw error;
}

// ─── Integration Manager — Credenciais Gerais da Agência ────────────────────
// (integration-manager → tabela api_keys)
// Usado para: operadoras Infotravel, Meta/WhatsApp, Gmail OAuth, etc.

export interface IntegrationCredential {
  id: string;
  agency_id: string;
  provider: string;
  label: string;
  key_value: string;
  key_value_masked?: string;
  category: string;
  operator_id: string | null;
  operator_name: string | null;
  metadata: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface InfotravelOperator {
  operator_id: string;
  operator_name: string;
  is_active: boolean;
  updated_at?: string;
}

/** Salva (upsert) uma credencial de integração geral */
export async function saveIntegrationCredential(
  agencyId: string,
  payload: {
    provider: string;
    key_value: string;
    label?: string;
    category?: string;
    operator_id?: string;
    operator_name?: string;
    metadata?: Record<string, any>;
    is_active?: boolean;
  },
) {
  const { error } = await supabase.functions.invoke("integration-manager", {
    body: {
      action: "save",
      agency_id: agencyId,
      ...payload,
    },
  });
  if (error) throw error;
}

/** Lista credenciais de integração geral com filtros opcionais */
export async function fetchIntegrationCredentials(
  agencyId: string,
  options?: { category?: string; operator_id?: string },
): Promise<IntegrationCredential[]> {
  const { data, error } = await supabase.functions.invoke("integration-manager", {
    body: {
      action: "list",
      agency_id: agencyId,
      ...options,
    },
  });
  if (error) throw error;
  return data?.credentials ?? [];
}

/** Deleta uma credencial de integração geral por ID */
export async function deleteIntegrationCredential(agencyId: string, id: string) {
  const { error } = await supabase.functions.invoke("integration-manager", {
    body: { action: "delete", agency_id: agencyId, id },
  });
  if (error) throw error;
}

/** Lista todas as operadoras Infotravel cadastradas para a agência */
export async function fetchOperators(agencyId: string): Promise<InfotravelOperator[]> {
  const { data, error } = await supabase.functions.invoke("integration-manager", {
    body: { action: "list-operators", agency_id: agencyId },
  });
  if (error) throw error;
  return data?.operators ?? [];
}

/** Salva todas as credenciais de uma operadora Infotravel em batch */
export async function saveOperator(
  agencyId: string,
  payload: {
    operator_id: string;
    operator_name: string;
    infotravel_url: string;
    infotravel_username: string;
    infotravel_password: string;
    infotravel_client?: string;
    infotravel_agency?: string;
    markup?: number;
    is_active?: boolean;
  },
) {
  const { data, error } = await supabase.functions.invoke("integration-manager", {
    body: {
      action: "save-operator",
      agency_id: agencyId,
      ...payload,
    },
  });
  if (error) throw error;
  return data;
}

/** Remove uma operadora Infotravel e todas as suas credenciais */
export async function deleteOperator(agencyId: string, operatorId: string) {
  const { error } = await supabase.functions.invoke("integration-manager", {
    body: {
      action: "delete-operator",
      agency_id: agencyId,
      operator_id: operatorId,
    },
  });
  if (error) throw error;
}

/** Testa a conexão com uma operadora Infotravel pelo operator_id salvo */
export async function testOperatorConnection(
  agencyId: string,
  operatorId?: string,
  directCredentials?: {
    infotravel_url: string;
    infotravel_username: string;
    infotravel_password: string;
    infotravel_client?: string;
    infotravel_agency?: string;
  },
): Promise<{ success: boolean; message: string }> {
  const { data, error } = await supabase.functions.invoke("integration-manager", {
    body: {
      action: "test-operator",
      agency_id: agencyId,
      operator_id: operatorId,
      ...directCredentials,
    },
  });
  if (error) throw new Error(error.message || "Erro ao testar conexão.");
  return data;
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
  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("agency_id", agencyId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function changeTeamMemberRole(agencyId: string, userId: string, role: string) {
  const { error } = await supabase
    .from("user_roles")
    .update({ role: role as any })
    .eq("agency_id", agencyId)
    .eq("user_id", userId);
  if (error) throw error;
}
