import { supabase } from "@/integrations/supabase/client";
import { type Hotel, type Flight } from "@/services/proposals";
import {
  mapApiHotelToCanonical,
  mapApiFlightToCanonical,
  mapApiBookingToNormalized,
  type NormalizedBooking,
  type ApiHotelAvail,
  type ApiFlightAvail,
  type ApiBooking,
} from "@/types/infotravel";

// ── Erro estruturado para credenciais não configuradas ─────────────────────
// O conector retorna { error_code: "CREDENTIALS_NOT_CONFIGURED" } com HTTP 200
// para não gerar toast de erro genérico no frontend — deve exibir um aviso
// contextual de onboarding no módulo que tentou acionar a busca.
export class InfotravelNotConfiguredError extends Error {
  readonly errorCode = "CREDENTIALS_NOT_CONFIGURED";
  constructor() {
    super(
      "As credenciais de acesso ao GDS Infotravel não foram configuradas para esta agência. " +
      "Acesse Configurações → Conexões → Infotravel para inserir suas credenciais de produção.",
    );
    this.name = "InfotravelNotConfiguredError";
  }
}

/**
 * Despacha uma chamada ao conector e trata o retorno estruturado.
 * Lança InfotravelNotConfiguredError quando credenciais estão ausentes
 * e um Error padrão para erros de API reais.
 */
async function invokeConnector<T = any>(
  action: string,
  agencyId: string,
  params?: Record<string, any>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("infotravel-connector", {
    body: { action, agencyId, params: params || {} },
  });

  // Erro de rede / Edge Function inacessível
  if (error) {
    throw new Error(error.message || "Não foi possível contactar o conector InfoTravel.");
  }

  // Credenciais não configuradas — retorno estruturado com HTTP 200
  if (data?.error_code === "CREDENTIALS_NOT_CONFIGURED") {
    throw new InfotravelNotConfiguredError();
  }

  // Erro de API retornado como JSON estruturado
  if (data?.success === false && data?.error) {
    throw new Error(data.error);
  }

  return data as T;
}

// ── Busca de Hotéis ────────────────────────────────────────────────────────
export async function infotravelSearchHotels(
  agencyId: string,
  params: {
    city: string;
    checkin: string;
    checkout: string;
    rooms?: number;
    quoteRequestId?: string;
    scenarioId?: string;
  },
): Promise<Hotel[]> {
  const data = await invokeConnector("search_hotels", agencyId, params);

  // Resposta do cenário de cotação (ofertas já normalizadas e salvas no banco)
  if (Array.isArray(data?.offers)) {
    return data.offers as Hotel[];
  }

  // Resposta direta da API GDS (sem scenarioId)
  if (data?.hotelAvail) {
    return (data.hotelAvail as ApiHotelAvail[]).map(mapApiHotelToCanonical);
  }

  return data?.hotels || [];
}

// ── Busca de Voos ──────────────────────────────────────────────────────────
export async function infotravelSearchFlights(
  agencyId: string,
  params: {
    origin: string;
    destination: string;
    date: string;
    quoteRequestId?: string;
    scenarioId?: string;
  },
): Promise<Flight[]> {
  const data = await invokeConnector("search_flights", agencyId, params);

  if (Array.isArray(data?.offers)) {
    return data.offers as Flight[];
  }

  if (data?.flightAvail) {
    return (data.flightAvail as ApiFlightAvail[]).map(mapApiFlightToCanonical);
  }

  return data?.flights || [];
}

// ── Busca de Traslados/Transfers ───────────────────────────────────────────
export async function infotravelSearchTransfers(
  agencyId: string,
  params: {
    destination?: string;
    city?: string;
    date?: string;
    checkin?: string;
    checkout?: string;
    rooms?: number;
    quoteRequestId?: string;
    scenarioId?: string;
  },
): Promise<any[]> {
  const data = await invokeConnector("search_transfers", agencyId, params);

  if (Array.isArray(data?.offers)) {
    return data.offers;
  }

  return data?.transfers || data?.transferAvail || [];
}

// ── Busca de Passeios e Atividades ─────────────────────────────────────────
export async function infotravelSearchActivities(
  agencyId: string,
  params: {
    destination?: string;
    city?: string;
    date?: string;
    checkin?: string;
    checkout?: string;
    rooms?: number;
    quoteRequestId?: string;
    scenarioId?: string;
  },
): Promise<any[]> {
  const data = await invokeConnector("search_activities", agencyId, params);

  if (Array.isArray(data?.offers)) {
    return data.offers;
  }

  return data?.activities || data?.tourAvail || [];
}

// ── Importação de Reserva ──────────────────────────────────────────────────
export async function infotravelImportBooking(
  agencyId: string,
  bookingId: string,
): Promise<NormalizedBooking> {
  const data = await invokeConnector("import_booking", agencyId, { bookingId });

  // Se for a reserva crua do GDS real (contém estruturas de hotéis ou voos da API), normalizamos
  if (data && (data.client || data.bookingHotels || data.bookingFlights)) {
    return mapApiBookingToNormalized(data as ApiBooking);
  }

  return data as NormalizedBooking;
}

// ── Criação e Sincronização de Reservas (Trips) ───────────────────────────
export async function infotravelCreateBooking(
  agencyId: string,
  tripId: string,
): Promise<any> {
  return await invokeConnector("create_booking", agencyId, { tripId });
}

export async function infotravelSyncBooking(
  agencyId: string,
  tripId: string,
): Promise<any> {
  return await invokeConnector("run_periodic_sync", agencyId, { tripId });
}

export async function infotravelImportToTrip(
  agencyId: string,
  bookingId: string,
  tripId: string,
): Promise<any> {
  return await invokeConnector("import_booking", agencyId, { bookingId, tripId });
}

// ── Teste de Conexão ───────────────────────────────────────────────────────
export async function infotravelTestConnection(agencyId: string): Promise<boolean> {
  try {
    const data = await invokeConnector("test_connection", agencyId);
    return data?.success === true;
  } catch {
    return false;
  }
}
