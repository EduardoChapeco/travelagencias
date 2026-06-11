import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Client = {
  id: string;
  agency_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  cpf: string | null;
  rg: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  birth_date: string | null;
  kind: "individual" | "company";
  notes: string | null;
  tags: string[];
  preferences: { dietary?: string; notes?: string } | null;
  document_images: string[];
  deleted_at: string | null;
  created_at: string;
};

export type MinClient = {
  id: string;
  full_name: string;
  email: string | null;
  document: string | null;
};

export type ClientProposal = {
  id: string;
  number: number;
  title: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
};

export type ClientTrip = {
  id: string;
  number: number;
  title: string;
  status: string;
  travel_start: string | null;
  travel_end: string | null;
  total_sale: number;
  currency: string;
  created_at: string;
};

export type ClientLegalAcceptance = {
  id: string;
  accepted_at: string;
  context: string;
  document_id: string;
};

export type ClientTicket = {
  id: string;
  code: string;
  title: string;
  status: string;
  created_at: string;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function fetchClient(clientId: string): Promise<Client | null> {
  const { data, error } = await supabase.from("clients").select("*").eq("id", clientId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Client | null;
}

export async function fetchClientsForMerge(agencyId: string, excludeClientId: string): Promise<MinClient[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, full_name, email, document")
    .eq("agency_id", agencyId)
    .is("deleted_at", null)
    .neq("id", excludeClientId)
    .order("full_name");
  if (error) throw new Error(error.message);
  return (data ?? []) as MinClient[];
}

export async function fetchClientProposals(clientId: string): Promise<ClientProposal[]> {
  const { data, error } = await supabase
    .from("proposals")
    .select("id, number, title, status, total, currency, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ClientProposal[];
}

export async function fetchClientTrips(clientId: string): Promise<ClientTrip[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("id, number, title, status, travel_start, travel_end, total_sale, currency, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ClientTrip[];
}

export async function fetchClientLegalAcceptances(clientId: string): Promise<ClientLegalAcceptance[]> {
  const { data, error } = await (supabase as any)
    .from("legal_acceptances")
    .select("id, accepted_at, context, document_id")
    .eq("client_id", clientId)
    .order("accepted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ClientLegalAcceptance[];
}

export async function fetchClientTickets(clientId: string): Promise<ClientTicket[]> {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("id, code, title, status, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ClientTicket[];
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function updateClientProfile(clientId: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("clients").update(patch as never).eq("id", clientId);
  if (error) throw new Error(error.message);
}

export async function archiveClient(clientId: string): Promise<void> {
  const { error } = await supabase
    .from("clients")
    .update({ deleted_at: new Date().toISOString() } as never)
    .eq("id", clientId);
  if (error) throw new Error(error.message);
}

export async function mergeClients(sourceId: string, targetId: string): Promise<void> {
  const { error } = await (supabase.rpc as any)("merge_clients", { p_target_id: targetId, p_source_id: sourceId });
  if (error) throw new Error(error.message);
}
