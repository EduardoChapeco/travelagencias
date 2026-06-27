import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdminAgencyDetail = {
  agency: any;
  priv: any;
  members: any[];
  tripsCount: number;
  income: number;
  expense: number;
  subscription: any;
  plans: any[];
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function fetchAdminAgencyDetail(agencyId: string): Promise<AdminAgencyDetail> {
  const [a, p, roles, trips, fin, sub, plans] = await Promise.all([
    supabase.from("agencies").select("*").eq("id", agencyId).maybeSingle(),
    supabase.from("agency_private").select("*").eq("agency_id", agencyId).maybeSingle(),
    supabase.from("user_roles").select("user_id, role, created_at").eq("agency_id", agencyId),
    supabase.from("trips").select("id", { count: "exact", head: true }).eq("agency_id", agencyId),
    supabase.from("financial_records").select("amount, type, status").eq("agency_id", agencyId),
    supabase
      .from("agency_subscriptions")
      .select("*")
      .eq("agency_id", agencyId)
      .maybeSingle(),
    supabase.from("plans").select("*").order("sort_order", { ascending: true }),
  ]);

  const userIds = (roles.data ?? []).map((r: any) => r.user_id);
  const profiles = userIds.length
    ? ((await supabase.from("profiles").select("id, full_name").in("id", userIds)).data ?? [])
    : [];
  const pmap = new Map(profiles.map((p: any) => [p.id, p]));
  const records = fin.data ?? [];
  const income = records
    .filter((r: any) => r.type === "income" && r.status === "paid")
    .reduce((s: number, r: any) => s + Number(r.amount), 0);
  const expense = records
    .filter((r: any) => r.type === "expense" && r.status === "paid")
    .reduce((s: number, r: any) => s + Number(r.amount), 0);

  return {
    agency: a.data,
    priv: p.data,
    members: (roles.data ?? []).map((r: any) => ({
      ...r,
      name: pmap.get(r.user_id)?.full_name ?? "—",
    })),
    tripsCount: trips.count ?? 0,
    income,
    expense,
    subscription: sub.data,
    plans: plans.data ?? [],
  };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function logAdminAuditEvent(
  agencyId: string,
  action: string,
  metadata: any,
): Promise<void> {
  const { error } = await (supabase.rpc as any)("log_audit_event", {
    _agency_id: agencyId,
    _action: action,
    _entity_type: "agency_subscription",
    _entity_id: agencyId,
    _metadata: metadata,
  });
  if (error) throw new Error(error.message);
}

export async function provisionAgencyTrial(agencyId: string, planId: string): Promise<void> {
  const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("agency_subscriptions").upsert({
    agency_id: agencyId,
    plan_id: planId,
    status: "trialing",
    trial_ends_at: trialEnds,
  });
  if (error) throw new Error(error.message);
}

export async function forceChangeAgencyPlan(agencyId: string, planId: string): Promise<void> {
  const { error } = await supabase
    .from("agency_subscriptions")
    .update({ plan_id: planId })
    .eq("agency_id", agencyId);
  if (error) throw new Error(error.message);
}

export async function forceChangeAgencyStatus(agencyId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from("agency_subscriptions")
    .update({ status })
    .eq("agency_id", agencyId);
  if (error) throw new Error(error.message);
}

export async function forceChangeAgencyBlockedStatus(
  agencyId: string,
  status: "active" | "blocked",
): Promise<void> {
  const { error } = await supabase
    .from("agencies")
    .update({ status } as any)
    .eq("id", agencyId);
  if (error) throw new Error(error.message);
}

export async function sendOwnerPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw new Error(error.message);
}

// ─── Global API Keys ─────────────────────────────────────────────────────────

export type ApiKey = {
  id: string;
  agency_id: string | null;
  provider: string;
  label: string | null;
  key_value: string;
  is_active: boolean;
  monthly_limit: number | null;
  used_count: number;
  created_at: string;
  updated_at: string;
};

export async function fetchGlobalApiKeys(): Promise<ApiKey[]> {
  const { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .is("agency_id", null)
    .order("provider", { ascending: true });
  if (error) throw error;
  return (data || []) as ApiKey[];
}

export async function saveGlobalApiKey(payload: {
  provider: string;
  label?: string | null;
  key_value: string;
  monthly_limit?: number | null;
  is_active?: boolean;
}): Promise<void> {
  const existing = await supabase
    .from("api_keys")
    .select("id")
    .is("agency_id", null)
    .eq("provider", payload.provider)
    .maybeSingle();

  if (existing.data) {
    const { error } = await supabase
      .from("api_keys")
      .update({
        label: payload.label ?? payload.provider,
        key_value: payload.key_value,
        monthly_limit: payload.monthly_limit ?? null,
        is_active: payload.is_active ?? true,
      })
      .eq("id", existing.data.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("api_keys").insert({
      ...payload,
      agency_id: null,
      is_active: payload.is_active ?? true,
    });
    if (error) throw error;
  }
}

export async function toggleGlobalApiKey(id: string, is_active: boolean): Promise<void> {
  const { error } = await supabase.from("api_keys").update({ is_active }).eq("id", id);
  if (error) throw error;
}

export async function deleteGlobalApiKey(id: string): Promise<void> {
  const { error } = await supabase.from("api_keys").delete().eq("id", id);
  if (error) throw error;
}

// ─── Plans CRUD ──────────────────────────────────────────────────────────────

export type Plan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_annual: number;
  max_agents: number;
  max_trips_per_month: number;
  max_storage_gb: number;
  features: any;
  is_active: boolean;
  is_featured: boolean;
  badge: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function fetchPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .order("price_monthly", { ascending: true });
  if (error) throw error;
  return (data || []) as Plan[];
}

export async function deletePlan(id: string): Promise<void> {
  const { error } = await supabase.from("plans").delete().eq("id", id);
  if (error) throw error;
}

export async function togglePlanActive(id: string, is_active: boolean): Promise<void> {
  const { error } = await supabase.from("plans").update({ is_active }).eq("id", id);
  if (error) throw error;
}

export async function savePlan(plan: Partial<Plan> & { id: string }): Promise<void> {
  const existing = await supabase.from("plans").select("id").eq("id", plan.id).maybeSingle();
  if (existing.data) {
    const { error } = await supabase
      .from("plans")
      .update(plan as any)
      .eq("id", plan.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("plans").insert(plan as any);
    if (error) throw error;
  }
}

// ─── Audit Logs ──────────────────────────────────────────────────────────────

export type AuditLogFilters = {
  action?: string;
  entityType?: string;
  page: number;
  pageSize: number;
};

export type AuditLogResponse = {
  data: any[];
  count: number;
};

export async function fetchAdminAuditLogs(filters: AuditLogFilters): Promise<AuditLogResponse> {
  let query = supabase.from("vw_admin_audit").select("*", { count: "exact" });

  if (filters.action) {
    query = query.eq("action", filters.action);
  }
  if (filters.entityType) {
    query = query.eq("entity_type", filters.entityType);
  }

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

// ─── Branding Config ─────────────────────────────────────────────────────────

export async function fetchBrandingConfig(): Promise<any> {
  const { data, error } = await supabase
    .from("global_settings")
    .select("value")
    .eq("key", "branding_config")
    .maybeSingle();
  if (error) throw error;
  return data?.value || null;
}

export async function saveBrandingConfig(data: any): Promise<void> {
  const existing = await fetchBrandingConfig();
  if (existing !== null) {
    const { error } = await supabase
      .from("global_settings")
      .update({ value: data })
      .eq("key", "branding_config");
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("global_settings")
      .insert({ key: "branding_config", value: data });
    if (error) throw error;
  }
}

// ─── Administrative Overview & Listings ──────────────────────────────────────

export async function fetchAdminTrips(filters: { search: string; page: number; pageSize: number }) {
  let query = supabase
    .from("trips")
    .select("id, code, title, status, destination, travel_start, total_sale, currency, agency_id", {
      count: "exact",
    });

  if (filters.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,code.ilike.%${filters.search}%,destination.ilike.%${filters.search}%`,
    );
  }

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const aids = Array.from(new Set((data ?? []).map((t) => t.agency_id)));
  const ags = aids.length
    ? ((await supabase.from("agencies").select("id, name").in("id", aids)).data ?? [])
    : [];
  const amap = new Map(ags.map((a) => [a.id, a.name]));

  return {
    data: (data ?? []).map((t) => ({
      ...t,
      agency_name: amap.get(t.agency_id) ?? "—",
    })),
    count: count ?? 0,
  };
}

export async function fetchAdminTravelers(filters: {
  search: string;
  page: number;
  pageSize: number;
}) {
  let query = supabase
    .from("clients")
    .select("id, full_name, email, phone, agency_id, created_at", { count: "exact" });

  if (filters.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  }

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const aids = Array.from(new Set((data ?? []).map((c) => c.agency_id)));
  const ags = aids.length
    ? ((await supabase.from("agencies").select("id, name").in("id", aids)).data ?? [])
    : [];
  const amap = new Map(ags.map((a) => [a.id, a.name]));

  return {
    data: (data ?? []).map((c) => ({
      ...c,
      agency_name: amap.get(c.agency_id) ?? "—",
    })),
    count: count ?? 0,
  };
}

export async function fetchAdminContracts(filters: {
  search: string;
  page: number;
  pageSize: number;
}) {
  let query = supabase
    .from("contracts")
    .select(
      "id, status, total_value, signed_at, created_at, agency_id, trip_id, client_data, certificate",
      { count: "exact" },
    );

  if (filters.search) {
    query = query.or(`status.ilike.%${filters.search}%`);
  }

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const aids = Array.from(new Set((data ?? []).map((c) => c.agency_id)));
  const ags = aids.length
    ? ((await supabase.from("agencies").select("id, name").in("id", aids)).data ?? [])
    : [];
  const amap = new Map(ags.map((a) => [a.id, a.name]));

  return {
    data: (data ?? []).map((c) => ({
      ...c,
      agency_name: amap.get(c.agency_id) ?? "—",
    })),
    count: count ?? 0,
  };
}

export type AdminOverviewData = {
  totalAgencies: number;
  totalUsers: number;
  totalTrips: number;
  tripsThisMonth: number;
  totalProposals: number;
  totalContracts: number;
  openTickets: number;
  newAgenciesThisMonth: number;
  totalRevenue: number;
  currentMonthRevenue: number;
  revGrowth: number;
  monthlyRevenue: Array<{ label: string; total: number }>;
  maxRev: number;
  recentAgencies: any[];
  recentTickets: any[];
};

export async function fetchAdminOverview(): Promise<AdminOverviewData> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const last12 = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return { label: d.toLocaleString("pt-BR", { month: "short", year: "2-digit" }), start: d };
  });

  const [
    { count: totalAgencies },
    { count: totalUsers },
    { count: totalTrips },
    { count: tripsThisMonth },
    { count: totalProposals },
    { count: totalContracts },
    { count: openTickets },
    { count: newAgenciesThisMonth },
    { data: revData },
    { data: recentAgencies },
    { data: recentTickets },
  ] = await Promise.all([
    supabase.from("agencies").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("trips").select("id", { count: "exact", head: true }),
    supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart),
    supabase.from("proposals").select("id", { count: "exact", head: true }),
    supabase.from("contracts").select("id", { count: "exact", head: true }),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]),
    supabase
      .from("agencies")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart),
    supabase.from("financial_records").select("amount, type, status, created_at"),
    supabase
      .from("agencies")
      .select("id, name, slug, created_at, logo_url")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("support_tickets")
      .select("id, code, title, priority, status, created_at, agency_id")
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Revenue by month (last 12)
  const allRecords = revData ?? [];
  const monthlyRevenue = last12.map(({ label, start }) => {
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const total = allRecords
      .filter(
        (r) =>
          r.type === "income" &&
          r.status === "paid" &&
          r.created_at >= start.toISOString() &&
          r.created_at < end.toISOString(),
      )
      .reduce((s, r) => s + Number(r.amount ?? 0), 0);
    return { label, total };
  });

  const totalRevenue = allRecords
    .filter((r) => r.type === "income" && r.status === "paid")
    .reduce((s, r) => s + Number(r.amount ?? 0), 0);

  const currentMonthRevenue = monthlyRevenue[11]?.total ?? 0;
  const prevMonthRevenue = monthlyRevenue[10]?.total ?? 0;
  const revGrowth =
    prevMonthRevenue > 0
      ? Math.round(((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
      : 0;

  const maxRev = Math.max(...monthlyRevenue.map((m) => m.total), 1);

  return {
    totalAgencies: totalAgencies ?? 0,
    totalUsers: totalUsers ?? 0,
    totalTrips: totalTrips ?? 0,
    tripsThisMonth: tripsThisMonth ?? 0,
    totalProposals: totalProposals ?? 0,
    totalContracts: totalContracts ?? 0,
    openTickets: openTickets ?? 0,
    newAgenciesThisMonth: newAgenciesThisMonth ?? 0,
    totalRevenue,
    currentMonthRevenue,
    revGrowth,
    monthlyRevenue,
    maxRev,
    recentAgencies: recentAgencies ?? [],
    recentTickets: recentTickets ?? [],
  };
}

// ─── Billing Summary ──────────────────────────────────────────────────────────

export async function fetchBillingSummary(): Promise<any[]> {
  const { data, error } = await (supabase.rpc as any)("admin_calculate_billing_summary");
  if (error) throw error;
  return data || [];
}

// ─── Agents list ──────────────────────────────────────────────────────────────

export async function fetchAdminAgents(filters: {
  search: string;
  page: number;
  pageSize: number;
}): Promise<{ data: any[]; count: number }> {
  let query = supabase.from("vw_admin_agents").select("*", { count: "exact" });

  if (filters.search) {
    query = query.or(`user_name.ilike.%${filters.search}%,agency_name.ilike.%${filters.search}%`);
  }

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

// ─── Integrations Config ──────────────────────────────────────────────────────

export type IntegrationsConfig = {
  openrouter_key: string;
  groq_key: string;
  firecrawl_key: string;
  stell_key: string;
  vapid_public_key: string;
  vapid_private_key: string;
};

export async function fetchIntegrationsConfig(): Promise<IntegrationsConfig | null> {
  const { data } = await supabase
    .from("global_settings")
    .select("value")
    .eq("key", "integrations_config_encrypted")
    .maybeSingle();
  if (data?.value) {
    return {
      openrouter_key: "••••••••••••••••",
      groq_key: "••••••••••••••••",
      firecrawl_key: "••••••••••••••••",
      stell_key: "••••••••••••••••",
      vapid_public_key: "Configurado na Nuvem",
      vapid_private_key: "••••••••••••••••",
    } as IntegrationsConfig;
  }
  return null;
}

export async function saveIntegrationsConfig(keys: IntegrationsConfig): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Sem sessão ativa.");

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-secure-keys`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ keys }),
    },
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Erro ao salvar chaves criptografadas.");
  }
}

// ─── Agencies CRUD ───────────────────────────────────────────────────────────

export async function fetchAdminAgencies(): Promise<any[]> {
  const { data, error } = await supabase
    .from("agencies")
    .select("id, slug, name, logo_url, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const privates = await supabase
    .from("agency_private")
    .select("agency_id, email, phone, legal_name, document");
  const pmap = new Map((privates.data ?? []).map((p) => [p.agency_id, p]));
  return (data ?? []).map((a) => ({ ...a, priv: pmap.get(a.id) }));
}

export async function createAgencyAndInvite(payload: {
  name: string;
  slug: string;
  email: string;
  cnpj?: string | null;
  phone?: string | null;
}): Promise<{ agency_id: string; invite_token: string }> {
  const { data, error } = await (supabase.rpc as any)("admin_create_agency_and_invite", {
    _name: payload.name,
    _slug: payload.slug,
    _owner_email: payload.email,
    _cnpj: payload.cnpj || null,
    _phone: payload.phone || null,
  });
  if (error) throw error;
  return data as { agency_id: string; invite_token: string };
}
