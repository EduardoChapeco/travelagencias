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
    (supabase as any)
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
  const { error } = await (supabase as any).from("agency_subscriptions").upsert({
    agency_id: agencyId,
    plan_id: planId,
    status: "trialing",
    trial_ends_at: trialEnds,
  });
  if (error) throw new Error(error.message);
}

export async function forceChangeAgencyPlan(agencyId: string, planId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("agency_subscriptions")
    .update({ plan_id: planId })
    .eq("agency_id", agencyId);
  if (error) throw new Error(error.message);
}

export async function forceChangeAgencyStatus(agencyId: string, status: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("agency_subscriptions")
    .update({ status })
    .eq("agency_id", agencyId);
  if (error) throw new Error(error.message);
}

export async function sendOwnerPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw new Error(error.message);
}
