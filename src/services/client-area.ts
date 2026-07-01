import { supabase } from "@/integrations/supabase/client";

// ─── Utilities ──────────────────────────────────────────────────────────────

async function getClientUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Usuário não autenticado");
  return data.user;
}

export async function fetchClientAgencies() {
  const user = await getClientUser();
  const { data, error } = await supabase
    .from("clients")
    .select("id, agency_id")
    .eq("user_id", user.id);
  if (error) throw error;

  // Fallback for agency administrators/staff previewing the client area
  if (!data || data.length === 0) {
    const { data: memberOf } = await supabase
      .from("user_roles")
      .select("agency_id")
      .eq("user_id", user.id)
      .limit(1);
    
    if (memberOf && memberOf.length > 0) {
      const { data: firstClient } = await supabase
        .from("clients")
        .select("id, agency_id")
        .eq("agency_id", memberOf[0].agency_id)
        .limit(1)
        .maybeSingle();
      if (firstClient) {
        return [firstClient];
      }
    }
  }

  return data || [];
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export async function fetchClientDashboard() {
  const clients = await fetchClientAgencies();
  if (!clients.length) return { trips: [] };

  const clientIds = clients.map((c: any) => c.id);

  const { data: trips } = await supabase
    .from("trips")
    .select("id, code, title, travel_start, status, total_sale, currency")
    .in("client_id", clientIds)
    .is("deleted_at", null)
    .order("travel_start", { ascending: false })
    .limit(3);

  return { trips: trips || [] };
}

// ─── Trips ──────────────────────────────────────────────────────────────────

export async function fetchClientTrips() {
  const clients = await fetchClientAgencies();
  if (!clients.length) return [];
  const clientIds = clients.map((c: any) => c.id);
  const { data, error } = await supabase
    .from("trips")
    .select(
      "id, code, title, destination, travel_start, travel_end, status, total_sale, currency, agency_id",
    )
    .in("client_id", clientIds)
    .is("deleted_at", null)
    .order("travel_start", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function fetchClientTripDetail(tripId: string) {
  const { data, error } = await supabase
    .from("trips")
    .select("*, agency:agencies(*), group_tour:group_tours(*)")
    .eq("id", tripId)
    .is("deleted_at", null) // ✅ Never show soft-deleted trips to client
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchClientVouchers(tripId: string) {
  const { data } = await supabase
    .from("vouchers")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function fetchClientContracts(tripId: string) {
  const { data } = await supabase
    .from("contracts")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function fetchClientPaymentPlans(tripId: string) {
  const { data: plans } = await supabase
    .from("payment_plans")
    .select("id")
    .eq("trip_id", tripId)
    .limit(1)
    .maybeSingle();
  if (!plans) return [];
  const { data: insts } = await supabase
    .from("payment_installments")
    .select("*")
    .eq("payment_plan_id", plans.id)
    .order("number");
  return insts || [];
}

export async function fetchClientTripPassengers(tripId: string) {
  const { data } = await supabase.from("trip_passengers").select("*").eq("trip_id", tripId);
  return data || [];
}

export async function fetchClientTripMemories(tripId: string) {
  const { data } = await supabase
    .from("trip_memories")
    .select("id, image_url, caption, created_at")
    .eq("trip_id", tripId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function requestTripCancellation(tripId: string, clientId: string, reason: string) {
  const { error } = await (supabase.rpc as any)("request_trip_cancellation", {
    p_trip_id: tripId,
    p_client_id: clientId,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function addTripMemories(tripId: string, urls: string[], agencyId: string) {
  const inserts = urls.map((url) => ({
    trip_id: tripId,
    agency_id: agencyId,
    image_url: url,
  }));
  const { error } = await supabase.from("trip_memories").insert(inserts);
  if (error) throw error;
}

// ─── Profile ────────────────────────────────────────────────────────────────

export async function fetchClientProfile() {
  const user = await getClientUser();
  const [p, c] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("clients").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  return { profile: p.data, client: c.data };
}

export async function saveClientProfile(payload: any) {
  const user = await getClientUser();
  const { error: pe } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: payload.full_name,
    phone: payload.phone || null,
    avatar_url: payload.avatar_url || null,
  });
  if (pe) throw pe;

  const { data: clientData } = await supabase
    .from("clients")
    .select("id, address")
    .eq("user_id", user.id)
    .maybeSingle();

  if (clientData) {
    const { error: ce } = await supabase
      .from("clients")
      .update({
        full_name: payload.full_name,
        email: payload.email,
        phone: payload.phone || null,
        document: payload.cpf || null,
        birth_date: payload.birth_date || null,
        nationality: payload.nationality,
        address: {
          ...((clientData.address as object) || {}),
          passport_number: payload.passport_number,
          passport_expiry: payload.passport_expiry,
          passport_country: payload.passport_country,
        },
      })
      .eq("id", clientData.id);
    if (ce) throw ce;
  }
}

export async function updateClientPassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

// ─── Notifications ──────────────────────────────────────────────────────────

export async function fetchClientNotifications() {
  const user = await getClientUser();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() } as any)
    .eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() } as any)
    .in("id", ids);
  if (error) throw error;
}

// ─── Payments, Gift Cards, Coupons & Documents ──────────────────────────────

export async function fetchClientPayments() {
  const clients = await fetchClientAgencies();
  if (!clients.length) return [];
  const clientIds = clients.map((c: any) => c.id);
  const { data: plans } = await supabase
    .from("payment_plans")
    .select("id, trip_id")
    .in("client_id", clientIds);
  if (!plans?.length) return [];
  const planIds = plans.map((p: any) => p.id);
  const { data, error } = await supabase
    .from("payment_installments")
    .select("*, plan:payment_plans(trip_id)")
    .in("payment_plan_id", planIds)
    .order("due_date");
  if (error) throw error;
  return data;
}

export async function fetchClientGiftCards() {
  const clients = await fetchClientAgencies();
  if (!clients.length) return [];
  const clientIds = clients.map((c: any) => c.id);
  const { data, error } = await supabase
    .from("gift_cards")
    .select("*")
    .or(
      `purchased_by_client_id.in.(${clientIds.join(",")}),redeemed_by_client_id.in.(${clientIds.join(",")})`,
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchClientCoupons() {
  const clients = await fetchClientAgencies();
  if (!clients.length) return [];
  const agencyIds = clients.map((c: any) => c.agency_id);
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .in("agency_id", agencyIds)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchClientDocuments() {
  const clients = await fetchClientAgencies();
  if (!clients.length) return { vouchers: [], contracts: [] };
  const clientIds = clients.map((c: any) => c.id);
  const { data: trips } = await supabase.from("trips").select("id").in("client_id", clientIds);
  const tripIds = trips?.map((t: any) => t.id) || [];
  if (!tripIds.length) return { vouchers: [], contracts: [] };

  const [contRes, docRes] = await Promise.all([
    supabase
      .from("contracts")
      .select("id, status, signed_at, pdf_url, total_value")
      .in("trip_id", tripIds),
    supabase
      .from("vouchers")
      .select("id, source_type, pdf_url, generated_at")
      .in("trip_id", tripIds),
  ]);
  return { contracts: contRes.data || [], vouchers: docRes.data || [] };
}
