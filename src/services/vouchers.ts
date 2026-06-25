import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type VoucherInsert = Database["public"]["Tables"]["vouchers"]["Insert"];
type VoucherUpdate = Database["public"]["Tables"]["vouchers"]["Update"];

// ─── Types ────────────────────────────────────────────────────────────────────

export type VoucherFlight = {
  locator: string;
  airline: string;
  flight_number: string;
  origin: string;
  destination: string;
  date: string;
  departure_time: string;
  arrival_time: string;
  class: string;
  baggage: string;
};

export type VoucherAccommodation = {
  name: string;
  city: string;
  address: string;
  phone: string;
  checkin: string;
  checkout: string;
  room_type: string;
  meal_plan: string;
  confirmation: string;
};

export type VoucherTransfer = {
  type: string;
  date: string;
  origin: string;
  destination: string;
  vehicle: string;
  supplier: string;
  confirmation: string;
};

export type VoucherPassenger = {
  name: string;
  document: string;
  seat?: string;
};

export type Voucher = {
  id: string;
  trip_id: string;
  agency_id: string;
  source_type: "operator_pdf" | "manual";
  source_file_url: string | null;
  destination: string | null;
  general_locator: string | null;
  observations: string | null;
  cover_image_url: string | null;
  template: "navy" | "minimal" | "brand";
  passengers: VoucherPassenger[];
  flights: VoucherFlight[];
  accommodation: VoucherAccommodation[];
  transfers: VoucherTransfer[];
  tours: Array<{
    name: string;
    date: string;
    duration: string;
    guide: string;
    meeting_point: string;
  }>;
  insurance: { provider?: string; policy_number?: string; phone?: string; coverage?: string };
  emergency_contacts: Array<{ name: string; phone: string; role: string }>;
  pdf_url: string | null;
  generated_at: string | null;
  created_at: string;
};

export type VoucherTrip = {
  id: string;
  title: string;
  destination: string | null;
  travel_start: string | null;
  travel_end: string | null;
  airline: string | null;
  pnr: string | null;
};

export type TripPassenger = {
  id: string;
  full_name: string;
  document: string | null;
  cpf: string | null;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function fetchVoucherTrip(tripId: string): Promise<VoucherTrip | null> {
  const { data, error } = await supabase
    .from("trips")
    .select("id, title, destination, travel_start, travel_end, airline, pnr")
    .eq("id", tripId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as VoucherTrip | null;
}

export async function fetchTripVouchers(tripId: string): Promise<Voucher[]> {
  const { data, error } = await supabase
    .from("vouchers")
    .select("*")
    .eq("trip_id", tripId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Voucher[];
}

export async function fetchTripPassengers(tripId: string): Promise<TripPassenger[]> {
  const { data, error } = await supabase
    .from("trip_passengers")
    .select("id, full_name, document, cpf")
    .eq("trip_id", tripId);
  if (error) throw new Error(error.message);
  return (data ?? []) as TripPassenger[];
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function saveVoucherData(
  payload: Partial<Voucher>,
  selectedId?: string,
): Promise<void> {
  if (selectedId) {
    const { error } = await supabase
      .from("vouchers")
      .update(payload as VoucherUpdate)
      .eq("id", selectedId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("vouchers").insert(payload as VoucherInsert);
    if (error) throw new Error(error.message);
  }
}

export async function deleteVoucherData(id: string): Promise<void> {
  const { error } = await supabase
    .from("vouchers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── Storage Operations ───────────────────────────────────────────────────────

export async function uploadVoucherSourceFile(
  agencyId: string,
  tripId: string,
  file: File,
): Promise<string> {
  const uid = Math.random().toString(36).slice(2, 9);
  const path = `${agencyId}/${tripId}/${uid}-${file.name}`;

  const { error: upErr } = await supabase.storage
    .from("voucher-sources")
    .upload(path, file, { upsert: true });
  if (upErr) throw new Error(upErr.message);

  const { data: signed, error: signErr } = await supabase.storage
    .from("voucher-sources")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signErr || !signed?.signedUrl) {
    throw new Error("Erro ao gerar URL segura do arquivo.");
  }

  return signed.signedUrl;
}

export async function uploadVoucherStoryImage(
  agencyId: string,
  tripId: string,
  voucherId: string,
  blob: Blob,
): Promise<void> {
  const fileName = `story-${voucherId}-${Date.now()}.png`;
  const path = `${agencyId}/${tripId}/${fileName}`;

  const { error } = await supabase.storage.from("voucher-pdfs").upload(path, blob, {
    contentType: "image/png",
    upsert: true,
  });

  if (error) throw new Error(error.message);
}

/**
 * Fase 6 — Pipeline completo de PDF do voucher:
 * 1. Renderiza o elemento HTML para Blob PDF
 * 2. Faz upload para o bucket voucher-pdfs no Storage
 * 3. Cria uma URL pública assinada (1 ano)
 * 4. Persiste pdf_url e generated_at no registro do voucher
 *
 * Retorna a URL pública do PDF gerado.
 */
export async function uploadVoucherPdf(
  agencyId: string,
  tripId: string,
  voucherId: string,
  pdfBlob: Blob,
): Promise<string> {
  const fileName = `voucher-${voucherId}-${Date.now()}.pdf`;
  const path = `${agencyId}/${tripId}/${fileName}`;

  // 1. Upload para Storage
  const { error: upErr } = await supabase.storage
    .from("voucher-pdfs")
    .upload(path, pdfBlob, { contentType: "application/pdf", upsert: true });
  if (upErr) throw new Error(`Falha ao fazer upload do PDF: ${upErr.message}`);

  // 2. Gerar URL assinada (1 ano de validade)
  const { data: signed, error: signErr } = await supabase.storage
    .from("voucher-pdfs")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signErr || !signed?.signedUrl) {
    throw new Error("Falha ao gerar URL pública do PDF.");
  }

  const pdfUrl = signed.signedUrl;

  // 3. Persistir pdf_url e generated_at no voucher
  const { error: updErr } = await supabase
    .from("vouchers")
    .update({
      pdf_url: pdfUrl,
      generated_at: new Date().toISOString(),
    })
    .eq("id", voucherId);
  if (updErr) throw new Error(`Falha ao salvar URL do PDF: ${updErr.message}`);

  return pdfUrl;
}
