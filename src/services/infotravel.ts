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

export async function infotravelSearchHotels(
  agencyId: string,
  params: { city: string; checkin: string; checkout: string; rooms?: number },
): Promise<Hotel[]> {
  const { data, error } = await supabase.functions.invoke("infotravel-connector", {
    body: {
      action: "search_hotels",
      agencyId,
      params,
    },
  });
  if (error) throw new Error(error.message || "Erro ao buscar hotéis no Infotravel");
  
  // Se for o GDS real, mapeamos os resultados de disponibilidade
  if (data?.hotelAvail) {
    return (data.hotelAvail as ApiHotelAvail[]).map(mapApiHotelToCanonical);
  }
  return data?.hotels || [];
}

export async function infotravelSearchFlights(
  agencyId: string,
  params: { origin: string; destination: string; date: string },
): Promise<Flight[]> {
  const { data, error } = await supabase.functions.invoke("infotravel-connector", {
    body: {
      action: "search_flights",
      agencyId,
      params,
    },
  });
  if (error) throw new Error(error.message || "Erro ao buscar voos no Infotravel");
  
  // Se for o GDS real, mapeamos as rotas aéreas
  if (data?.flightAvail) {
    return (data.flightAvail as ApiFlightAvail[]).map(mapApiFlightToCanonical);
  }
  return data?.flights || [];
}

export async function infotravelImportBooking(
  agencyId: string,
  bookingId: string,
): Promise<NormalizedBooking> {
  const { data, error } = await supabase.functions.invoke("infotravel-connector", {
    body: {
      action: "import_booking",
      agencyId,
      params: { bookingId },
    },
  });
  if (error) throw new Error(error.message || "Erro ao importar reserva do Infotravel");
  
  // Se for a reserva crua do GDS real (contém estruturas de hotéis ou voos da API), normalizamos
  if (data && (data.client || data.bookingHotels || data.bookingFlights)) {
    return mapApiBookingToNormalized(data as ApiBooking);
  }
  
  return data as NormalizedBooking; // O mock já retorna no formato NormalizedBooking
}

export async function infotravelTestConnection(agencyId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("infotravel-connector", {
      body: {
        action: "test_connection",
        agencyId,
      },
    });
    if (error) return false;
    return data?.success === true;
  } catch {
    return false;
  }
}
