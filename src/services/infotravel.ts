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

// ── Cache e Desduplicação de Requisições GDS (Anti-Loop & Proteção de Rate Limit) ────
interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

const SEARCH_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos de TTL
const gdsSearchCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();

// Circuit Breaker State
let circuitBreakerCoolingUntil: number = 0;

function generateCacheKey(action: string, agencyId: string, params?: Record<string, any>): string {
  return `${action}:${agencyId}:${JSON.stringify(params || {})}`;
}

/**
 * Despacha uma chamada ao conector e trata o retorno estruturado com desduplicação e cache inteligente.
 */
async function invokeConnector<T = any>(
  action: string,
  agencyId: string,
  params?: Record<string, any>,
): Promise<T> {
  const isSearchAction = action.startsWith("search_");
  const cacheKey = generateCacheKey(action, agencyId, params);

  // 1. Checar Circuit Breaker
  if (Date.now() < circuitBreakerCoolingUntil) {
    const remainingSec = Math.ceil((circuitBreakerCoolingUntil - Date.now()) / 1000);
    throw new Error(
      `O conector GDS está em resfriamento temporário para proteger contra limite de requisições. Tente novamente em ${remainingSec} segundos.`,
    );
  }

  // 2. Checar Cache Válido em buscas
  if (isSearchAction && gdsSearchCache.has(cacheKey)) {
    const cached = gdsSearchCache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < SEARCH_CACHE_TTL_MS) {
      return cached.data as T;
    }
    gdsSearchCache.delete(cacheKey);
  }

  // 3. Desduplicação de requisições simultâneas em voo
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey) as Promise<T>;
  }

  const requestPromise = (async () => {
    try {
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

      // Tratamento de Rate Limit / 429 para acionar Circuit Breaker
      if (data?.success === false && (data?.error?.includes("429") || data?.error?.includes("rate limit"))) {
        circuitBreakerCoolingUntil = Date.now() + 60 * 1000; // 60 segundos de cooling
        throw new Error("Limite de requisições atingido no GDS. O sistema pausou consultas por 60 segundos.");
      }

      // Erro de API retornado como JSON estruturado
      if (data?.success === false && data?.error) {
        throw new Error(data.error);
      }

      // Salvar em cache se for busca com sucesso
      if (isSearchAction && data) {
        gdsSearchCache.set(cacheKey, { timestamp: Date.now(), data });
      }

      return data as T;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

// ── Busca de Hotéis ────────────────────────────────────────────────────────
export async function infotravelSearchHotels(
  agencyId: string,
  params: {
    city?: string;
    destination?: string;
    destinationCode?: string;
    destinationName?: string;
    checkin: string;
    checkout: string;
    rooms?: number;
    occupancies?: string[];
    quoteRequestId?: string;
    scenarioId?: string;
  },
): Promise<Hotel[]> {
  const data = await invokeConnector("search_hotels", agencyId, params);

  // Resposta do cenário de cotação (ofertas já normalizadas e salvas no banco)
  if (Array.isArray(data?.offers) && data.offers.length > 0) {
    return data.offers as Hotel[];
  }

  // Resposta direta da API GDS (sem scenarioId)
  if (Array.isArray(data?.hotelAvail) && data.hotelAvail.length > 0) {
    return (data.hotelAvail as ApiHotelAvail[]).map(mapApiHotelToCanonical);
  }

  if (Array.isArray(data?.hotels) && data.hotels.length > 0) {
    return (data.hotels as any[]).map((h) => {
      if (h.hotel) return mapApiHotelToCanonical(h);
      return {
        id: String(h.id || h.hotelId || `hotel-${Math.random().toString(36).substr(2, 6)}`),
        name: h.name || h.hotelName || "Hotel",
        city: h.city?.name || h.city || params.destinationName || params.city || "Destino",
        checkin: params.checkin,
        checkout: params.checkout,
        meal_plan: h.mealPlan || h.meal_plan || "Café da Manhã",
        rooms: h.rooms || [{ type: "Quarto Standard", qty: 1 }],
        images: Array.isArray(h.images) ? h.images.map((img: any) => typeof img === "string" ? img : img?.url).filter(Boolean) : [
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
        ],
        price: h.price || h.totalPrice || h.lowestPrice || 0,
      };
    });
  }

  if (Array.isArray(data?.data) && data.data.length > 0) {
    return (data.data as any[]).map((h) => {
      if (h.hotel) return mapApiHotelToCanonical(h);
      return {
        id: String(h.id || `hotel-${Math.random().toString(36).substr(2, 6)}`),
        name: h.name || "Hotel",
        city: h.city || params.destinationName || "Destino",
        checkin: params.checkin,
        checkout: params.checkout,
        meal_plan: h.meal_plan || "Café da Manhã",
        rooms: [{ type: "Quarto Standard", qty: 1 }],
        images: [
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
        ],
        price: h.price || 0,
      };
    });
  }

  return [];
}

// ── Busca de Voos ──────────────────────────────────────────────────────────
export async function infotravelSearchFlights(
  agencyId: string,
  params: {
    origin: string;
    destination: string;
    date: string;
    returnDate?: string;
    isCombined?: boolean;
    occupancies?: string[];
    quoteRequestId?: string;
    scenarioId?: string;
  },
): Promise<Flight[]> {
  const data = await invokeConnector("search_flights", agencyId, params);

  if (Array.isArray(data?.offers) && data.offers.length > 0) {
    return data.offers as Flight[];
  }

  if (Array.isArray(data?.flightAvail) && data.flightAvail.length > 0) {
    return (data.flightAvail as ApiFlightAvail[]).map(mapApiFlightToCanonical);
  }

  if (Array.isArray(data?.flights) && data.flights.length > 0) {
    return (data.flights as any[]).map((f) => {
      if (f.routes || f.outbound) return mapApiFlightToCanonical(f);
      return {
        id: String(f.id || f.key || `flight-${Math.random().toString(36).substr(2, 6)}`),
        origin: f.origin || params.origin,
        destination: f.destination || params.destination,
        date: f.date || params.date,
        departure_time: f.departure_time || f.departureTime || "08:00",
        arrival_time: f.arrival_time || f.arrivalTime || "12:00",
        airline: f.airline || "Companhia Aérea",
        flight_number: f.flight_number || f.flightNumber || "0000",
        stops: f.stops || 0,
        baggage_rules: f.baggage_rules || "1 mala de mão (10kg)",
        price: f.price || f.totalPrice || 0,
      };
    });
  }

  if (Array.isArray(data?.data) && data.data.length > 0) {
    return (data.data as any[]).map((f) => ({
      id: String(f.id || `flight-${Math.random().toString(36).substr(2, 6)}`),
      origin: f.origin || params.origin,
      destination: f.destination || params.destination,
      date: f.date || params.date,
      departure_time: f.departure_time || "08:00",
      arrival_time: f.arrival_time || "12:00",
      airline: f.airline || "Companhia Aérea",
      flight_number: f.flight_number || "0000",
      stops: f.stops || 0,
      baggage_rules: "1 mala de mão (10kg)",
      price: f.price || 0,
    }));
  }

  return [];
}

// ── Busca de Traslados/Transfers ───────────────────────────────────────────
export async function infotravelSearchTransfers(
  agencyId: string,
  params: {
    destination?: string;
    city?: string;
    date?: string;
    returnDate?: string;
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
    returnDate?: string;
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

// ── Busca de Seguros de Viagem ─────────────────────────────────────────────
export async function infotravelSearchInsurances(
  agencyId: string,
  params: {
    destination?: string;
    date?: string;
    checkin?: string;
    checkout?: string;
    occupancy?: number;
  },
): Promise<any[]> {
  try {
    const data = await invokeConnector("search_insurances", agencyId, params);
    return data?.insurances || [];
  } catch (err) {
    if (err instanceof InfotravelNotConfiguredError) throw err;
    return [];
  }
}

// ── Busca de Chips de Viagem ───────────────────────────────────────────────
export async function infotravelSearchChips(
  agencyId: string,
  params: {
    destination?: string;
    days?: number;
  },
): Promise<any[]> {
  try {
    const data = await invokeConnector("search_chips", agencyId, params);
    return data?.chips || [];
  } catch (err) {
    if (err instanceof InfotravelNotConfiguredError) throw err;
    return [];
  }
}

// ── Busca de Ingressos ─────────────────────────────────────────────────────
export async function infotravelSearchTickets(
  agencyId: string,
  params: {
    destination?: string;
    date?: string;
  },
): Promise<any[]> {
  try {
    const data = await invokeConnector("search_tickets", agencyId, params);
    return data?.tickets || [];
  } catch (err) {
    if (err instanceof InfotravelNotConfiguredError) throw err;
    return [];
  }
}

// ── Validação de Tarifa em Tempo Real (Check-Rate) ──────────────────────────
export async function infotravelCheckRate(
  agencyId: string,
  payload: {
    hotelKey?: string;
    flightKey?: string;
    serviceKeys?: string[];
  },
): Promise<{ valid: boolean; currentPrice: number; taxes: number }> {
  const data = await invokeConnector("check_rate", agencyId, payload);
  return data || { valid: true, currentPrice: 0, taxes: 0 };
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
export async function infotravelCreateBooking(agencyId: string, tripId: string): Promise<any> {
  return await invokeConnector("create_booking", agencyId, { tripId });
}

export async function infotravelSyncBooking(agencyId: string, tripId: string): Promise<any> {
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

// ── Sincronização e Busca de Clientes ──────────────────────────────────────
export async function infotravelSearchClients(
  agencyId: string,
  params: { name?: string; email?: string; document?: string },
): Promise<any[]> {
  const data = await invokeConnector("search_clients", agencyId, params);
  return data?.clients || [];
}

export async function infotravelSyncClients(
  agencyId: string,
  operatorId?: string,
): Promise<{ success: boolean; total_synced: number; message: string }> {
  return await invokeConnector("sync_clients", agencyId, { operatorId });
}

// ── Consulta Financeira da Reserva ─────────────────────────────────────────
export async function infotravelFetchFinancials(
  agencyId: string,
  bookingId: string,
): Promise<any> {
  const data = await invokeConnector("fetch_financials", agencyId, { bookingId });
  return data?.financials || null;
}
